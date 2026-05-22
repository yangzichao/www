---
title: "系统设计：LeetCode Online Judge"
date: 2026-05-22
description: LeetCode 判题系统的系统设计——沙箱执行、多语言支持、资源控制。
draft: false
tags: [system-design, interview, learning]
---

> 这篇笔记是边讨论边写的，会持续更新。

## 问题定义

设计 LeetCode 的判题后端：用户提交代码，系统编译、运行、对比测试用例，返回判题结果。

## Functional Requirements

- 有题目（problem）和对应的测试用例（本质上就是 unit test）
- 用户提交代码，系统执行并跑测试用例，返回判题结果（AC / WA / TLE / MLE / RE / CE）
- 支持多种编程语言

## Non-Functional Requirements

| 维度 | 优先级 | 备注 |
|------|--------|------|
| **Scalability** | 核心 | 流量不算大，但每个请求很重（编译+执行），是 CPU/内存密集型 |
| **Safety (沙箱)** | 重要 | 运行不可信代码必须隔离，但可以作为独立话题深入 |
| **Latency** | 不敏感 | 可以接受较高延迟，用户对"等几秒"有预期 |
| **Consistency (一致性)** | 不是问题 | 代码执行是确定性的（deterministic），不像 LLM 有随机性 |

---

## Capacity Estimation

跳过。每个提交是独立的，天然支持水平扩展（scale out），流量本身没有特别值得分析的地方。不像有 fan-out 或 hot-key 问题的系统。

## API Design

初始想法是一个 endpoint 搞定一切。调研后发现实际需要至少两个：

```
POST /submissions
{
  "problem_id": "...",
  "language": "python",
  "code": "<base64 encoded>"
}
→ 202 Accepted { "token": "abc-123" }

GET /submissions/{token}
→ 200 { "status": "Accepted", "time_ms": 42, "memory_kb": 15200 }
```

### 结果交付：Polling vs Long Polling vs WebSocket

提交是异步的——POST 立即返回 token，问题是客户端怎么拿到最终结果。

| 方案 | 模型 | 状态 | 扩展性 | 适合度 |
|------|------|------|--------|--------|
| **Short Polling** | Client-pull, 请求立即返回 | Stateless | 最佳 | **最适合** |
| Long Polling | Server-hold, 挂住连接等结果 | 连接有状态 | 受并发连接数限制 | 收益不大 |
| WebSocket | Full-duplex 持久连接 | Stateful | 需要 sticky session 或 pub/sub | 杀鸡用牛刀 |

**选择 Short Polling 的理由：**
- 不需要实时性，用户对等待几秒有预期
- WebSocket 引入状态，伤害水平扩展
- Long Polling 挂住连接，在 thread-per-connection 模型（传统 Java/Apache）下撑不了太多并发

**Long Polling 没那么可怕了，但仍不值得：**
- Java Virtual Threads（Project Loom）和 async I/O（Go、Node.js、Nginx）让挂住连接的成本大幅降低——idle 连接不占 CPU
- 但单机 max file descriptor 仍是硬限制（默认 ~65K），每个挂住的连接占一个 fd
- 综合来看 long polling 不再"可怕"，但对这个场景收益不大，short polling 更简单

**关键洞察：polling endpoint 可以做到极其廉价。**
Submission 结果是 immutable 的——一旦产生不会变。这是一个**设计选择**：让 worker 判完题后将结果写入 Redis/Valkey（Redis 的社区 fork，更好的并发处理），`GET /submissions/{token}` 只是一次 key-value lookup，不碰应用服务器。哪怕每秒 poll 一次成本也接近零，消除了 short polling "浪费请求"的缺点。

### 其他 API 细节

- **503 backpressure**：队列满时返回 503，给客户端明确的退避信号
- **Base64 编码**：源码可能含特殊字符，用 base64 传输更安全
- **`?fields=` 参数**：客户端选择只返回需要的字段，减少 payload

## Data Model

### 核心实体

三张表，复杂度递增：

**Problem** — 题目元数据，很小（几千行）

| 字段 | 说明 |
|------|------|
| problem_id | PK |
| title, difficulty | 基本信息 |
| time_limit_ms, memory_limit_kb | 判题约束 |
| description_url | 指向 S3 的完整题目描述 |

**TestCase** — 属于某个 problem，相对小（几万行）

| 字段 | 说明 |
|------|------|
| testcase_id | PK |
| problem_id | FK → Problem |
| input_url, expected_output_url | 指向 S3 |
| is_sample | 是否在题目页展示 |

**Submission** — 用户提交记录，**无限增长**（数亿行级别）

| 字段 | 说明 |
|------|------|
| submission_id | PK（BIGINT，自增） |
| user_id | 提交者 |
| problem_id | FK → Problem |
| language | 编程语言 |
| status | AC / WA / TLE / MLE / RE / CE |
| time_ms, memory_kb | 运行指标 |
| code_url | 指向 S3 的源码 |
| created_at | 提交时间（也是 partition key） |

