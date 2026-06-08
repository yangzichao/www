---
title: "系统设计：Design Google Docs（实时协同编辑）"
date: 2026-06-07
description: 实时协同编辑系统设计入门——面试标准答题结构，加上 OT vs CRDT 的工业内幕，全部结论经多源对抗式核实。
draft: true
tags: [system-design, interview, learning, collaborative-editing]
---

> 本文是一份入门教程，同时覆盖两件事：**(1) 面试的标准答题结构**，和 **(2) 实时协同编辑背后的真实工业知识（OT vs CRDT）**。所有关键结论都标注了来源，并经过多源对抗式核实。

## 这道题到底在考什么

「设计 Google Docs」本质是一道 **实时协同编辑（real-time collaborative editing）** 系统设计题。难点不在「存文档」，而在于 **多个人同时改同一个文档时，如何让每个人最终看到一致的结果**。

所以它同时考两件事：

1. 系统设计的通用答题套路（任何题都适用）
2. 协同编辑的核心算法（OT vs CRDT —— 这道题的灵魂 deep dive）

---

## 第一部分：面试标准答题结构

### 为什么大多数人挂掉：没有结构

候选人答不下去，主要原因是 **缺乏结构化的方法**，所以要按固定框架走，给自己一条「轨道」。[^hellointerview-intro] Educative 的 Grokking 课程把这套固定框架叫 **RESHADED**，是一套可复用的 45 分钟答题路线图。[^educative-course]

不管叫什么名字，标准结构都是这五步，按顺序走：

> **功能/非功能需求 → 核心实体 → API 设计 → 高层架构 → 深入专题（deep dive）** [^hellointerview-gdocs]

### 第 1 步：厘清需求（Requirements）

**功能需求（Functional）—— 公认的 4 个核心：** [^hellointerview-gdocs]

- 多用户 **并发编辑** 同一文档
- 用户能 **实时看到** 别人的修改
- 能看到别人的 **光标位置和在线状态**（presence）
- 文档的创建

更完整的功能清单还包括：富文本格式、离线访问 + 同步、细粒度权限控制（谁能看 / 谁能改）。[^algomaster]

**非功能需求（Non-functional）—— 最关键的一条：**

- **低延迟**：编辑要在 **毫秒级** 内传播给所有协作者 [^algomaster]
- **最终一致性（eventual consistency）**：并发修改下，所有人最终收敛到同一状态（第二部分细讲）

> 💡 面试技巧：明确说出「我们追求 **毫秒级低延迟** 和 **最终一致性**」会直接踩中考点。[^algomaster]

### 第 2 步：核心实体（Core Entities）

典型的有：User、Document、文档内容 / 操作记录（Operations）、权限（Permission/ACL）、版本历史（Version History）。

**版本历史 + 冲突解决** 被明确当作核心必备能力，别漏。[^educative-gdocs]

### 第 3 步：API 设计

- **REST** 用于「非实时」操作：创建文档、改权限、拉历史版本
- **WebSocket** 用于「实时」操作：推送 / 接收编辑、广播光标位置、presence

### 第 4 步：高层架构

被反复推荐的技术栈组合：**WebSocket（实时通道）+ 消息/处理队列（管并发）+ 持久化存储**，以此实现并发管理和低延迟更新。[^educative-gdocs]

一个典型的数据流：

```
客户端 ──(WebSocket 长连接)──► 实时协同服务（每文档一个"房间"）
                                    │
                       ┌────────────┼────────────┐
                       ▼            ▼            ▼
                  冲突解决(OT)   广播给其他人   写入存储/版本历史
```

> 工业参照：**Figma 给每个协同文档单独起一个服务进程**，所有编辑这个文档的人都连到这个进程上。[^figma] 这就是「每文档一个房间（room/process）」模式的真实案例，面试里说出来很加分。

### 第 5 步：Deep Dive —— 冲突解决

这是整道题的高潮，直接进入第二部分。

---

## 第二部分：工业内幕 —— 协同编辑到底怎么工作的

### 核心问题：并发编辑会冲突

假设文档是 `"cat"`，Alice 在开头插 `"s"`（想要 `"scat"`），Bob 同时在末尾插 `"s"`（想要 `"cats"`）。两人都基于 `"cat"` 这个版本操作。如果天真地把两条指令叠加，位置编号会错乱，两人最终看到的文档可能不一样。**怎么保证所有人收敛到同一个结果？** 这就是 OT 和 CRDT 要解决的问题。

一个关键的现实认知：系统 **理想上想要「立即一致」（所有人画面瞬间相同），但物理网络决定了现实只能做到「最终一致性」**。[^sdhandbook]

### 方案 A：Operational Transformation（OT）—— Google Docs 的选择

