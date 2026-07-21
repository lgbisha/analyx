# 析数 · 智能决策分析平台 · Analyx

> InfiniSynapse × CSDN「Vibe Coding 泛数据分析应用开发大赛」参赛作品
>
> 上传数据或一句话填表，AI 自动生成专业分析报告 —— 支持联网检索，无需 SQL 或代码。

**在线体验 / Live**: **https://www.lgbisha.cn** （右上角可切换中/英文，`?lang=en` for English）

![析数首页](docs/home.jpg)

<p align="center">
  <a href="https://infinisynapse.cn">
    <img alt="Powered by InfiniSynapse" src="https://img.shields.io/badge/Powered%20by-InfiniSynapse-2f6fed">
  </a>
  <img alt="InfiniSynapse × CSDN" src="https://img.shields.io/badge/InfiniSynapse-%C3%97%20CSDN-12b76a">
  <img alt="scenarios" src="https://img.shields.io/badge/scenarios-14-d92d20">
  <img alt="stack" src="https://img.shields.io/badge/stack-Fastify%20%2B%20React%20%2B%20Vite-6938ef">
  <img alt="i18n" src="https://img.shields.io/badge/i18n-%E4%B8%AD%20%2F%20EN-f79009">
</p>

---

## 简介

析数是基于 **InfiniSynapse 泛数据分析引擎** 构建的智能决策分析平台。支持**表单提问（零上传）**、**文件上传**与**双文件对比**三种输入方式，全场景开启**联网检索**，由 AI 自动完成数据处理、指标计算、可视化与专业报告输出，并支持在线分享与 PDF 导出。

内置 **14 大场景**：

### 🌏 生活服务（表单 + 联网）
| 场景 | 说明 |
|---|---|
| 🚄 旅游费用估算 | 高铁/火车、高速、打车、门票、酒店分项预算与总预算区间 |
| 🍜 餐厅推荐助手 | 省市区 + 口味（辣/油炸）/价位/时段 → 联网餐厅短名单 |
| 🥬 应季蔬食参谋 | 按月份推荐时令蔬菜、做法、营养/热量/维生素与一日三餐 |
| 🏋️ 运动锻炼规划 | 身高体重、伤病规避、工作时间适配的一周锻炼计划 |

### 💼 职场与消费决策（表单 + 联网）
| 场景 | 说明 |
|---|---|
| ⚖️ 跳槽 Offer 对比 | 现岗位 vs 新 offer，真实年收入、两地成本与谈判清单 |
| 🏙️ 城市生活成本 | 两城月薪与开支对比，搬迁决策参考 |
| 💡 值不值决策卡 | 大额消费年化成本、替代方案与买/缓/不买建议 |

### 📊 经营与内容（表单 / 双文件）
| 场景 | 说明 |
|---|---|
| 🏪 小店经营诊断 | 一周关键数字 → 经营结构诊断与下周动作 |
| ✍️ 内容账号复盘 | 近一周数据 → 爆款规律与选题方向 |
| 📈 指标周环比 | 上期 vs 本期两份文件，自动涨跌排行与异常诊断 |

### 📁 个人数据分析（上传 + 联网）
| 场景 | 说明 |
|---|---|
| 📉 股票走势分析 | 输入代码联网取行情：均线/MACD/RSI + 策略回测参考（不构成投资建议） |
| 💳 消费账单分析 | 微信/支付宝账单：结构、趋势、异常与现金流 |
| 🪙 投资持仓分析 | 持仓与交易流水：结构、收益归因与风险敞口 |
| ❤️ 健康数据分析 | 每日健康记录：趋势、相关性与预警（不构成医疗诊断） |

所有场景均提供**快速试用 / 示例数据**与**示例报告预览**，无需注册即可跑通「输入 → 分析 → 图表 → 报告 → 分享」全流程。

## 界面预览 / Screenshots

| 分析场景页 | 专业分析报告 |
|---|---|
| ![场景页](docs/scenario.jpg) | ![报告](docs/report.jpg) |

| 英文界面 (English UI) |
|---|
| ![English](docs/home_en.jpg) |