### Metadata + Blob Separation

数据库只存元数据和指向 object storage（S3）的 URL。完整的题目描述、测试数据、用户源码这些 blob 存在 S3 里。原因：

- 避免大字段撑爆数据库行大小
- Blob 读取走 CDN/S3，不经过数据库
- 不同的数据有不同的生命周期和访问模式

### Submission 表的 Partitioning

Problem 和 TestCase 小到不需要优化。Submission 是 append-only 无限增长的，需要 partition。

**策略：Range Partition by `created_at`（按月）**

```sql
CREATE TABLE submissions (...) PARTITION BY RANGE (created_at);

CREATE TABLE submissions_2026_01 PARTITION OF submissions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**为什么按时间？**
- 最近的数据最热（用户几乎只查近期提交），自然匹配 access pattern
- PostgreSQL 的 **partition pruning** 会自动只扫描相关分区
- 老分区可以 `DETACH` 后归档到冷存储，释放空间

**索引策略（per-partition）：**
- `(submission_id, created_at)` — 唯一约束（跨分区的 unique index 必须包含 partition key）
- `(user_id, created_at DESC)` — 用户查自己的提交历史

**Partitioning vs Sharding：**

| | Partitioning | Sharding |
|---|---|---|
| 范围 | 单机内切表 | 跨多个数据库实例 |
| 适用规模 | ~5 亿–10 亿行 | 更大 |
| 复杂度 | 低（PostgreSQL 原生支持） | 高（需要路由层） |

对 Online Judge 来说，单机 partitioning 大概率够用。如果真到了 LeetCode 的体量（5 亿+ submissions），按 `user_id` shard 到多个实例，每个实例内部再按时间 partition。

### 缓存层

- **Redis/Valkey**：存 pending/running 状态的 submission 结果，供 polling endpoint 查询
- 判题完成后结果写入 Redis + 持久化到 PostgreSQL
- Redis 中的 key 有 TTL（比如 24h），过期后 fallback 到数据库

## High-Level Architecture

### 组件图

```
User
  ↓ POST /submissions
API Server
  ├─ 验证请求，返回 202 + token
  ├─ 写入 submission 记录（status: pending）
  └─ 入队
       ↓
  Message Queue (SQS / Kafka)
       ↓ worker pull
  Worker Pool
  ├─ 从 container pool 取一个 idle 容器
  ├─ 注入代码 + 测试用例
  ├─ 执行（cgroups 限制 CPU/内存，seccomp 过滤系统调用）
  ├─ 收集结果（AC / WA / TLE / MLE / RE / CE）
  └─ 写结果
       ├─→ Redis/Valkey 或 DynamoDB（供 polling 查询，TTL 24h）
       └─→ PostgreSQL（持久化）

User 每隔 1–2s 轮询：
GET /submissions/{token} → key-value lookup → 返回结果
```

### 各组件说明

**API Server**
- 无状态，水平扩展
- 职责：接收提交、入队、处理 polling 请求
- 队列满时返回 503（backpressure）

**Message Queue**
- 削峰填谷——流量尖峰时提交堆在队列里，worker 按自己节奏消费
- **SQS vs Kafka**：Online Judge 选 SQS 够用（每条消息只被消费一次）；Kafka 适合需要消息回放或多消费者的场景，对这里是 overengineering

**Worker Pool**
- CPU/内存密集型，独立部署，独立扩缩容
- 执行模型见下方 Deep Dive

**结果缓存（Redis/Valkey 或 DynamoDB）**
- Polling endpoint 的核心依赖——key-value lookup，个位数毫秒延迟
- Redis 的优势是内置 TTL；DynamoDB 也完全可以，高吞吐 KV 天生胜任
- 不需要两者都用，选一个

### Worker 执行模型：Pre-warmed Container Pool

用户代码不可信，必须在隔离的容器（container）里执行——代码在里面跑，出不来，碰不到外面的环境。

关键设计决策：**不是每次提交新建容器**（冷启动 500ms–1s 太慢），而是提前建好一批容器等待复用：

```
Worker 机器常驻容器：
  python-runner-1  (idle)   python-runner-2  (running)
  java-runner-1    (idle)   cpp-runner-1     (idle)
  ...
