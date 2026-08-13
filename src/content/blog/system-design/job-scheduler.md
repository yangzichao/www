---
title: "系统设计：Design a Job Scheduler"
date: 2026-08-12
description: 从 Job 的触发方式、执行生命周期和依赖关系出发，判断哪些差异只是调度策略，哪些约束会真正改变 Job Scheduler 的 High-Level Architecture。
draft: false
tags: [system-design, interview, learning, scheduler, distributed-systems]
---

Job Scheduler 很容易被讲成一句话：

```text
时间到了，把 Job 放进 Queue，让 Worker 执行。
```

这句话没有错，但 “Job Scheduler” 在不同语境里可能指完全不同的系统。真正开始设计之前，我们必须先认清题目：

> **面试官期待的是定时触发服务、工作流编排器，还是集群资源调度器？**

如果不先把题目收窄，我们很容易犯两个相反的错误：

1. 把 one-time、cron、delayed 和 retry 分别设计成四套重复的系统；
2. 把 workflow、长时间运行的任务和 GPU placement 也硬塞进一条简单的 delayed queue。

## 这道题默认设计什么

如果题目只有一句 “Design a Job Scheduler”，没有提到 DAG、GPU、Kubernetes 或 ETL，通常期待的是：

> **设计一个分布式的 time-based Job Scheduler：可靠保存一次性和周期性计划，在预定时间生成 Execution，再通过 Queue 至少一次地交给 Worker。**

默认 scope 可以明确为：

```text
In scope
- one-time schedule
- recurring / cron schedule
- pause, resume, update, cancel
- execution history
- retry with backoff
- at-least-once dispatch
- independent, short-running jobs
- homogeneous workers

Out of scope
- DAG dependencies
- large batch fan-out / fan-in
- GPU or topology-aware placement
- checkpoint-based recovery for multi-hour jobs
```

这种收束不是假装其他 Scheduler 不存在，而是在有限面试时间里选择大家最常期待的主问题。

可以用一句话和面试官确认：

> “I’ll assume we are designing a distributed time-based scheduler for independent, short-running jobs. It supports one-time and recurring schedules, retries failed executions, and dispatches at least once to homogeneous workers. I’ll treat DAG dependencies and resource-aware placement as extensions.”

确认 scope 以后，再用三个问题检查后续约束有没有把题目推向另一类系统：

```text
Trigger:   Job 为什么在现在变成 ready？
Execution: Job 运行多久，失败后怎样恢复？
Placement: Job 可以被任意 Worker 执行吗？
```

这三个问题决定 High-Level Architecture 的形状，但它们不是三种并列的 Job 类型。

## 先区分 Job Definition 与 Job Execution

假设我们创建一个任务：每天凌晨 2 点生成账单。

“每天凌晨 2 点生成账单”是一份长期存在的 **Job Definition**。它描述：

```text
job_type = GENERATE_BILL
schedule = "0 2 * * *"
timezone = America/Los_Angeles
retry_policy = exponential_backoff
```

但是 8 月 12 日凌晨 2 点的运行和 8 月 13 日凌晨 2 点的运行，是两次不同的 **Job Execution**：

```text
Execution A
scheduled_at = 2026-08-12 02:00
attempt = 1
status = SUCCEEDED

Execution B
scheduled_at = 2026-08-13 02:00
attempt = 1
status = RUNNING
```

这个区分非常重要：

- Definition 回答“以后还要不要运行”；
- Execution 回答“这一次运行到了哪一步”；
- Retry 通常属于某次 Execution 的新 attempt，而不是一份毫无关联的新 Job；
- 暂停 Cron Job 不应该抹掉过去的执行历史；
- 取消未来计划和取消正在运行的 attempt 是两个不同操作。

所以在后面的讨论中，`Job` 如果指长期规则，我们会明确称为 Definition；如果指某一次实际运行，我们称为 Execution。

## 主范围内的常见 Job 怎样归类

不要把所有常见名词都当成并列类别。对于默认的 time-based Scheduler，更清楚的归类只有两层。

### 用户创建的 Schedule：One-time 与 Recurring

#### One-time Job

只在指定时间运行一次：

