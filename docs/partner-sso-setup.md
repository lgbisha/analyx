# Partner SSO 凭据申请清单（需要你在网页控制台操作，约 3 分钟）

代码已全部就绪并上线：凭据未配置时登录入口自动隐藏、平台一切功能照旧；
把凭据填进服务器 `.env` 并重启后，「使用 InfiniSynapse 登录」即刻在
www.lgbisha.cn 与 xishu.lgbisha.cn 两个域名生效，无需改代码重新部署。

## 为什么需要你操作

创建 Partner 接入应用的接口（`POST /api/auth/partner/clients`）只认**账号登录 Token**
（浏览器登录后的 Bearer Token），不认 API Key——研究所接入时已实测：用现有 `sk-` Key
调用返回 `{"code":800,"message":"登录无效，请重新登录"}`。因此必须在网页控制台自助创建一次。

**注意：平台需要独立的 Partner 应用**，与「提前退休研究所」（fire.lgbisha.cn）的应用分开
——两者回调域名白名单不同，密钥也各自独立、互不影响。

## 操作步骤（照做即可）

1. 用你的 InfiniSynapse 账号登录 https://app.infinisynapse.cn/tasks
2. 点左下角「设置」齿轮图标 → 菜单选「**第三方接入**」
3. 点「**创建接入应用**」，填写：
   - **应用名称**：`析数·智能数据分析平台`
   - **回调域名白名单**：`www.lgbisha.cn,xishu.lgbisha.cn`
     （两个域名都要，平台双域名并行、各自回调各自；如需本地调试再加一条 `localhost`，多个用逗号分隔）
   - **Webhook URL**：留空（不需要）
4. 创建成功会弹窗展示 `clientId`（`partner_` 开头）和 `clientSecret`（`psk_` 开头）。
   **密钥只展示这一次**，请立即复制保存。
5. 把两个值填进服务器 `.env`（SSH 到 124.221.76.211）：

   ```bash
   # 编辑 /root/infini-app/server/.env，把注释占位改为真实值：
   INFINI_SSO_CLIENT_ID=partner_xxxxxxxx
   INFINI_SSO_CLIENT_SECRET=psk_xxxxxxxx
   # 然后重启：
   pm2 restart infini-platform
   ```

   （`SESSION_SECRET` 已由部署流程写入，无需改动；本地开发则填仓库 `server/.env`。）

6. 验证：分别打开 https://www.lgbisha.cn 与 https://xishu.lgbisha.cn ，
   导航栏右侧（语言切换旁）应出现「使用 InfiniSynapse 登录」（英文界面为
   「Sign in with InfiniSynapse」）；点击 → 完成 InfiniSynapse 登录 → 自动跳回平台，
   导航栏显示你的昵称；登录后发起分析时 server 日志会记录用户标识（`[sso] analyze by uid=...`），
   报告完成页不再显示注册引导卡。
   两个域名的会话相互独立（cookie 不跨域名），各登各的属正常现象。

## 备注

- 每个账号最多创建 5 个接入应用；密钥疑似泄露可在同页面「重置密钥」（旧的立即失效）。
- 登录不解锁额外权限、也不对匿名用户新增任何限制——平台所有分析功能无需登录依旧完全可用。
- 官方指南：https://infinisynapse.cn/zh/docs/InfiniSynapse%20Partner%20SSO%20Integration%20Guide