```

有任务进来 → 分配 idle 容器 → 执行代码 → 重置容器状态 → 归还池子

**面试里一句话**：「从预热的容器池取一个容器执行，执行完重置归还，保证隔离和性能。」

**底层原理（追问才展开）**：容器隔离依赖三个 Linux 原语——cgroups（限制 CPU/内存，TLE/MLE 的检测机制）、seccomp（过滤危险系统调用）、namespaces（隔离文件系统和网络）。

## Deep Dive

### 沙箱执行：要点汇总

**高层**（面试主动说）：
- 用户代码必须在容器里跑，隔离于宿主机
- Pre-warmed container pool，避免冷启动延迟
- 每次执行有 CPU 时间上限和内存上限，超限即 TLE / MLE

**中层**（被追问说）：
- 容器底层是三个 Linux 原语：cgroups（资源限制）、seccomp（syscall 过滤）、namespaces（环境隔离）
- 编译阶段也要设超时——C++ 模板元编程可以让编译器本身成为攻击目标

**细节**（背景知识）：
- IOI 官方的 `isolate` 工具是这三个原语的标准封装，Codeforces 等主流 OJ 在用
- Java JVM 冷启动 200–300ms，需要预热 JVM 避免误判 TLE

## Bottlenecks & Trade-offs

### 系统的核心瓶颈：Worker

API Server、Queue、Redis、PostgreSQL 都是轻量组件，随时可以水平扩展。**Worker 是唯一的重型瓶颈**——CPU/内存密集，container pool 占资源，扩容速度也比无状态服务慢。

### Worker 扩缩容策略

> 注意术语：**scale out / scale in** = 加减机器数量（水平）；**scale up / down** = 换更大/更小的机器（垂直）。Worker 的扩缩容指的是 scale out / in。

三个层次，逐步引入：

| 策略 | 原理 | 特点 |
|------|------|------|
| **Reactive scaling** | 队列深度超阈值就 scale out，降下来再 scale in | 简单，有滞后 |
| **Step scaling** | 积压小 → 加一倍 worker，积压大 → 加两倍 | 响应更快 |
| **Predictive scaling** | 根据历史模式提前扩容，不等积压 | 最佳体验，AWS 原生支持 |

**最佳 Scaling 指标**：**队列深度**（queue depth），而不是 CPU。队列积压直接反映 worker 是否够用，CPU 是间接信号。

### 公平性：Priority Queue + Rate Limiting

- **Per-user rate limiting**：防止单个用户狂提交占满 worker，拖慢所有人
- **Priority queuing**：付费用户进高优先队列，worker 优先消费——不同 SLA，不同队列
- **幂等性（Idempotency）**：用 `submission_id` 做去重，网络抖动导致重复提交时只处理一次，直接返回已有结果

### Language-specific Container Pools

每种语言单独的容器池，pool 大小按语言热度动态分配：
- Python / JavaScript：大 pool，常备多个 idle 容器
- 冷门语言（Haskell、Erlang）：小 pool 甚至为零，按需冷启动
- 好处：热门语言几乎零等待，冷门语言偶尔慢一点但不浪费资源

---

## 延伸设计

### Run Code vs Submit — 两条独立 Pipeline

LeetCode 有两个入口，设计上应该分开处理：

| | Run Code | Submit |
|---|---|---|
| 测试用例 | 只跑样例（2–3 个） | 全部测试用例（几百个） |
| 队列 | 独立轻量队列 | 独立重量队列 |
| 持久化 | 不写数据库 | 写 Submission 表 |
| Rate limit | 宽松（比如每分钟 20 次） | 严格（比如每分钟 5 次） |

**为什么要分开队列？** 互相隔离——用户狂按 Run Code 不会堵塞别人的正式提交，两类请求的 SLA 不同、资源消耗不同，独立扩缩容更合理。

### Fail-fast 执行策略

运行几百个测试用例时的核心决策：遇到第一个失败就停（fail-fast），还是跑完所有？

**选 fail-fast。** 理由：
- 节省 worker 资源——第 5 个用例 WA 就没必要再跑剩下 495 个
- 对用户更有用——直接给出具体的失败用例（input / actual output / expected output），可以立刻调试

Trade-off：用户不知道后面还有没有别的问题。但这个信息价值低，代价高，fail-fast 是合理的默认选择。

### Custom Checker（特殊判题器）

有些题目有多个合法答案（如"返回任意一个合法的拓扑排序"），不能用字符串直接对比。这类题需要一个 custom checker：一段程序接收 `(input, user_output, expected_output)`，判断用户输出是否合法。

关键点：**checker 是题目作者（LeetCode 工程师）写的，不是用户写的**，所以可以信任，不需要放进沙箱隔离。存在 S3 里，per-problem，worker 执行完用户代码后调用 checker 验证结果。

### 百分位排名 — Batch Precompute

"Your solution beats 87.3% of Python submissions" 这个数字的设计：

**关键洞察：不需要实时，差几个百分点用户不在乎。**

实现方式：
- 每天（或每周）跑一个 batch job，按 `(problem_id, language)` 统计 runtime 分布
- 预计算结果存入 `SubmissionStats` 表

```
SubmissionStats
  problem_id   | language | computed_at | p10_ms | p25_ms | p50_ms | p75_ms | p90_ms
  two-sum      | python   | 2026-05-19  | 32     | 45     | 58     | 89     | 142
```

- 用户 AC 后，用 runtime 查这张表，O(1) 返回百分位
- 不需要每次 AC 都扫描历史记录

面试里主动说这个的价值：识别出"精确 vs 够用"的权衡，说明你不会为了实时性付出不必要的代价。
