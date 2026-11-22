---
title: "系统设计：Design Logging, Metrics, and Analytics System"
date: 2026-06-11
description: 从通用日志和指标系统切入，准备高吞吐采集、Kafka、流批处理、OLAP 查询、告警，以及把事件管道扩展成风控 feature pipeline。
draft: true
tags: [system-design, interview, learning, logging, analytics, kafka]
---

Logging / Metrics / Analytics 是很常见的系统设计题，也非常适合连接到 risk control 里的 feature pipeline。它的核心不是“把日志写进数据库”，而是设计一条高吞吐、低成本、可查询、可告警、可回放的数据管道。

英文开场可以说：

> I would design this as a telemetry pipeline. Services emit logs and metrics to local agents or SDKs, an ingestion layer batches and validates the data, Kafka buffers the stream, and downstream consumers compute real-time alerts, dashboards, and offline analytics.

## 面试主线

1. Clarify：日志、metrics、traces、business events 分别要不要支持。
2. Agent / SDK：本地 buffer、batch、retry、sampling，避免影响主业务路径。
3. Ingestion：接收、认证、限流、schema validation。
4. Kafka：作为中心事件总线，支撑回放和多消费者。
5. Stream processing：实时聚合、alert evaluation、异常检测。
6. Storage：hot store 查最近数据，cold store 存长期数据，OLAP 支撑分析。
7. Query / alert：dashboard、ad hoc query、告警规则、on-call 通知。
8. Risk follow-up：把 business events 转成 real-time features，供 abuse detection 使用。

## Kafka 放在哪里

Kafka 是 ingestion 和 processing 之间的缓冲层：

```text
Services / SDKs / Agents
  -> Ingestion Service
  -> Kafka
  -> Stream Processing
  -> Hot Store / Alerting / Feature Store
  -> Data Lake / Warehouse
```

它解决的是生产者和消费者速率不一致、消费者故障重放、多下游独立消费的问题。真正的查询不直接打 Kafka，而是打 OLAP、time-series store 或 search index。

## 后续要补

- Logs、metrics、traces 的区别
- Sampling、backpressure、data loss policy
- Hot / warm / cold storage 分层
- Alerting 的准确性和噪音控制
- 从 analytics pipeline 延伸到 risk feature platform