**OT 是 Google Docs 历史上一直用来解决并发编辑的算法。** [^sdhandbook]

核心机制：

- 有一个 **中央服务器** 维护一个操作序列（operation sequence）。在这套设计里，**服务器是文档状态的权威，每一条客户端编辑都先发到服务器**，客户端通过 **持久 WebSocket 连接** 与之通信。[^designgurus-arch]
- OT 传输的操作是 **相对于某个基线（baseline）** 的；当一条操作传来，**必须把它针对"自基线以来发生的本地操作"做变换（transform）**，才能正确应用。[^tiny-ot]
- 用 **确定性的「平局裁决」规则**（deterministic tie-breaking）保证所有副本收敛：比如「如果 Alice 的操作赢得平局，Bob 的插入就排到 Alice 之后」。[^sandbox-ot]

一句话本质：**服务器是中央权威，负责给操作排序、做变换，从而提供"强的立即一致性"。** [^designgurus-otcrdt]

**为什么 Google Docs 选 OT 而不是 CRDT？** 一个很实际的工程理由：**服务器反正都要看到每一条操作（为了做权限控制）**，既然它无论如何都在链路中央，那用中央式的 OT 就很自然。[^systemdr]

### 方案 B：CRDT（Conflict-free Replicated Data Type）—— 新派做法

**CRDT 是 OT 的替代方案，在较新的协同系统里越来越流行**，它把「合并逻辑」直接嵌进数据结构本身，而不是事后再做变换。[^sdhandbook]

核心机制：

- 不依赖中央排序。**给每个插入的字符分配一个稳定的位置标识符（position identifier）**，写进操作的元数据里。[^sandbox-crdt]
- 这样 **无论操作以什么顺序到达**（Alice 先还是 Bob 先），每个副本都能把字符排成同样的顺序。[^sandbox-crdt]
- CRDT 的「魔法」在于：它把数据 **拆成足够小的碎片**，以至于通常 **不需要变换改动内容本身，只需要变换改动的位置**（文本场景里，每个字符都是一个独立实体）。[^tiny-crdt]
- **每个客户端独立地先应用自己的编辑，之后再合并（merge）别人的改动**，各自维护一份副本，有网时再同步。[^designgurus-otcrdt]

### OT vs CRDT：一张对比表

| 维度 | OT | CRDT |
|---|---|---|
| 架构 | **中央式**，服务器是权威 [^designgurus-otcrdt] | **去中心化**，客户端各自合并 [^designgurus-otcrdt] |
| 变换什么 | 变换操作本身（相对基线）[^tiny-ot] | 只变换位置，靠稳定 ID [^tiny-crdt][^sandbox-crdt] |
| 一致性取向 | 强的立即一致性 [^designgurus-otcrdt] | 更适合离线/去中心化，更灵活 [^designgurus-otcrdt] |
| 成本落在哪 | 需要 **强力的服务器** [^systemdr] | 把计算/存储 **成本推给客户端** [^systemdr] |
| 谁在用 | Google Docs [^sdhandbook] | 较新的协同系统 [^sdhandbook] |

> ⚠️ 诚实标注：成本对比那条（OT 要强服务器 / CRDT 推给客户端）在核实时是 2-1 票通过，是常见说法但有争议——面试里可以提，别说得太绝对。其余各条均为多票/满票确认。

### 第三种现实：工业界还会「自创」

不是只有 OT 和 CRDT 两条路。**Figma 故意没用 OT，认为它对自己的场景「过于复杂」，于是自建了一套受 CRDT 启发、但又不是真正 CRDT 的系统。** [^figma] 它的冲突解决用的是 **属性级的「最后写入者赢」（last-writer-wins）**：服务器记住每个属性最新的值，并发修改就以最后到达的值为准。[^figma]

这给你一个重要洞察：**协同系统的方案要看场景**。Figma 是图形设计（对象的属性），last-writer-wins 够用；Google Docs 是文本（字符顺序很敏感），需要 OT 这种更精细的方案。

---

## 第三部分：推荐学习资源（按入门顺序）

**先打面试框架基础：**

