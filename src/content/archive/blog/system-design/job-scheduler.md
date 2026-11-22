---
title: "系统设计：Design a Job Scheduler"
date: 2026-08-12
description: 从 Job 的触发方式、执行生命周期和依赖关系出发，判断哪些差异只是调度策略，哪些约束会真正改变 Job Scheduler 的 High-Level Architecture。
draft: false
tags: [system-design, interview, learning, scheduler, distributed-systems]
---

Job Scheduler 很容易被讲成一句话：

```text
时间到了，让 Worker 执行 Job。
```

这句话没有错，但 “Job Scheduler” 在不同语境里可能指完全不同的系统。真正开始设计之前，我们必须先认清题目：

> **面试官期待的是定时触发服务、工作流编排器，还是集群资源调度器？**

如果不先把题目收窄，我们很容易犯两个相反的错误：

1. 把 one-time、cron、delayed 和 retry 分别设计成四套重复的系统；
2. 把 workflow、长时间运行的任务和 GPU placement 也硬塞进一条简单的 delayed queue。

## 这道题默认设计什么

如果题目只有一句 “Design a Job Scheduler”，没有提到 DAG、GPU、Kubernetes 或 ETL，通常期待的是：

> **设计一个分布式的 time-based Job Scheduler：可靠保存一次性和周期性计划，并在预定时间把 Execution 至少一次地交给 Worker。**

从产品功能看，它支持 One-time 与 Recurring/Cron；从内部组件边界看，却有两种合理方案：

```text
Integrated
Job Scheduler 自己保存 Cron rule，并生成每次 Execution

Composable
底层只调度一次 Execution；Cron Service 负责把 recurrence 展开成单次 Execution
```

本文选择第二种，先把最难复用的可靠性问题收敛成一个基础组件：

> **One-time Job Scheduler 只负责在 `execute_at` 到达时，可靠地把一次 Execution 交给 Worker。**

Cron Service、Retry coordinator，甚至 DAG Orchestrator，都可以通过同一个 Client SDK 使用它：

```text
Direct Client ───────────────┐
Cron Service ── Client SDK ──┼──> One-time Job Scheduler ──> Worker
DAG Orchestrator ────────────┘
```

这里的 Cron Service 必须是 durable service，不能只有一个进程内 library。Client SDK 只负责调用与重试；Cron rule、timezone、misfire 和 overlap policy 必须在服务端持久保存。

## Requirements

### Functional Requirements

- Client 可以提交一次 Execution，并指定 `execute_at`；
- Client 可以用 `execution_id` 查看状态与结果引用；
- Client 可以取消尚未开始的 Execution；
- 到期的 Execution 会被交给 Worker；
- Cron Service 可以创建、更新、暂停和取消 Cron rule，并通过 Client SDK 生成单次 Execution。

### Non-functional Requirements

- 已确认的 Execution 不能静默丢失；
- 正常情况下达到秒级调度精度；
- 使用 at-least-once delivery，允许重复投递；
- 相同 `idempotency_key` 的重复提交只创建一个 Execution；
- Scheduler 节点故障后可以恢复，并能水平扩展到到期流量峰值。

`idempotency_key` 只解决重复提交；at-least-once delivery 仍可能把同一个 Execution 多次交给 Worker，Worker 必须用 `execution_id` 单独保证副作用幂等。因此系统提供的是 at-least-once，而不是 exactly-once；它提供实现幂等所需的稳定标识，但不能自动保证所有外部副作用幂等。

### Out of Scope

```text
- DAG dependencies
- large batch fan-out / fan-in
- GPU or topology-aware placement
- checkpoint-based recovery for multi-hour jobs
```

这些系统以后可以使用底层 one-time component，但不属于当前实现。

可以用一句话和面试官确认：

> “I’ll expose one-time and recurring scheduling, but make reliable one-time execution the core primitive. A durable Cron Service will materialize each occurrence through the same client used by direct callers. DAG dependencies and resource placement stay out of scope.”

确认 scope 以后，再用三个问题检查后续约束有没有把题目推向另一类系统：

```text
Trigger:   Job 为什么在现在变成 ready？
Execution: Job 运行多久，失败后怎样恢复？
Placement: Job 可以被任意 Worker 执行吗？
```

