---
title: "JWT (JSON Web Token) 完全指南：原理、调试与安全误区"
date: "2026-01-12"
description: "JWT 里的数据是加密的吗？Header、Payload、Signature 分别代表什么？本文带你彻底搞懂无状态认证。"
---

在前后端分离的架构中，**JWT (JSON Web Token)** 几乎成为了身份认证的事实标准。

你可能每天都在 Header 里塞 `Authorization: Bearer <token>`，但你真的了解这串字符背后发生了什么吗？

## 误区一：JWT 是加密的吗？

**这是最危险的误解。**

JWT 的主体部分（Header 和 Payload）仅仅是进行了 **Base64Url 编码**。这意味着，**任何拿到 Token 的人都可以解码并看到里面的内容**。

⚠️ **安全警示**：永远不要在 JWT 的 Payload 中放入密码、手机号等敏感信息！

## 拆解 JWT 结构

一个 JWT 字符串由三个部分组成，用点 `.` 连接：`aaaaaa.bbbbbb.cccccc`

1.  **Header (头部)**：声明算法（如 HS256）和类型。
2.  **Payload (负载)**：存放数据（如用户 ID、过期时间 `exp`）。
3.  **Signature (签名)**：这是 JWT 的灵魂。

## 签名的作用：防篡改

既然 Payload 是“裸奔”的，为什么服务器敢信它？

因为有 **Signature**。
服务器用只有自己知道的 **密钥 (Secret)**，对 Header 和 Payload 进行哈希运算生成签名。
如果黑客在 Payload 里把“用户角色”从 `user` 改成了 `admin`，但他不知道密钥，就无法生成正确的新签名。服务器收到后一验签，直接拒绝。

## 开发痛点：如何快速调试？

后端报错 "Token Invalid"，你得知道是过期了？还是格式错了？还是内容不对？
肉眼看 Base64 简直是受罪。

**解决方案**：使用我们的 **[JWT 在线解码/调试器](https://888467.xyz/jwt-parser)**。
* **一键解码**：直接粘贴 Token，瞬间看清 Payload 里的 `sub`, `exp`, `iat` 等字段。
* **格式检查**：帮你验证 JWT 结构是否完整。
* **时间戳转换**：自动把 `exp` (过期时间) 转换成人类可读的日期格式。

> **立即使用**：👉 **[JWT 在线调试工具](/jwt-parser)**