---
title: "系统设计：Design Rate Limiter"
date: 2026-06-11
description: 从经典限流器题目切入，准备 token bucket、sliding window、Redis/Lua、分布式一致性，以及 abuse prevention 场景下的 enforcement key 选择。
draft: true
tags: [system-design, interview, learning, rate-limiter]
---

Rate Limiter 是最适合连接到风控和 abuse prevention 的经典系统设计题。它表面上是在限制请求频率，实际考的是：如何定义 quota，如何在分布式环境里原子地做 check-and-update，以及如何在准确性、延迟、成本之间取舍。

英文开场可以说：

> I would start by clarifying what we are limiting, such as requests per user, IP, device, account, or API key. Then I would choose a rate limiting algorithm, make the check-and-update path atomic, and extend it to a distributed setup with Redis or a centralized quota service.

## 面试主线

1. Clarify：限制对象是什么，限制窗口多长，超限后返回什么。
2. Algorithm：fixed window、sliding window log、sliding window counter、token bucket。
3. Single-node design：本地内存 map，按 key 存计数器或 bucket state。
4. Distributed design：Redis / centralized quota service，保证 check-and-update 原子性。
5. Scale and reliability：热点 key、Redis shard、local cache、降级策略。
6. Abuse follow-up：从普通 API key 扩展到 user ID、IP、device ID、advertiser account、campaign ID。

## Kafka 放在哪里

限流的实时 enforcement path 通常不能依赖 Kafka，因为 allow/deny 需要同步返回。Kafka 更适合放在旁路：

```text
Request -> API Gateway -> Rate Limit Check -> Backend Service
                         |
                         v
                    Kafka Events -> Analytics / Abuse Detection / Tuning
```

也就是说，Kafka 用来记录限流事件、分析 abuse pattern、调参和训练模型；真正的同步判断应该走 Redis、内存、或者 quota service。

## 后续要补

- Functional / non-functional requirements
- Token bucket 和 sliding window 的对比
- Redis Lua 原子更新流程
- 多 region 下的一致性取舍
- TikTok ads / actor integrity 场景怎么自然延伸