## 亮点

- **零门槛决策**：表单场景一句话填写即可，无需准备数据文件
- **联网增强**：全场景开启 web search，公开信息标注「参考」并附免责声明
- **专业报告**：分析摘要 → 关键指标 → 分维度分析 → 关键发现 → 优化建议的固定结构
- **可视化**：引擎自动生成 SVG 图表（柱状图/饼图/折线图）
- **传播闭环**：每份报告一键生成带品牌的**公开分享页** + **PDF 导出**
- **体验**：Apple 风沉浸式首页、3D 数据粒子动效、专业固定等待态、中英文一键切换、移动端适配

## 技术架构

```
apps/
  server/   Node.js + Fastify + TypeScript —— InfiniSynapse Server API 客户端、任务编排、SSE 转发、公开分享页
  web/      React + Vite + TypeScript —— 单页应用，配置驱动 14 场景（form / upload / dual_upload），纯 canvas 3D 粒子球
```

**API Key 仅存服务端环境变量，前端零接触。**

## InfiniSynapse Server API 集成

后端通过 InfiniSynapse Server API 完成全部分析能力（所有调用可在 `app.infinisynapse.cn/tasks` 后台查验）：

1. **发起分析** — `GET /api/ai/events`（SSE 订阅）+ `POST /api/ai/message`（`type=newTask`，`chatSettings.mode=act`，`autoApprovalSettings.enableWebSearch=true`），客户端预生成唯一 taskId 保证并发安全
2. **实时进度** — 消费 SSE 的 `message.partial` / `completion_result`，向浏览器推送固定中文阶段话术
3. **产物获取** — `GET /api/ai_task/getTaskWorkspace/:id` + `POST /api/ai_task/previewFile` 拉取 SVG 图表、结构化数据与 Markdown/PDF 报告
4. **公开分享** — `POST /api/ai_task/setShare` + `GET /api/ai_task/publicTask` / `publicPreviewFile` 生成免登录分享页

数据接入：表单 JSON / 上传 CSV·Excel / 双文件对比，经服务端整理后内联进任务，由引擎自动建表、SQL 分析、统计建模、联网检索与可视化。

## 本地运行

```bash
# 1) 后端
cd server
cp .env.example .env      # 填入你的 INFINI_API_KEY
npm install
npm start                 # 监听 PORT（默认 30080）

# 2) 前端（开发）
cd ../web
npm install
npm run dev               # Vite dev server，代理 /api 到后端

# 生产：前端 npm run build 后，后端自动托管 web/dist
```

## 部署

- 前端构建为静态资源由 Fastify 托管；生产用 pm2 常驻，nginx 反代 + HTTPS。
- 单进程支持全部 14 场景（`?scenario=` 区分），中英文由 `?lang=` 区分。

---

## 🚀 关于 InfiniSynapse × CSDN

本作品由 **[InfiniSynapse](https://infinisynapse.cn) 泛数据分析引擎** 驱动，参加 **InfiniSynapse × CSDN 联合主办的「Vibe Coding 泛数据分析应用开发大赛」**。

**InfiniSynapse** 让 AI 直接理解自然语言、连接各类数据源（数据库 / Excel / 文档），完成从数据查询、分析到洞察的全流程——**让不懂 SQL 和代码的人也能做专业的数据分析**。一个 API Key 即可通过 Server API 编程发起分析任务、管理数据源与知识库、获取图表与报告。

- 🌐 官网 & 在线体验：https://infinisynapse.cn
- 🔑 注册即送 500 积分并申请 API Key：https://app.infinisynapse.cn
- 📖 Server API 文档：https://infinisynapse.cn/zh/docs/InfiniSynapse%20Server%20API%20Reference
- 🏆 Vibe Coding 大赛：https://infinisynapse.cn/contest/vibe-coding

> 想做自己的泛数据分析应用？注册 InfiniSynapse，用 Vibe Coding 的方式，几百行代码就能把 AI 数据分析能力接进你的产品。

---

*Powered by InfiniSynapse × CSDN. 分析能力由 InfiniSynapse 泛数据分析引擎驱动。*
