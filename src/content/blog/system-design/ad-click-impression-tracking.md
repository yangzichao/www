---
title: "系统设计：Design Ad Click and Impression Tracking"
date: 2026-06-11
description: 用广告曝光和点击追踪题准备事件采集、Kafka、去重、实时聚合、离线分析、计费、风控信号和数据延迟取舍。
draft: true
tags: [system-design, interview, learning, ads, kafka]
---

Ad Click / Impression Tracking 是广告系统里非常常见、也很贴 ads integrity 的系统设计题。它不是只问“怎么存点击”，而是在问：高吞吐事件如何可靠采集，如何去重，如何实时聚合，如何支持计费、报表和风控。

英文开场可以说：

> I would design this as an event tracking pipeline. The ad server or client emits impression and click events, an ingestion layer validates and buffers them, Kafka decouples producers from consumers, and downstream stream and batch jobs compute metrics for reporting, billing, and risk detection.

## 面试主线

1. Clarify：追踪 impression、click、conversion 还是全部广告事件。
2. Event schema：eventId、adId、campaignId、advertiserId、userId、timestamp、placement、requestId。
3. Ingestion：collector service 接收事件，做基础校验和采样。
4. Kafka：按 adId / campaignId / advertiserId 分区，支撑高吞吐和回放。
5. Stream processing：Flink / Spark Streaming 做实时聚合、去重、异常检测。
6. Storage：OLAP store 给 dashboard，warehouse 给离线分析，billing store 给计费。
7. Integrity follow-up：click spam、duplicate events、bot traffic、invalid impressions。

## Kafka 放在哪里

Kafka 是这道题的主干：

```text
Client / Ad Server
  -> Event Collector
  -> Kafka
  -> Stream Processing
  -> Realtime Metrics / Billing / Risk Signals
  -> Warehouse
```

Kafka 的价值是削峰、解耦、可回放、多消费者。计费、报表、风控、实验分析可以从同一条事件流派生不同视图。

## 后续要补

- Impression 和 click 的事件语义
- Event idempotency 和 dedup window
- Realtime aggregation vs offline correction
- Late event 和 out-of-order event 处理
- Fraud / abuse signal 怎么接到 risk engine
