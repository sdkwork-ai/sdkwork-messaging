# Runbook — 通知初始化与商用开通（中文）

适用对象：新集群 / 新环境首次部署 `sdkwork-messaging` 通知能力（邮件 + 短信）的运维与实施人员。

目标：数据库一条命令初始化，控制台只改凭据与签名即可开始发送。

## 1. 前置条件

1. PostgreSQL 16.x 可连接，且已为 `MESSAGING` 配置 `SDKWORK_DATABASE_*` 连接信息。
2. **必须**设置渠道密钥加密主密钥（生产环境绝不能使用内置开发密钥）：

   ```bash
   # 生成一次并保存到部署密钥管理系统；设置后不可随意更换
   openssl rand -base64 32
   export SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY='<上一步生成的值>'
   ```

   - 该密钥用于加密企业邮箱密码 / 短信 SecretKey。
   - 密钥变更后，已保存的渠道密钥无法解密，必须重新录入；轮换前先备份并安排重录。
3. 确认安装租户为 `100001`、组织为 `0`（初始化数据按该范围预置，与 CloudRouter
   `agent.app.config.json` 一致）。自定义租户需要单独做租户初始化，不能直接复用本套种子。

## 2. 初始化数据库（一次性）

推荐在应用启动前执行：

```bash
cd <sdkwork-messaging>
pnpm run db:bootstrap
```

`db:bootstrap` 等价于 `db:init` + `db:seed`，会：

- 应用 baseline 与 `0000`–`0008` 全部迁移；
- 写入标准种子：13 个邮件服务商账户 / 13 个发件身份 / 4 条邮件规则；
- 写入 8 个短信服务商账户 / 8 个 `BirdCoder` 签名 / 4 条短信规则；
- 写入当前 locale 的 10 个邮件模板 + 10 个短信模板（默认 `zh-CN`）。

英文环境：

```bash
pnpm run db:bootstrap -- --locale en-US --profile standard
```

如果使用自动初始化启动（仅建议首次启动）：

```bash
export SDKWORK_DATABASE_AUTO_MIGRATE=true
export SDKWORK_DATABASE_SEED_ON_BOOT=true
export SDKWORK_DATABASE_SEED_LOCALE=zh-CN
export SDKWORK_DATABASE_SEED_PROFILE=standard
```

应用启动时会执行 init → migrate → seed。多副本环境建议只在发布 Job 中执行一次
`db:bootstrap`，避免多实例同时写种子历史。

## 3. 验证初始化

```bash
pnpm run db:status
pnpm run db:drift:check
```

期望：`status=seeded`、`pending_migrations=0`、drift clean。
控制台 `/admin/notify/email` 应看到 13 个账户，`/admin/notify/sms` 应看到 8 个账户。

## 4. 配置企业邮箱（默认发送通道）

1. 打开 `/admin/notify/email` → `企业邮箱`（已启用，登录账号 `no-reply@birdcoder.com`）。
2. 填写邮箱密码或客户端授权码（腾讯企业邮需在管理后台开启客户端并生成专用密码）。
3. 如实际不是腾讯企业邮，按服务商修改 SMTP/IMAP/POP3 端点；如发件地址不同，修改
   `no-reply@birdcoder.com` 为已开通地址。
4. 保存后账户、发件身份、四条邮件规则均为启用状态，无需再手动打开开关。

## 5. 配置腾讯云短信（默认短信通道）

1. 打开 `/admin/notify/sms` → `腾讯云短信`（已启用，接入地址
   `https://sms.tencentcloudapi.com`，地域 `ap-guangzhou`）。
2. 填写 SecretId、SdkAppId、SecretKey。
3. 把 `BirdCoder` 签名替换为腾讯云已审核通过的签名（`签名管理` 中编辑）。
4. 在 `模板管理` 中把短信模板状态改为 `approved` 并启用；未审核通过的模板不能发送。
5. 四条短信规则已启用，链首为腾讯云签名，无需再调整。

## 6. 验收

- 在通知测试或业务验证码流程中触发一封邮件 / 一条短信；
- 检查发送记录与投递状态；
- 邮件失败优先检查：授权码、发件地址是否已在企业邮箱开通、SMTP 端口；
- 短信失败优先检查：SecretId/SdkAppId/SecretKey、签名是否审核通过、模板是否已审核并启用；
- `pnpm run db:status` 仍应为 `clean`，`/healthz` 正常。

## 7. 安全与运维要点

- `SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY` 只放在部署密钥管理系统，不写入仓库、
  不写入 `etc/topology/*.env`。
- 种子全部使用 `ON CONFLICT DO NOTHING`：重复 `db:seed` 不会覆盖运营修改。
- 修改服务商、签名、模板后无需重新 seed。
- 升级只执行 `db:migrate` / `db:bootstrap`，不要重放 baseline。
- 备份策略参见 `backup-restore.md`。

## 8. 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 控制台列表为空 | 未执行 seed，或租户不是 `100001` | 执行 `pnpm db:seed`；确认登录租户 |
| 保存渠道密钥失败 | 未设置加密主密钥或数据库不可写 | 设置 `SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY` 后重试 |
| 邮件发送认证失败 | 授权码错误 / 未开客户端服务 / 发件地址未开通 | 重新生成授权码并核对发件地址 |
| 短信发送失败 | 凭据错误、签名未审核、模板未审核 | 核对腾讯云控制台状态后重试 |
| `db:drift:check` 失败 | 手工改过 schema 或迁移未执行 | 先 `db:migrate`，再按 drift 报告修复 |
