---
title: "系统设计：LeetCode 竞赛系统"
date: 2026-05-22
description: LeetCode 竞赛系统的系统设计——实时排名、并发峰值、公平性。
draft: true
tags: [system-design, interview, learning]
---

> 这篇笔记是边讨论边写的，会持续更新。
> 依赖 [Online Judge](/blog/system-design/leetcode-online-judge/) 作为底层判题能力。

## 问题定义

设计 LeetCode 的竞赛系统：支持限时比赛，上千人同时提交，实时排名。

## Functional Requirements

- 创建竞赛，设定题目集合、开始/结束时间
- 竞赛期间接受提交，实时更新排名
- 排名规则：通过题数优先，罚时次之

## Non-Functional Requirements

- **突发流量**：比赛开始和结束前提交量暴增（尖峰流量）
- **实时性**：排行榜需要近实时更新
- **公平性**：判题延迟不能影响排名；同等条件下结果一致
- **规模**：支持数千到数万并发选手

---

_（下一步：高层架构设计）_
