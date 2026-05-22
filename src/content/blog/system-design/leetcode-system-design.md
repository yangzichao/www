---
title: "系统设计：LeetCode 总览"
date: 2026-05-22
description: LeetCode 后端系统设计——拆解为判题系统和竞赛系统两个子问题。
draft: true
tags: [system-design, interview, learning]
---

## 子问题拆解

LeetCode 后端的核心设计挑战拆为两层：

1. **[Online Judge（判题系统）](/blog/system-design/leetcode-online-judge/)** —— 底层，安全地执行不可信代码并返回判题结果
2. **[竞赛系统](/blog/system-design/leetcode-contest/)** —— 上层，基于判题能力支撑限时比赛、实时排名

判题系统独立于竞赛存在（日常刷题就在用），竞赛是在它之上加的一层。

## 不在讨论范围内

- 用户注册 / 登录 / 权限
- 题目编辑 / 管理后台
- 社区讨论 / 评论
- 支付 / 会员订阅