1. **Hello Interview** —— 免费，讲「Delivery Framework」答题结构，还有 [Google Docs 专题拆解](https://www.hellointerview.com/learn/system-design/problem-breakdowns/google-docs)。[^hellointerview-gdocs]
2. **AlgoMaster 博客** —— [Google Docs 系统设计](https://blog.algomaster.io/p/google-docs-system-design-interview)，需求/挑战列得清楚。[^algomaster]
3. **Grokking the System Design Interview（Educative）** —— 付费，有专门的 [5 节 Google Docs 模块](https://www.educative.io/courses/grokking-the-system-design-interview)，教 RESHADED 框架。[^educative-course]

**再补 OT vs CRDT 算法：**

4. **System Design Sandbox** —— [OT vs CRDT](https://www.systemdesignsandbox.com/learn/ot-vs-crdt)，用 Alice/Bob 例子讲得最直观。[^sandbox-ot]
5. **System Design Handbook** —— [Google Docs 指南](https://www.systemdesignhandbook.com/guides/google-docs-system-design/)。[^sdhandbook]
6. **Tiny.cloud 博客** —— [Real-time collaboration: OT vs CRDT](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)，机制讲得细。[^tiny-ot]
7. **Design Gurus** —— [设计实时编辑器](https://www.designgurus.io/blog/design-real-time-editor)。[^designgurus-otcrdt]

**看真实工业系统（进阶，强烈推荐读）：**

8. **Figma 工程博客** —— [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)，一手资料，讲为什么不用 OT。[^figma]

---

## 一句话总结你该怎么答这道题

> 按「需求 → 实体 → API → 高层架构 → deep dive」五步走；高层架构用 **WebSocket + 队列 + 存储**，强调 **毫秒级低延迟 + 最终一致性**；deep dive 直奔 **冲突解决**，讲清 **Google Docs 用 OT（中央服务器排序 + 变换操作）**，对比 **CRDT（去中心化、稳定位置 ID、只变换位置、适合离线）**，再用 **Figma 自建 last-writer-wins** 说明「方案随场景而变」。

---

## 参考来源

[^hellointerview-intro]: Hello Interview — System Design in a Hurry: Introduction. 「候选人答不下去主要因为缺乏结构，建议按 Delivery Framework 走。」<https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction>
[^hellointerview-gdocs]: Hello Interview — Google Docs Problem Breakdown. 4 个核心功能需求 + 「需求 → 实体 → API → 架构 → deep dive」结构。<https://www.hellointerview.com/learn/system-design/problem-breakdowns/google-docs>
[^educative-course]: Educative — Grokking the System Design Interview. 含 5 节 Google Docs 模块；教 RESHADED 45 分钟答题结构。<https://www.educative.io/courses/grokking-the-system-design-interview>
[^educative-gdocs]: Educative — Design of Google Docs. 推荐 WebSocket + 时序数据库 + 处理队列；冲突解决与版本历史为核心能力。<https://www.educative.io/courses/grokking-the-system-design-interview/design-of-google-docs>
[^algomaster]: AlgoMaster — Google Docs System Design Interview. 功能需求与「毫秒级编辑传播 + 最终一致性」非功能需求。<https://blog.algomaster.io/p/google-docs-system-design-interview>
[^sdhandbook]: System Design Handbook — Google Docs Guide. OT 是 Google Docs 历史算法；CRDT 是新派替代；现实是最终一致性。<https://www.systemdesignhandbook.com/guides/google-docs-system-design/>
[^sandbox-ot]: System Design Sandbox — OT vs CRDT. OT 中央服务器维护操作序列 + 确定性平局裁决。<https://www.systemdesignsandbox.com/learn/ot-vs-crdt>
[^sandbox-crdt]: System Design Sandbox — OT vs CRDT. CRDT 给每个字符分配稳定位置标识符，任意到达顺序都收敛。<https://www.systemdesignsandbox.com/learn/ot-vs-crdt>
[^tiny-ot]: Tiny.cloud — Real-time collaboration: OT vs CRDT. 「incoming operations must be transformed to include the local operations that have happened since that baseline.」<https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/>
[^tiny-crdt]: Tiny.cloud — Real-time collaboration: OT vs CRDT. 「CRDT breaks down data into such small pieces that it generally doesn't need to transform the change itself, only the position of the change.」<https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/>
[^designgurus-arch]: Design Gurus — Design a Real-time Editor. 「the server is the authority on the document's state … Every edit operation from clients goes to the server first … persistent connection … via WebSockets.」<https://www.designgurus.io/blog/design-real-time-editor>
[^designgurus-otcrdt]: Design Gurus — Design a Real-time Editor. OT 中央权威 + 强立即一致性；CRDT 客户端独立应用并稍后合并。<https://www.designgurus.io/blog/design-real-time-editor>
[^systemdr]: systemdr — CRDTs vs Operational Transformation. Google Docs 用 OT（服务器反正要看每条操作做权限控制）；OT 需强服务器 / CRDT 推成本给客户端（2-1 票，有争议）。<https://systemdr.systemdrd.com/p/crdts-vs-operational-transformation>
[^figma]: Figma Engineering — How Figma's multiplayer technology works. 故意避开 OT；client/server + WebSocket + 每文档一进程；属性级 last-writer-wins。<https://www.figma.com/blog/how-figmas-multiplayer-technology-works/>