这三个问题决定 High-Level Architecture 的形状，但它们不是三种并列的 Job 类型。

## API：核心只接受一次 Execution

```http
POST /executions
Idempotency-Key: cron-42:2026-08-13T02:00:00Z

{
  "definitionUri": "registry://jobs/generate-report",
  "definitionVersion": 3,
  "inputs": {
    "datasetUri": "s3://datasets/orders",
    "reportDate": "2026-08-12"
  },
  "executeAt": "2026-08-13T02:00:00Z"
}
```

```http
GET /executions/{executionId}
DELETE /executions/{executionId}
```

`POST` 提交单次执行，`GET` 查看状态与输出引用，`DELETE` 只取消尚未开始的执行。Cron Service 也调用同一个 `POST`；它用 `cron_job_id + occurrence_time` 生成稳定的 idempotency key，避免重试时重复创建。

## Data Model：Definition File 与 Execution

Scheduler 不应该把可执行代码或某一种 runtime 写死在自己的数据库里。更干净的边界是：执行平台提供一份版本化的 **Job Definition File**，Scheduler 只引用它。

Definition File 可以使用 YAML、JSON 或 XML。它声明输入、输出与执行方式，例如：

```yaml
name: generate-report
version: 3

inputs:
  dataset_uri: string
  report_date: date

outputs:
  report_uri: string

execution:
  type: container
  image: report-generator:v3
  command: ["generate"]
```

Scheduler 不需要理解 `execution` 里的具体实现。它只校验 Definition File 存在、输入符合声明，并保存一次 Execution：

```text
Execution
- execution_id
- definition_uri
- definition_version
- input_snapshot
- execute_at
- idempotency_key
- status
- output_reference
```

Definition File 回答“这是什么任务、需要什么输入、产生什么输出”；Execution 回答“使用哪个版本和输入、在什么时候运行，以及结果在哪里”。创建 Execution 时必须固定 Definition 版本并保存输入快照，保证后续重试可复现。

Cron Service 自己保存另一份很小的模型：

```text
Cron Job
- cron_job_id
- definition_uri + version
- input_values
- cron_expression + timezone
- next_run_at
- status
```

到达 `next_run_at` 后，Cron Service 通过 Client SDK 创建 Execution，再计算下一次时间。核心 Scheduler 不需要保存或解释 Cron expression。

关系是：

```text
Job Definition File 1 ── N Execution
Cron Job 1 ── materializes ── N Execution
```

## Time-based Schedule 怎样落到底层 Primitive

外部产品仍然可以提供常见的时间能力，但它们最终都产生一次 `execute_at`：

### One-time 与 Delayed

One-time 直接提交绝对时间；Delayed 只是 Client SDK 的便捷写法：

```text
One-time: execute_at = 2026-08-13 15:00
Delayed:  execute_at = now + 30 minutes
```

### Recurring / Cron

Cron Service 计算 occurrence，并逐次提交：

```text
Cron rule: 0 2 * * *
Occurrence: 2026-08-13 02:00
POST /executions execute_at=2026-08-13T02:00:00Z
```

### Retry

Retry 不是新的 Execution。失败后，同一个 Execution 可以在 backoff 时间到达时产生下一个 Attempt。瞬时错误通常采用 capped exponential backoff，并加入 jitter，避免大量失败任务在同一时刻形成 retry storm：

```text
attempt 1 failed
maximum_delay = min(max_delay, base_delay * 2^(attempt_number - 1))
retry_delay   = random(0, maximum_delay)  // full jitter
next_attempt_at = now + retry_delay
```

Retry 可以在内部复用相同的 durable timer 能力，但不能用 `POST /executions` 创建一个失去关联的新 Execution。只有可重试错误才进入 `RETRY_WAIT`；超过最大次数或遇到永久错误后，Execution 进入 `FAILED`。如果采用 Queue，可以把需要人工处理的消息送入 dead-letter queue；否则保留失败记录并提供 replay API 即可。

Cron 仍需明确：

- 使用哪个时区；
- 夏令时切换时运行零次、一次还是两次；
- Scheduler 停机期间错过的运行是否补跑；
- 上一次还没有结束时，下一次是并行、跳过、排队还是替换；
- 暂停后恢复时，是否追赶所有 missed executions。

