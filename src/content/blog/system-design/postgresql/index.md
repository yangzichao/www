---
title: "PostgreSQL 深入研究：总览"
date: 2026-05-22
description: 系统性研究 PostgreSQL 内部机制、性能调优和常见陷阱的笔记汇总。
draft: true
tags: [postgresql, database, internals]
---

这个系列专门研究 PostgreSQL——不只是"怎么用"，而是"为什么这样设计"以及"踩坑后怎么排查"。

## 研究方向

- **存储引擎 & MVCC** —— 行可见性、vacuum、dead tuples
- **查询规划器** —— 统计信息、执行计划、索引选择逻辑
- **索引** —— B-tree / GIN / GiST / BRIN 的适用场景与原理
- **锁与并发** —— 行锁、表锁、advisory lock、死锁排查
- **WAL & 复制** —— write-ahead log、流复制、逻辑复制
- **性能调优** —— `EXPLAIN ANALYZE`、连接池、配置参数

## 文章列表

- [PostgreSQL 搜索与索引：从混合搜索理解 B-tree、GIN、GiST 与 Partial Index](/blog/system-design/postgresql/search-and-indexing/)
- [PostgreSQL 分区：什么是分区，什么时候用](/blog/system-design/postgresql/partitioning-vs-sharding/)
