---
title: JWT 令牌结构解析、常见排错与安全实践指南
description: 深入理解 JSON Web Token (JWT) 的 Header、Payload、Signature 三段式编码原理，快速定位 Token 过期与签名校验失败问题。
date: 2026-10-30
tags:
  - JWT
  - 身份认证
  - Web安全
cover: https://img.888467.xyz/888467/2026/10/9328fa2dfaceadaa.svg
---

在前后端分离、微服务网关与单点登录（SSO）架构中，**JWT（JSON Web Token）** 是最常见的无状态身份凭证格式。日常联调接口遇到 `401 Unauthorized` 时，第一步往往就是拆解 Token 查看其声明与有效期。

![JWT 令牌三段式结构示意图](https://img.888467.xyz/888467/2026/10/9328fa2dfaceadaa.svg)

## 一、JWT 的三段式结构

一个标准的 JWT 字符串由两个点号 `.` 分隔为三部分：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDI0IiwiZXhwIjoxNzkzNDU2MDAwfQ.signature_bytes
```

1. **Header（头部）**：声明签名算法（如 `HS256`、`RS256`、`ES256`）与令牌类型 `JWT`，经 **Base64Url** 编码。
2. **Payload（载荷）**：存放业务声明与标准注册声明（Registered Claims），同样仅做 **Base64Url** 编码，**默认并不加密**。
3. **Signature（签名）**：服务端使用密钥对 `base64Url(header) + "." + base64Url(payload)` 进行签名计算，确保内容未被客户端篡改。

> 提示：您可以直接使用本站的 [JWT 解析器](/jwt-parser) 在浏览器本地一键查看 Header 与 Payload 字段，数据全程在本地处理，不会上传到任何服务器。

## 二、常见标准字段含义速查

| 字段名 | 全称 | 作用与排错要点 |
| :--- | :--- | :--- |
| `iss` | Issuer | 签发方标识，微服务网关常用于校验签发源是否匹配 |
| `sub` | Subject | 令牌主体（通常是用户 ID） |
| `aud` | Audience | 接收方标识，不匹配会导致鉴权中间件拒绝 |
| `exp` | Expiration Time | 过期时间（Unix 秒级时间戳），可用 [日期时间转换器](/date-time-converter) 快速换算 |
| `nbf` | Not Before | 生效时间，若服务器之间存在时钟偏移（Clock Skew）可能触发未生效报错 |
| `iat` | Issued At | 签发时间戳 |

## 三、开发联调中的高频踩坑点

### 1. 标准 Base64 与 Base64Url 的区别

不少同学直接用普通 Base64 解码器解码 JWT 片段时会遇到乱码或报错，原因是 JWT 规范采用的是 **Base64Url**：

- `+` 被替换为 `-`
- `/` 被替换为 `_`
- 省略末尾填充号 `=`

如需手动验证编码结果，可使用 [Base64 字符串转换工具](/base64-string-converter) 进行对比检查。

### 2. 切勿在 Payload 中存放敏感明文

由于任何拿到 JWT 的一方都可以无密钥解码 Header 和 Payload，**严禁**在 Payload 中放入密码、数据库密钥、完整身份证号或内部私有凭证。

### 3. 生产环境安全清单

- 校验时显式指定允许的 `alg` 算法白名单，拒绝 `alg: "none"` 攻击。
- 为对称签名算法（如 `HS256`）生成足够熵值的随机密钥（可使用 [Token 生成器](/token-generator) 或 [HMAC 生成器](/hmac-generator)）。
- 合理设置 `exp` 有效期（例如 Access Token 15~30 分钟 + Refresh Token 轮换机制）。