这些策略留在 Cron Service。底层 primitive 只接收已经确定的 `execute_at`。

## 为什么不总是这样拆

可组合方案的优点是职责单一，Cron、Retry 和 DAG 可以复用同一套持久化、计时、幂等与投递能力；底层也不必理解 Cron 或 dependency。

代价是多了一条跨服务边界：Cron Service 更新自身状态与提交 Execution 不是天然的单事务，取消和可观测性也需要跨服务串联。Cron Service 必须持久化自己的 rule，并使用稳定 idempotency key 重试提交。

如果系统很小、只有 Cron 一个调用方，集成式设计更简单；当可靠 timer 被多个上层服务复用时，拆出 one-time primitive 才真正值得。

## Scheduler 怎样从 Execution Store 找到到期任务

第一版不需要真正拆分数据库表。PostgreSQL 中最简单的做法，是给尚未触发的 Execution 建立一个按时间排序的 partial index：

```sql
CREATE INDEX scheduled_executions_due_idx
ON executions (execute_at)
WHERE status = 'SCHEDULED';
```

Scheduler 使用这个索引读取 `execute_at <= now()` 的少量记录，并通过 `FOR UPDATE SKIP LOCKED` 或等价的 lease 机制竞争领取。这样是查询索引，不是周期性扫描整张表；轮询间隔也可以根据最近一条 `execute_at` 动态调整。

当 future jobs 达到 millions 或 billions 时，再增加一个内部字段 `bucket_start`，例如把 `execute_at` 向下取整到分钟：

```sql
CREATE INDEX scheduled_executions_bucket_idx
ON executions (bucket_start, execute_at)
WHERE status = 'SCHEDULED';
```

这就是本文所说的 **time bucket**：它是普通字段与索引组成的逻辑分桶，不是特殊 Queue，也不是为每一分钟创建一张表。Scheduler shards 可以按 bucket 或 `bucket + hash shard` 分工，只检查当前及尚未处理的过期 bucket；真正到秒级触发前，仍用 `execute_at` 做最后判断。`bucket_start` 最好在写入时计算，作为内部检索字段，不改变外部 API。

PostgreSQL 也原生支持 `PARTITION BY RANGE (execute_at)` 的物理时间分区，但这是另一层优化。只有当表已经很大，并且需要按天或按月快速归档、删除或维护索引时才使用；分区需要提前创建和轮换，重新调度还可能让记录跨分区移动。合理的组合通常是：**按天/月做粗粒度物理分区，在分区内部继续使用分钟级逻辑 time-bucket index**，而不是建立海量分钟分区。

### 行锁不会成为瓶颈吗

`FOR UPDATE SKIP LOCKED` 适合第一阶段，因为锁只覆盖一个有上限的小 batch，并在 `SCHEDULED -> READY` 提交后立即释放；任务执行期间绝不能继续持有数据库锁。但当大量 Scheduler 同时从同一段 `execute_at` index 领取任务时，索引头部仍会成为 hot spot。

规模上来后，可以预先定义固定数量的逻辑 shards：

```text
bucket_start = floor(execute_at / 1 minute)
shard_id     = hash(execution_id) mod 1024
logical partition = (bucket_start, shard_id)
```

任务写入后，其 `shard_id` 保持稳定。Scheduler 实例不再同时竞争所有到期记录，而是通过带过期时间的 ownership lease 领取一组逻辑 shards，只扫描自己负责的 `(bucket_start, shard_id)`。它可以把这些 shard 中未来几十秒的任务加载进内存 priority queue 或 timing wheel，到期后再批量转成 `READY`。实例故障时 lease 过期，其他实例接管；数据库仍是 durable source of truth。

这与 consistent hashing 的目标相似，都是分散负载，但这里通常不需要直接使用 consistent hash。更简单的做法是让任务固定映射到大量逻辑 shard，再让数量不断变化的 Scheduler 实例动态租赁这些 shard。Scheduler 从 10 台扩到 20 台时，只重新分配 lease，任务不需要重新计算 shard 或移动数据。只有当任务必须直接映射到物理节点，并且希望节点变化时尽量少迁移数据，consistent hashing 才更合适。

