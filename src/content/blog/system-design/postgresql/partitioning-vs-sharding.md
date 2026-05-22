---
title: "PostgreSQL 分区：什么是分区，什么时候用"
date: 2026-05-22
description: 从零理解 PostgreSQL 表分区——什么是分区、三种分区方式、什么时候该用。
draft: true
tags: [postgresql, database, partitioning]
---

## 什么是分区

你有一张 `events` 表，随着时间推移越来越大。某一天你想到：
**"要不把 2024 年的数据放一张表，2025 年的放另一张表？"**

这就是分区（Partitioning）。

PostgreSQL 的分区是：一张**逻辑表**，背后由多张**物理子表**组成。
对外看起来还是一张表，写入和查询都照常，但 PostgreSQL 内部知道数据分布在哪里。

```
events（逻辑表，你操作这个）
├── events_2024（物理子表）
├── events_2025（物理子表）
└── events_2026（物理子表）
```

---

## 三种分区方式

### 1. RANGE — 按范围分（最常见）

适合：时间、ID 区间、数字范围。
典型场景：日志表、订单表、事件表按月/年分区。

```sql
CREATE TABLE events (
    id         bigint,
    created_at timestamptz NOT NULL
) PARTITION BY RANGE (created_at);

-- 手动建每个月的子表
CREATE TABLE events_2026_01
    PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02
    PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

查询时 PostgreSQL 会自动**只扫描相关的子表**，其他月份直接跳过，这叫 partition pruning。

### 2. LIST — 按枚举值分

适合：有限的、固定的离散值。
典型场景：按地区、按租户、按状态分区。

```sql
CREATE TABLE orders (
    id     bigint,
    region text NOT NULL
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('us');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('eu');
CREATE TABLE orders_asia PARTITION OF orders FOR VALUES IN ('asia');
```

### 3. HASH — 按哈希值均匀分散

适合：数据没有自然的范围或枚举，只是想把数据均匀打散。

```sql
CREATE TABLE users (
    id bigint NOT NULL
) PARTITION BY HASH (id);

-- 分成 4 个桶
CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_1 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE users_2 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE users_3 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

---

## 什么时候该用分区

几个明确的信号：

**✅ 适合用分区**
- 单表数据量很大（大概 > 5000 万行开始考虑）
- 查询几乎总是带时间范围或某个固定字段过滤
- 需要定期清理旧数据——`DROP` 一个子表比 `DELETE WHERE` 快得多
- 数据有明显的冷热分界（新数据频繁查，旧数据几乎不动）

**❌ 不需要分区**
- 表还不够大，先把索引做好
- 查询没有固定的过滤字段，分区帮不上忙
- 你需要跨分区的唯一约束（这个很难做）

---

## 分区 vs 分片

两个概念经常被混淆，一句话区分：

| | 分区（Partition） | 分片（Sharding） |
|---|---|---|
| 实例数量 | 单个 PostgreSQL 实例 | 多个独立数据库实例 |
| 事务 / JOIN | 正常用 | 跨片很麻烦 |
| 适合 | 单机数据量大、查询慢 | 写入打满单机上限 |
| 复杂度 | 低 | 高 |

**绝大多数情况下分区就够了。** 分片是最后的手段，不到单机写入真正到瓶颈不需要考虑。