```text
2026-08-13 15:00 发送预约提醒
```

#### Delayed Job

Delayed Job 通常不需要成为第三种顶层 Definition。它只是用相对时间创建的 One-time Job：

相对于某个业务动作，延迟一段时间运行：

```text
订单创建 30 分钟后检查是否付款
```

创建任务时把相对时间换算成绝对时间即可：

```text
next_run_at = created_at + 30 minutes
```

#### Recurring / Cron Job

按照周期重复运行：

```text
每天凌晨生成报表
每周一发送周报
每 5 分钟同步数据
```

每次触发以后，根据 recurrence rule 计算新的 `next_run_at`。

### 系统产生的后续 Attempt：Retry

某次 Execution 失败以后再次尝试：

```text
attempt 1 failed
next_run_at = now + backoff(attempt 2)
```

所以更准确的概念关系是：

```text
Job Definition
├── One-time schedule
│   └── Delayed job = now + delay
└── Recurring schedule
    └── Cron / fixed interval

Job Execution
└── Attempt 1
    └── Retry = Attempt 2 scheduled with backoff
```

它们在概念层级上并不完全并列，但从 Time Scheduler 的角度，都可以归一成同一个问题：

> **当 `next_run_at <= now` 时，创建或推进一次 Execution，使它进入 ready 状态。**

因此，它们可以共享同一条主路径：

```text
Job API
   │
   ▼
Schedule Store
   │  next_run_at <= now
   ▼
Time Scheduler
   │  create Execution
   ▼
Ready Queue
   │
   ▼
Workers
```

它们的不同主要留在策略和数据中：

| 概念 | 系统里的含义 |
|---|---|
| One-time | 一份只产生一次预定 Execution 的 Definition |
| Delayed | 使用 `now + delay` 创建的 One-time schedule |
| Recurring / Cron | 一份会持续计算下一个 occurrence 的 Definition |
| Retry | 同一 Execution 的后续 attempt，由 backoff 决定时间 |

因此，面试中不应该看到四个名词，就立即画四个 Scheduler。

### Cron 仍然有额外语义

共享架构不代表完全没有差异。Cron 至少需要明确：

- 使用哪个时区；
- 夏令时切换时运行零次、一次还是两次；
- Scheduler 停机期间错过的运行是否补跑；
- 上一次还没有结束时，下一次是并行、跳过、排队还是替换；
- 暂停后恢复时，是否追赶所有 missed executions。

这些问题会扩展 Definition 和 Execution 的状态机，但通常还没有改变系统的主要组件。

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

这张表分类的是**系统责任**。One-time、Cron、Delayed 和 Retry 分类的是**主系统内部的时间语义**。两者不要混在一个层级里。

## 一个容易漏掉的例外：类型没变，规模也会改变架构

假设系统只有最普通的 Delayed Job，但存在：

```text
500 million future jobs
100,000 jobs due per second
sub-second scheduling precision
```

Job 语义仍然没有变化，但单个数据库的 `next_run_at` index 和一个轮询 Scheduler 已经可能成为瓶颈。系统可能需要：

- 按稳定 key 或时间范围分片；
- 按分钟或秒建立时间桶；
- 只把近期任务加载进内存；
- 对近期窗口使用 timing wheel；
- 独立扩展 Scheduler shards 和 Queue partitions。

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
6. 有多少 active schedules？峰值每秒有多少 Job 到期？
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

那么第一版就应该克制地收敛为：

```text
Job API -> Schedule Store -> Time Scheduler
        -> Execution Store -> Ready Queue -> Workers
```

而不是一开始就引入 DAG Engine、Checkpoint Store、GPU Scheduler 和 Timing Wheel。

这一阶段最重要的结论是：

> **本文的主问题是 time-based Job Scheduler。One-time 与 Recurring 是 Definition 类型，Delayed 是 One-time 的创建方式，Retry 是 Execution 的后续 Attempt。Event、Workflow、Batch 和 Resource Scheduling 属于相邻系统边界；Long-running、规模与精度则是可能扩展主架构的约束。**

下一步再基于明确的第一版 scope，设计 API、Job Definition、Execution 状态机，以及 Scheduler 怎样可靠地领取到期任务。