因此扩展路径是：**小规模用索引与短事务行锁；中大规模用固定逻辑 shard 与 ownership lease 消除热点；Worker backlog 明显时再用 Queue 隔离调度与执行。**

## Worker Pull 还是 Scheduler Push

这里有两种有效模型。“Worker 领取任务”指 **Pull**：没有谁主动给 Worker 发任务。Scheduler 只把到期 Execution 改成 `READY`；空闲 Worker 查询 READY records，并通过原子 compare-and-set 或 lease claim 其中一个。

```text
Pull
Scheduler -> mark READY in Execution Store
Worker -> poll -> claim lease -> run
```

Pull 不需要 Scheduler 维护 Worker registry、心跳、容量和连接状态；Worker 也会自然地按自身处理速度领取工作。它适合本文默认的独立、短时、同质任务，代价是 polling latency、空轮询以及多个 Worker 对 Execution Store 的竞争。

**Push** 则由 Scheduler 选择 Worker，再通过 RPC 主动派发：

```text
Push
Scheduler -> choose Worker -> assign lease -> RPC dispatch
```

Push 可以更快地响应，并能显式考虑 locality、资源、priority 或 sticky placement；但 Scheduler 必须掌握 Worker membership、health 和 capacity，还要处理“assignment 已提交但 RPC 响应丢失”这种不确定状态。Tie-breaker 很直接：**同质 Worker + 普通秒级任务选 Pull；需要资源匹配、数据本地性或极低 dispatch latency 时才选 Push。**

## Execution 与 Attempt 状态机

Execution 表示用户提交的那次任务，Attempt 表示 Worker 的一次实际执行。两者必须分开：Worker 崩溃后可以产生新的 Attempt，但不能因此创建一个新的业务 Execution。

```text
Execution:
SCHEDULED -> READY -> RUNNING -> SUCCEEDED
                         |  \
                         |   -> RETRY_WAIT -> READY
                         -> FAILED

SCHEDULED / READY / RETRY_WAIT -> CANCELLED

Attempt:
RUNNING -> SUCCEEDED | FAILED | TIMED_OUT | ABANDONED
```

Scheduler 只负责 `SCHEDULED -> READY`。Worker 领取时，在一个短事务中创建 Attempt、写入 `lease_owner`、`lease_expires_at` 和单调递增的 `fencing_token`，并把 Execution 改为 `RUNNING`。成功时只有当前 token 对应的 Worker 能提交结果；可重试失败进入 `RETRY_WAIT`，到达 `next_attempt_at` 后重新变成 `READY`；超过次数或遇到不可重试错误才进入 `FAILED`。这些条件状态更新既是并发控制，也是 at-least-once 下防止旧 Worker 覆盖新结果的边界。

## Failover：组件崩溃后怎样恢复

**Scheduler 崩溃：** Execution 一直保存在数据库中，内存 priority queue 只是缓存。Scheduler 定期续租自己负责的 logical shards；实例消失后 lease 到期，其他 Scheduler 接管，并从持久化 watermark 之前稍早的位置重扫到期 bucket。尚未转成 `READY` 的任务会被重新发现；已经转成 `READY` 的任务不再依赖原 Scheduler。

**Worker 崩溃：** Worker 执行期间续租 Attempt。心跳停止后，reaper 将过期 Attempt 标记为 `TIMED_OUT` 或 `ABANDONED`，再根据 retry policy 把 Execution 放回 `READY`。原 Worker 如果只是网络隔离后恢复，它持有的旧 fencing token 已失效，不能提交结果。外部副作用仍可能发生两次，因此 handler 还必须使用 `execution_id` 或业务 idempotency key 保证幂等。

**数据库崩溃：** Scheduler 与 Worker 的领取、状态转换都只访问当前 primary，read replica 只能用于非关键查询。主库故障时，未提交事务自动回滚；提交结果是否会在新 primary 上保留，取决于复制方式。若任务不能丢，应使用同步复制或有共识保证的高可用数据库，并接受写入延迟；异步 replica 会带来非零 RPO。客户端还要把超时视为“提交结果未知”，用 idempotency key 和条件状态更新安全重试，而不能直接假定事务失败。

因此系统的基本保证是 **durable state + expiring lease + fencing token + idempotent retry**。Failover 可能造成延迟或重复执行，但不应造成任务永久丢失；这里提供的是 at-least-once，而不是不切实际的 exactly-once。

## Queue 是可选组件，不是默认答案

第一版不需要独立 Message Queue。Execution Store 可以同时承担 durable scheduling state 与 ready-work handoff：

```text
Execution API -> Execution Store
                       ↑
Scheduler: 到期后原子地把 SCHEDULED 改成 READY
Worker:    用 lease 原子领取 READY Execution
```

这样组件更少，也避免了“数据库已更新，但 Queue 写入失败”的双写问题。代价是 Worker polling 和领取竞争会给 Execution Store 增加压力。

当到期流量尖峰、Worker backpressure 或数据库轮询压力成为真实瓶颈时，可以加入 Queue：

```text
Scheduler -> Ready Queue -> Worker
```

这是 Hybrid：Scheduler 把任务 push 给 Queue，Worker 再从 Queue pull。Queue 负责缓冲与分发，Execution Store 仍是状态真相；数据库状态与 Queue 消息之间需要 Outbox 或等价的可恢复投递机制。因此 Queue 是有成本的扩展，不是架构图里的默认装饰。

## 不要混进主分类的相邻系统

下面这些概念经常也带有 “Scheduler” 或 “Job” 字样，但不应该和 One-time、Cron、Delayed、Retry 放在同一个分类表里。它们是相邻的系统边界，不是四种新的时间策略。

### Event-driven Task Platform

例如：

```text
订单完成 -> 生成发票
用户上传视频 -> 开始转码
Git push -> 运行 CI
```

这里没有预先存在的 `next_run_at`。Execution 由业务事件产生，因此系统需要另一条 trigger path：

```text
Event Bus -> Event Consumer -> Execution Store -> Ready Queue
```

Event Consumer 需要处理重复事件、乱序和事件与业务数据库的一致性。它可以复用后面的 Execution Store、Ready Queue 和 Worker，但已经不是 time-based Scheduler 的一种 schedule type。

### Workflow Orchestrator

例如：

```text
下载文件 A
   ↓
解析数据 B ──┬──> 更新数据库 C
             └──> 生成报告 D
                       ↓
                    发送邮件 E
```

任务 B 不是因为“时间到了”而 ready，而是因为 A 已经成功。任务 E 则需要等待 D。

这会引入新的闭环：

```text
Worker completes task
        │
        ▼
Workflow state update
        │
        ▼
Dependency evaluation
        │
        ▼
new downstream tasks become READY
```

系统需要 DAG、Workflow Run、Task Run、dependency resolution 和 completion event。它属于另一道更大的题：Workflow Orchestrator。

### Long-running Execution 是执行约束，不是 Scheduler 类型

运行 200ms 的任务失败后，可以整体重试。运行 6 小时的视频处理或数据导入如果也从头重试，代价可能无法接受。

长任务需要：

```text
Worker heartbeat
Lease renewal
Progress reporting
Checkpoint storage
Cancellation signal
Lost-worker recovery
```

因此 Worker 不再只是“拿到消息，执行，然后 ack”。Worker 与控制面之间会形成持续状态协议。它会扩展默认设计，但 “long-running” 本身不是与 Cron 并列的一种 Scheduler。

### Batch Processing Engine

如果一个 Job 需要处理 10 亿条记录，通常不能只交给一个 Worker：

```text
Logical Job
    │
    ▼
Splitter
    ├── Partition 1 -> Worker
    ├── Partition 2 -> Worker
    ├── ...
    └── Partition N -> Worker
                         │
                         ▼
                     Aggregator
```

系统需要追踪 partitions、限制 fan-out 并发、处理部分失败，并在所有必要分片完成后执行 fan-in。

如果 Batch 只是“一条 SQL 生成日报”，它仍可以作为普通 Job 执行。只有当拆分、并行和汇总成为平台责任时，题目才转向 Batch Processing Engine。

### Cluster / Resource Scheduler

如果所有 Worker 完全同质，任意 Worker 都可以从 Queue 领取任务。

但下面这些任务不能随便领取：

```text
video-transcode:  8 CPU, region=us-west
model-training:   8 × A100 GPU, high-bandwidth network
data-import:      128 GB memory
compliance-job:   region=eu
```

系统需要知道 Job requirements 和可用 capacity，并进行 placement：

```text
Ready Execution
      │ requirements
      ▼
Resource Scheduler
      │ placement
      ▼
Specialized Worker Pool
```

此时 Scheduler 主要回答“在哪里运行”，而 time-based Job Scheduler 主要回答“什么时候可以进入 ready”。两者可能在生产平台里连接起来，但面试中不应默认混成一道题。

可以把这几个边界记成一张小表：

| 系统 | 它主要回答的问题 | 默认 Job Scheduler 是否包含 |
|---|---|---|
| Time-based Job Scheduler | 什么时候生成一次 Execution？ | 是，本文主问题 |
| Event-driven Task Platform | 哪个业务事件触发 Execution？ | 否，扩展 trigger path |
| Workflow Orchestrator | 哪些依赖满足后 Task 才 ready？ | 否，另一道题 |
| Batch Processing Engine | 如何拆分、并行和汇总大量工作？ | 否，另一道题 |
| Cluster / Resource Scheduler | Execution 应该放在哪台机器？ | 否，另一道题 |

这张表分类的是**系统责任**。One-time、Cron、Delayed 和 Retry 描述的是**产品层的时间语义**。两者不要混在一个层级里。

## 一个容易漏掉的例外：类型没变，规模也会改变架构

假设系统只有最普通的 Delayed Job，但存在：

```text
500 million future jobs
100,000 jobs due per second
sub-second scheduling precision
```

Execution 语义仍然没有变化，但单个数据库的 `execute_at` index 和一个轮询 Scheduler 已经可能成为瓶颈。系统可能需要：

- 按稳定 key 或时间范围分片；
- 按分钟或秒建立时间桶；
- 只把近期任务加载进内存；
- 对近期窗口使用 timing wheel；
- 独立扩展 Scheduler shards；如果引入 Queue，再扩展 Queue partitions。

所以最终判断不是：

```text
“它叫 Delayed Job，所以架构不变。”
```

而是：

```text
“它没有引入新的执行语义；但 scale 与 precision 是否已经击穿当前时间索引？”
```

## 面试中应该怎样收束 Scope

如果题目只说 “Design a Job Scheduler”，不要立刻把 Workflow、GPU placement 和大规模 Batch 全画进去。先问：

1. 默认是否是 time-based Scheduler？是否还需要 event trigger？
2. Job 彼此独立，还是存在 dependency / DAG？
3. 一般运行多久？失败后整体重试是否可以接受？
4. 一个 Job 是否会拆成大量并行子任务？
5. Worker 是否同质，还是需要 CPU、GPU、内存、region placement？
6. 有多少待执行 Executions？峰值每秒有多少 Execution 到期？
7. 调度精度是分钟、秒还是亚秒？
8. 允许重复执行吗？允许丢失吗？

如果面试官给出的边界是：

```text
- one-time + cron + delayed + retry
- jobs are independent
- jobs usually finish within 30 seconds
- homogeneous workers
- second-level precision
- at-least-once execution is acceptable
```

那么第一版可以收敛为：

```mermaid
flowchart LR
    Client[Direct Client] --> SDK[Client SDK]
    Cron[Cron Service] --> SDK
    DAG[DAG Orchestrator<br/>optional extension] -.-> SDK

    SDK --> API[Execution API]
    API --> Store[(Execution Store)]
    Scheduler[Scheduler] <-->|scan due / mark READY| Store
    Worker[Worker] <-->|claim READY / update result| Store
    Worker --> Definitions[Job Definition Store]
```

而不是一开始就引入 DAG Engine、Checkpoint Store、GPU Scheduler 和 Timing Wheel。

这一阶段最重要的结论是：

> **产品可以提供 One-time 与 Recurring/Cron，但底层最小可复用组件只调度一次 Execution。Delayed 由 Client 换算为 `execute_at`，Cron Service 逐次 materialize occurrences，Retry 则属于同一 Execution 的后续 Attempt。**

至此，核心设计已经覆盖 API、Data Model、Execution / Attempt 状态机、Scheduler 分片、Worker 领取、at-least-once、幂等重试与 failover。后续扩展应由明确需求驱动，例如 priority、公平性、backpressure、容量估算与可观测性，而不是继续向核心路径堆组件。
