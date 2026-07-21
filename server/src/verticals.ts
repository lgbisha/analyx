// 场景配置：保留个人数据工具 + 原创决策/经营场景；支持 upload / form / dual_upload；全量联网增强。

export type Lang = "zh" | "en";
export type InputMode = "upload" | "form" | "dual_upload";
export type FieldSpec = { field: string; desc: string; example: string };
export type Feature = { title: string; desc: string };
export type FormField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "textarea";
};
export type QuickStart = { label: string; values: Record<string, string> };

type Loc = {
  name: string;
  tagline: string;
  intro: string;
  personaTitle: string;
  templateName: string;
  columns: FieldSpec[];
  features: Feature[];
  formFields?: FormField[];
  quickStarts?: QuickStart[];
  cta?: string;
  dualLabels?: [string, string];
};

export type Vertical = {
  id: string;
  brandColor: string;
  accentColor: string;
  sampleFile: string;
  mode: InputMode;
  useWebSearch: boolean;
  zh: Loc;
  en: Loc;
  buildPrompt: (dataText: string, lang: Lang) => string;
};

const reportSpecZh = `
输出规范：
1. 全程使用专业、客观、书面中文；避免口语化与玩梗。
2. 需要时生成规范 SVG 图表（有标题）。
3. Markdown 结构：一、分析摘要 二、关键结论/指标 三、分维度分析 四、风险与洞察 五、可执行建议。
4. 使用联网信息时标注「公开信息参考」，并说明时效与不确定性。
5. 涉及投资/职业/重大消费决策时，开头必须有醒目免责声明。`;

const reportSpecEn = `
Output: professional written English; SVG charts when useful; sections: Summary / Key findings / Analysis / Risks / Actions; mark web info as public reference; include disclaimer for career/investment decisions.`;

const webZh = `
【必须联网】请使用联网搜索获取最新公开信息，并在报告中区分「用户输入」与「公开信息参考」。`;
const webEn = `
[REQUIRED] Use web search for latest public information; separate user input from public references.`;

function formBlock(data: string, lang: Lang) {
  return lang === "en" ? `User inputs:\n${data}` : `用户输入：\n${data}`;
}

export const VERTICALS: Record<string, Vertical> = {
  // ========== 原创：表单 + 联网 ==========
  offer_compare: {
    id: "offer_compare",
    brandColor: "#1d4ed8",
    accentColor: "#0ea5e9",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "跳槽 Offer 对比",
      tagline: "现岗位 vs 新 offer，算清真实年收入与风险",
      intro:
        "输入当前 package 与新 offer（底薪、年终、期权/签字费、城市与福利），系统结合两地社保公积金与生活成本公开信息，输出真实年收入对比、到手差异、风险点与谈判建议。仅供决策参考。",
      personaTitle: "Offer 对比",
      templateName: "",
      columns: [],
      features: [
        { title: "真实年收入", desc: "底薪/年终/补贴统一口径" },
        { title: "城市成本", desc: "联网参考两地生活成本" },
        { title: "谈判清单", desc: "可争取条款与风险提示" },
      ],
      formFields: [
        { key: "current_city", label: "当前城市", placeholder: "例如：上海", required: true },
        { key: "current_package", label: "当前年包/结构", placeholder: "底薪X，年终N薪，补贴…", required: true, type: "textarea" },
        { key: "new_city", label: "新 offer 城市", placeholder: "例如：北京", required: true },
        { key: "new_package", label: "新 offer 年包/结构", placeholder: "底薪、年终、签字费、期权…", required: true, type: "textarea" },
        { key: "role", label: "岗位", placeholder: "例如：高级产品经理", required: false },
        { key: "concerns", label: "你最在意的点", placeholder: "稳定性/成长/远程/加班…", required: false, type: "textarea" },
      ],
      quickStarts: [
        {
          label: "沪→京 产品",
          values: {
            current_city: "上海",
            current_package: "底薪45万，14薪，餐补房补约2万/年",
            new_city: "北京",
            new_package: "底薪50万，15薪，签字费5万，期权面议",
            role: "高级产品经理",
            concerns: "实际到手、租房压力、加班强度",
          },
        },
      ],
      cta: "生成 Offer 对比报告",
    },
    en: {
      name: "Offer Compare",
      tagline: "Current job vs new offer — real comp & risks",
      intro: "Compare packages across cities with public cost-of-living context. Decision support only.",
      personaTitle: "Offer",
      templateName: "",
      columns: [],
      features: [
        { title: "Real comp", desc: "Normalize base/bonus/equity" },
        { title: "City cost", desc: "Public COL references" },
        { title: "Negotiation", desc: "Risks & ask list" },
      ],
      formFields: [
        { key: "current_city", label: "Current city", required: true },
        { key: "current_package", label: "Current package", required: true, type: "textarea" },
        { key: "new_city", label: "New city", required: true },
        { key: "new_package", label: "New package", required: true, type: "textarea" },
        { key: "role", label: "Role", required: false },
        { key: "concerns", label: "Priorities", required: false, type: "textarea" },
      ],
      quickStarts: [],
      cta: "Generate compare report",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Career compensation analyst.\n${formBlock(data, lang)}\n${webEn}\nCompare real annual comp, city cost, risks, negotiation list. Disclaimer: not HR/legal advice.\n${reportSpecEn}`
        : `你是职业薪酬与跳槽决策分析师。\n${formBlock(data, lang)}\n${webZh}\n输出 Offer 对比报告：真实年收入对比表、两地生活成本参考、差异归因、风险点、谈判建议。开头免责：不构成人事/法律建议。\n${reportSpecZh}`,
  },

  city_cost: {
    id: "city_cost",
    brandColor: "#0f766e",
    accentColor: "#14b8a6",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "城市生活成本",
      tagline: "两城月薪与开支一算便知，搬不搬更清楚",
      intro:
        "输入对比城市、月薪与居住/通勤偏好，系统联网参考公开租金与生活成本区间，估算可自由支配收入、压力点与搬迁建议。价格随市场波动，请以当地实际为准。",
      personaTitle: "生活成本",
      templateName: "",
      columns: [],
      features: [
        { title: "可支用收入", desc: "扣刚性支出后的空间" },
        { title: "成本结构", desc: "租房/通勤/餐饮占比" },
        { title: "搬迁建议", desc: "情景对比与注意点" },
      ],
      formFields: [
        { key: "city_a", label: "城市 A", placeholder: "例如：成都", required: true },
        { key: "salary_a", label: "城市 A 月薪（税前）", placeholder: "例如：20000", required: true },
        { key: "city_b", label: "城市 B", placeholder: "例如：深圳", required: true },
        { key: "salary_b", label: "城市 B 月薪（税前）", placeholder: "例如：28000", required: true },
        { key: "housing", label: "居住偏好", placeholder: "合租/整租一居/距离地铁…", required: false },
        { key: "lifestyle", label: "消费习惯", placeholder: "下厨多/外卖多/有车…", required: false, type: "textarea" },
      ],
      quickStarts: [
        {
          label: "成都2万 vs 深圳2.8万",
          values: {
            city_a: "成都",
            salary_a: "20000",
            city_b: "深圳",
            salary_b: "28000",
            housing: "整租一居，近地铁",
            lifestyle: "每周外卖4-5次，无车",
          },
        },
      ],
      cta: "生成生活成本报告",
    },
    en: {
      name: "City Cost of Living",
      tagline: "Compare two cities by salary and expenses",
      intro: "Compare take-home flexibility across cities using public rent/cost ranges. Indicative only.",
      personaTitle: "COL",
      templateName: "",
      columns: [],
      features: [
        { title: "Disposable", desc: "After essentials" },
        { title: "Structure", desc: "Rent/transport/food" },
        { title: "Move advice", desc: "Scenario tips" },
      ],
      formFields: [
        { key: "city_a", label: "City A", required: true },
        { key: "salary_a", label: "Salary A (pre-tax monthly)", required: true },
        { key: "city_b", label: "City B", required: true },
        { key: "salary_b", label: "Salary B", required: true },
        { key: "housing", label: "Housing preference", required: false },
        { key: "lifestyle", label: "Lifestyle", required: false, type: "textarea" },
      ],
      quickStarts: [],
      cta: "Generate COL report",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Cost-of-living analyst.\n${formBlock(data, lang)}\n${webEn}\nCompare disposable income, expense structure, move scenarios. Disclaimer: estimates only.\n${reportSpecEn}`
        : `你是城市生活成本分析师。\n${formBlock(data, lang)}\n${webZh}\n输出两城对比：估算税后与可支用、租房/通勤/餐饮结构、压力点、搬迁情景建议。注明公开数据为区间估算。\n${reportSpecZh}`,
  },

  worth_it: {
    id: "worth_it",
    brandColor: "#b45309",
    accentColor: "#f59e0b",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "值不值决策卡",
      tagline: "大额消费先算年化成本，再决定买不买",
      intro:
        "输入商品/服务、价格、预计使用频率与替代方案，系统估算年化使用成本，并结合公开比价/口碑信息，给出买/缓买/不买的决策卡。仅供参考。",
      personaTitle: "值不值",
      templateName: "",
      columns: [],
      features: [
        { title: "年化成本", desc: "按使用频率摊薄" },
        { title: "替代对比", desc: "更低成本方案" },
        { title: "决策建议", desc: "买 / 缓 / 不买" },
      ],
      formFields: [
        { key: "item", label: "商品/服务", placeholder: "例如：索尼 WH-1000XM5", required: true },
        { key: "price", label: "价格（元）", placeholder: "例如：2499", required: true },
        { key: "usage", label: "使用频率/年限", placeholder: "每周通勤5天，预计用3年", required: true },
        { key: "alt", label: "替代方案", placeholder: "继续用旧耳机 / 买次级型号…", required: false, type: "textarea" },
        { key: "goal", label: "你想解决什么问题", placeholder: "降噪、长久续航…", required: false },
      ],
      quickStarts: [
        {
          label: "降噪耳机 2499",
          values: {
            item: "头戴降噪耳机旗舰款",
            price: "2499",
            usage: "每周通勤5天，预计使用3年",
            alt: "继续使用现有200元耳机",
            goal: "地铁降噪、少换电池",
          },
        },
      ],
      cta: "生成值不值报告",
    },
    en: {
      name: "Worth-it Card",
      tagline: "Annualize cost before big purchases",
      intro: "Price + usage + alternatives → worth-it decision card with public price/review context.",
      personaTitle: "Worth-it",
      templateName: "",
      columns: [],
      features: [
        { title: "Annualized cost", desc: "By usage" },
        { title: "Alternatives", desc: "Cheaper paths" },
        { title: "Decision", desc: "Buy / wait / skip" },
      ],
      formFields: [
        { key: "item", label: "Item", required: true },
        { key: "price", label: "Price", required: true },
        { key: "usage", label: "Usage", required: true },
        { key: "alt", label: "Alternatives", required: false, type: "textarea" },
        { key: "goal", label: "Problem to solve", required: false },
      ],
      quickStarts: [],
      cta: "Generate worth-it card",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Consumer decision analyst.\n${formBlock(data, lang)}\n${webEn}\nAnnualized cost, alternatives, buy/wait/skip card. Not financial advice.\n${reportSpecEn}`
        : `你是消费决策分析师。\n${formBlock(data, lang)}\n${webZh}\n输出值不值决策卡：年化使用成本、替代方案对比、买/缓/不买建议与理由。可引用公开比价口碑并标注参考。\n${reportSpecZh}`,
  },

  store_diag: {
    id: "store_diag",
    brandColor: "#9f1239",
    accentColor: "#fb7185",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "小店经营诊断",
      tagline: "填关键经营数字，生成一周诊断与动作清单",
      intro:
        "面向个体店主与小微经营。填写近一周营业额、客单、订单数、成本与渠道情况，系统输出结构诊断、异常点与下周可执行动作，并可联网补充同业参考。非财务审计。",
      personaTitle: "经营诊断",
      templateName: "",
      columns: [],
      features: [
        { title: "经营结构", desc: "客单/流量/转化" },
        { title: "成本压力", desc: "毛利与费用" },
        { title: "下周动作", desc: "3-5 条可执行建议" },
      ],
      formFields: [
        { key: "biz_type", label: "业态", placeholder: "奶茶店/餐饮/零售/线上店…", required: true },
        { key: "city", label: "城市/商圈", placeholder: "例如：杭州文三路", required: false },
        { key: "revenue", label: "近7天营业额（元）", placeholder: "例如：28600", required: true },
        { key: "orders", label: "近7天订单数", placeholder: "例如：920", required: true },
        { key: "cost", label: "主要成本情况", placeholder: "原料约40%，房租人力…", required: false, type: "textarea" },
        { key: "channels", label: "渠道结构", placeholder: "堂食60% 外卖40%", required: false },
        { key: "pain", label: "当前最大问题", placeholder: "午高峰排队、差评、复购低…", required: false, type: "textarea" },
      ],
      quickStarts: [
        {
          label: "奶茶店一周",
          values: {
            biz_type: "奶茶店",
            city: "杭州",
            revenue: "32000",
            orders: "1100",
            cost: "原料约38%，房租+人力偏高",
            channels: "堂食55% 外卖45%",
            pain: "复购一般，外卖抽成压力大",
          },
        },
      ],
      cta: "生成经营诊断",
    },
    en: {
      name: "Small Biz Weekly Diag",
      tagline: "Key numbers → weekly diagnosis",
      intro: "For micro businesses: revenue, orders, costs → structure diagnosis and next-week actions.",
      personaTitle: "Biz Diag",
      templateName: "",
      columns: [],
      features: [
        { title: "Structure", desc: "AOV/traffic" },
        { title: "Cost", desc: "Margin pressure" },
        { title: "Actions", desc: "Next week plan" },
      ],
      formFields: [
        { key: "biz_type", label: "Business type", required: true },
        { key: "city", label: "City", required: false },
        { key: "revenue", label: "7-day revenue", required: true },
        { key: "orders", label: "7-day orders", required: true },
        { key: "cost", label: "Cost notes", required: false, type: "textarea" },
        { key: "channels", label: "Channels", required: false },
        { key: "pain", label: "Top problem", required: false, type: "textarea" },
      ],
      quickStarts: [],
      cta: "Generate diagnosis",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Small-business ops analyst.\n${formBlock(data, lang)}\n${webEn}\nWeekly diagnosis, structure, risks, 3-5 actions. Not formal audit.\n${reportSpecEn}`
        : `你是小微经营分析师。\n${formBlock(data, lang)}\n${webZh}\n输出经营诊断：客单价与流量结构、成本压力、异常点、同业公开参考、下周3-5条动作。非财务审计。\n${reportSpecZh}`,
  },

  content_audit: {
    id: "content_audit",
    brandColor: "#6d28d9",
    accentColor: "#a78bfa",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "内容账号复盘",
      tagline: "粘贴近一周数据，找出爆款规律与选题方向",
      intro:
        "面向创作者与新媒体运营。填写平台、账号定位与近一周关键数据（或粘贴后台数据），输出内容结构、爆款共性、发布时间与下周选题建议，并可联网参考同类账号趋势。",
      personaTitle: "内容复盘",
      templateName: "",
      columns: [],
      features: [
        { title: "数据诊断", desc: "阅读/互动/涨粉" },
        { title: "爆款共性", desc: "标题与形式规律" },
        { title: "下周选题", desc: "可执行内容计划" },
      ],
      formFields: [
        { key: "platform", label: "平台", placeholder: "公众号/视频号/小红书/B站…", required: true },
        { key: "positioning", label: "账号定位", placeholder: "职场成长/数码评测…", required: true },
        { key: "metrics", label: "近7天关键数据", placeholder: "阅读、点赞、评论、涨粉、完播…可粘贴", required: true, type: "textarea" },
        { key: "top_posts", label: "表现最好的内容", placeholder: "列出2-5条标题与数据", required: false, type: "textarea" },
        { key: "goal", label: "阶段目标", placeholder: "涨粉/转化/品牌…", required: false },
      ],
      quickStarts: [
        {
          label: "职场号一周",
          values: {
            platform: "小红书",
            positioning: "职场成长与求职",
            metrics: "7天发5篇，平均阅读2.1k，互动率3.2%，涨粉180，最高一篇阅读1.2万",
            top_posts: "1) 面试被问优缺点怎么答 1.2万 2) 转行产品三个月 6k",
            goal: "稳定涨粉与私域转化",
          },
        },
      ],
      cta: "生成内容复盘",
    },
    en: {
      name: "Creator Content Audit",
      tagline: "Weekly metrics → hit patterns & topics",
      intro: "For creators: paste weekly metrics and top posts → diagnosis and next topics.",
      personaTitle: "Content",
      templateName: "",
      columns: [],
      features: [
        { title: "Metrics", desc: "Reach & engagement" },
        { title: "Hits", desc: "What worked" },
        { title: "Topics", desc: "Next week plan" },
      ],
      formFields: [
        { key: "platform", label: "Platform", required: true },
        { key: "positioning", label: "Positioning", required: true },
        { key: "metrics", label: "7-day metrics", required: true, type: "textarea" },
        { key: "top_posts", label: "Top posts", required: false, type: "textarea" },
        { key: "goal", label: "Goal", required: false },
      ],
      quickStarts: [],
      cta: "Generate content audit",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Content strategist.\n${formBlock(data, lang)}\n${webEn}\nAudit metrics, hit patterns, posting cadence, next-week topics.\n${reportSpecEn}`
        : `你是内容策略分析师。\n${formBlock(data, lang)}\n${webZh}\n输出内容复盘：数据诊断、爆款共性、发布时间与形式建议、下周选题清单；可参考同类赛道公开趋势。\n${reportSpecZh}`,
  },

  weekly_compare: {
    id: "weekly_compare",
    brandColor: "#0d9488",
    accentColor: "#f43f5e",
    sampleFile: "business_week1.csv",
    mode: "dual_upload",
    useWebSearch: true,
    zh: {
      name: "指标周环比",
      tagline: "任意两期数据对比，自动找涨跌与异常",
      intro:
        "上传「上期」与「本期」两份 CSV/Excel（渠道、商品、查询词等任意维度），自动做环比、排行与异常诊断，并可选联网补充行业背景。适用于运营、SEO、投放与销售复盘。",
      personaTitle: "周环比",
      templateName: "指标周数据模板.csv",
      dualLabels: ["上传上期数据", "上传本期数据"],
      columns: [
        { field: "维度", desc: "词/商品/渠道", example: "数据分析" },
        { field: "曝光", desc: "曝光", example: "1200" },
        { field: "点击", desc: "点击", example: "86" },
        { field: "转化", desc: "转化（可选）", example: "12" },
        { field: "花费", desc: "花费（可选）", example: "320" },
      ],
      features: [
        { title: "环比总览", desc: "核心指标变化" },
        { title: "涨跌排行", desc: "Top 增长/下滑" },
        { title: "行动建议", desc: "下期优化动作" },
      ],
      cta: "生成对比报告",
    },
    en: {
      name: "Period-over-Period Compare",
      tagline: "Two files → movers & anomalies",
      intro: "Upload previous vs current period CSVs for WoW diagnosis. Optional industry context.",
      personaTitle: "PoP",
      templateName: "period_metrics_template.csv",
      dualLabels: ["Previous period", "Current period"],
      columns: [
        { field: "dimension", desc: "Key", example: "data analytics" },
        { field: "impressions", desc: "Impr", example: "1200" },
        { field: "clicks", desc: "Clicks", example: "86" },
        { field: "conversions", desc: "Conv", example: "12" },
        { field: "cost", desc: "Cost", example: "320" },
      ],
      features: [
        { title: "Overview", desc: "KPI deltas" },
        { title: "Movers", desc: "Top gains/losses" },
        { title: "Actions", desc: "Next period" },
      ],
      cta: "Generate compare report",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Growth analyst. Period data:\n${data}\n${webEn}\nPoP summary, top movers, anomalies, actions, charts.\n${reportSpecEn}`
        : `你是增长分析师。两期数据：\n${data}\n${webZh}\n输出环比总览、涨跌Top、异常诊断、下期动作与对比图。\n${reportSpecZh}`,
  },

  // ========== 原有上传型（保留 + 联网） ==========
  consumption: {
    id: "consumption",
    brandColor: "#2f6fed",
    accentColor: "#12b76a",
    sampleFile: "consumption_sample.csv",
    mode: "upload",
    useWebSearch: true,
    zh: {
      name: "消费账单分析",
      tagline: "上传账单，生成消费结构与趋势报告",
      intro: "上传微信/支付宝账单，分析结构、趋势、异常与现金流，并可联网补充消费趋势背景。",
      personaTitle: "消费分析",
      templateName: "消费账单数据模板.csv",
      columns: [
        { field: "交易时间", desc: "日期时间", example: "2026-06-01 08:12" },
        { field: "交易分类", desc: "分类", example: "餐饮" },
        { field: "交易对方", desc: "商户", example: "肯德基" },
        { field: "商品说明", desc: "说明", example: "早餐" },
        { field: "收支", desc: "收入/支出", example: "支出" },
        { field: "金额", desc: "金额", example: "23.5" },
        { field: "支付方式", desc: "支付方式", example: "余额宝" },
      ],
      features: [
        { title: "结构与趋势", desc: "分类占比" },
        { title: "异常识别", desc: "大额支出" },
        { title: "现金流", desc: "收支结构" },
      ],
    },
    en: {
      name: "Spending Analysis",
      tagline: "Upload bills for structure & trend report",
      intro: "Transaction upload for structure, anomalies and cash flow.",
      personaTitle: "Spending",
      templateName: "spending_template.csv",
      columns: [
        { field: "datetime", desc: "Time", example: "2026-06-01 08:12" },
        { field: "category", desc: "Category", example: "Dining" },
        { field: "merchant", desc: "Merchant", example: "KFC" },
        { field: "description", desc: "Note", example: "Breakfast" },
        { field: "type", desc: "Type", example: "Expense" },
        { field: "amount", desc: "Amount", example: "23.5" },
        { field: "payment", desc: "Payment", example: "Alipay" },
      ],
      features: [
        { title: "Structure", desc: "Mix" },
        { title: "Anomalies", desc: "Large spends" },
        { title: "Cash flow", desc: "In/out" },
      ],
    },
    buildPrompt: (d, lang) =>
      lang === "en"
        ? `Finance analyst. Data:\n${d}\n${webEn}\nStructure, trends, anomalies, cash flow.\n${reportSpecEn}`
        : `消费数据分析师。数据：\n${d}\n${webZh}\n分析结构、趋势、异常、现金流。\n${reportSpecZh}`,
  },

  health: {
    id: "health",
    brandColor: "#0e9f6e",
    accentColor: "#2f6fed",
    sampleFile: "health_sample.csv",
    mode: "upload",
    useWebSearch: true,
    zh: {
      name: "健康数据分析",
      tagline: "上传健康记录，生成趋势与预警报告",
      intro: "上传每日健康记录，分析趋势、相关性与预警。不构成医疗诊断。",
      personaTitle: "健康分析",
      templateName: "健康数据模板.csv",
      columns: [
        { field: "日期", desc: "日期", example: "2026-06-01" },
        { field: "体重kg", desc: "体重", example: "72.5" },
        { field: "睡眠小时", desc: "睡眠", example: "6.2" },
        { field: "深睡小时", desc: "深睡", example: "1.1" },
        { field: "步数", desc: "步数", example: "6800" },
        { field: "静息心率", desc: "心率", example: "68" },
        { field: "运动分钟", desc: "运动", example: "20" },
        { field: "饮水ml", desc: "饮水", example: "1200" },
      ],
      features: [
        { title: "趋势", desc: "时间趋势" },
        { title: "相关性", desc: "指标关联" },
        { title: "预警", desc: "关注信号" },
      ],
    },
    en: {
      name: "Health Data Analysis",
      tagline: "Health logs → trend & alert report",
      intro: "Trends, correlations, alerts. Not medical diagnosis.",
      personaTitle: "Health",
      templateName: "health_template.csv",
      columns: [
        { field: "date", desc: "Date", example: "2026-06-01" },
        { field: "weight_kg", desc: "Weight", example: "72.5" },
        { field: "sleep_h", desc: "Sleep", example: "6.2" },
        { field: "deep_sleep_h", desc: "Deep", example: "1.1" },
        { field: "steps", desc: "Steps", example: "6800" },
        { field: "resting_hr", desc: "RHR", example: "68" },
        { field: "exercise_min", desc: "Exercise", example: "20" },
        { field: "water_ml", desc: "Water", example: "1200" },
      ],
      features: [
        { title: "Trends", desc: "Over time" },
        { title: "Correlation", desc: "Links" },
        { title: "Alerts", desc: "Signals" },
      ],
    },
    buildPrompt: (d, lang) =>
      lang === "en"
        ? `Health analyst. Data:\n${d}\n${webEn}\nTrends, correlations, alerts. Not diagnosis.\n${reportSpecEn}`
        : `健康数据分析师。数据：\n${d}\n${webZh}\n趋势、相关性、预警。不构成医疗诊断。\n${reportSpecZh}`,
  },

  finance: {
    id: "finance",
    brandColor: "#6938ef",
    accentColor: "#f79009",
    sampleFile: "finance_sample.csv",
    mode: "upload",
    useWebSearch: true,
    zh: {
      name: "投资持仓分析",
      tagline: "上传持仓流水，生成组合复盘报告",
      intro: "分析结构、收益归因与风险敞口，联网补充市场背景。不构成投资建议。",
      personaTitle: "投资分析",
      templateName: "投资持仓数据模板.csv",
      columns: [
        { field: "日期", desc: "日期", example: "2026-01-15" },
        { field: "标的名称", desc: "标的", example: "沪深300ETF" },
        { field: "类型", desc: "类型", example: "基金" },
        { field: "操作", desc: "操作", example: "买入" },
        { field: "数量", desc: "数量", example: "10000" },
        { field: "成交价", desc: "价格", example: "3.85" },
        { field: "金额", desc: "金额", example: "38500" },
        { field: "当前市值", desc: "市值", example: "42000" },
        { field: "持仓成本", desc: "成本", example: "38500" },
      ],
      features: [
        { title: "资产结构", desc: "分布" },
        { title: "收益归因", desc: "盈亏" },
        { title: "风险敞口", desc: "集中度" },
      ],
    },
    en: {
      name: "Portfolio Analysis",
      tagline: "Holdings review with market context",
      intro: "Structure, attribution, risk. Not investment advice.",
      personaTitle: "Portfolio",
      templateName: "portfolio_template.csv",
      columns: [
        { field: "date", desc: "Date", example: "2026-01-15" },
        { field: "asset", desc: "Asset", example: "CSI300 ETF" },
        { field: "type", desc: "Type", example: "Fund" },
        { field: "action", desc: "Action", example: "Buy" },
        { field: "quantity", desc: "Qty", example: "10000" },
        { field: "price", desc: "Price", example: "3.85" },
        { field: "amount", desc: "Amount", example: "38500" },
        { field: "market_value", desc: "MV", example: "42000" },
        { field: "cost", desc: "Cost", example: "38500" },
      ],
      features: [
        { title: "Structure", desc: "Allocation" },
        { title: "Attribution", desc: "P&L" },
        { title: "Risk", desc: "Concentration" },
      ],
    },
    buildPrompt: (d, lang) =>
      lang === "en"
        ? `Investment analyst. Data:\n${d}\n${webEn}\nStructure, attribution, risk. Not advice.\n${reportSpecEn}`
        : `投资分析师。数据：\n${d}\n${webZh}\n结构、收益归因、风险。不构成投资建议。\n${reportSpecZh}`,
  },

  stock: {
    id: "stock",
    brandColor: "#d92d20",
    accentColor: "#f79009",
    sampleFile: "stock_sample.csv",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "股票走势分析",
      tagline: "输入股票代码，联网获取行情后做技术与策略参考",
      intro:
        "输入 A 股/港股/美股代码与分析区间，系统通过 InfiniSynapse 联网检索公开行情与资讯，完成趋势、均线/MACD/RSI/波动率、支撑压力与策略回测参考。公开行情可能存在延迟与口径差异，本报告不构成投资建议。",
      personaTitle: "走势研判",
      templateName: "股票行情数据模板.csv",
      columns: [
        { field: "日期", desc: "交易日", example: "2026-06-02" },
        { field: "股票代码", desc: "代码", example: "600519" },
        { field: "股票名称", desc: "名称", example: "贵州茅台" },
        { field: "开盘价", desc: "开", example: "1420" },
        { field: "最高价", desc: "高", example: "1439" },
        { field: "最低价", desc: "低", example: "1415" },
        { field: "收盘价", desc: "收", example: "1433" },
        { field: "成交量", desc: "量", example: "28650" },
      ],
      features: [
        { title: "代码联网取数", desc: "按代码检索公开行情" },
        { title: "技术指标", desc: "均线 / MACD / RSI" },
        { title: "策略参考", desc: "回测与风险提示" },
      ],
      formFields: [
        { key: "symbol", label: "股票代码", placeholder: "例如：600519 / 00700 / AAPL", required: true },
        { key: "name", label: "股票名称（可选）", placeholder: "例如：贵州茅台", required: false },
        { key: "market", label: "市场", placeholder: "A股 / 港股 / 美股", required: false },
        { key: "period", label: "分析区间", placeholder: "近1个月 / 近3个月 / 近1年", required: false },
        { key: "focus", label: "关注点（可选）", placeholder: "趋势、买卖点、风险、和行业对比…", required: false, type: "textarea" },
      ],
      quickStarts: [
        { label: "贵州茅台 600519", values: { symbol: "600519", name: "贵州茅台", market: "A股", period: "近3个月", focus: "趋势、支撑压力与风险" } },
        { label: "宁德时代 300750", values: { symbol: "300750", name: "宁德时代", market: "A股", period: "近3个月", focus: "量价与波动" } },
        { label: "腾讯 00700", values: { symbol: "00700", name: "腾讯控股", market: "港股", period: "近3个月", focus: "趋势与行业背景" } },
      ],
      cta: "联网获取行情并分析",
    },
    en: {
      name: "Stock Trend Analysis",
      tagline: "Enter ticker → fetch public quotes → technical report",
      intro: "Enter a ticker and period; web search gathers public price history and news for technical analysis. Delayed/public data only. Not investment advice.",
      personaTitle: "Trend",
      templateName: "stock_ohlcv_template.csv",
      columns: [
        { field: "date", desc: "Date", example: "2026-06-02" },
        { field: "symbol", desc: "Symbol", example: "600519" },
        { field: "name", desc: "Name", example: "Moutai" },
        { field: "open", desc: "Open", example: "1420" },
        { field: "high", desc: "High", example: "1439" },
        { field: "low", desc: "Low", example: "1415" },
        { field: "close", desc: "Close", example: "1433" },
        { field: "volume", desc: "Vol", example: "28650" },
      ],
      features: [
        { title: "Ticker fetch", desc: "Public quotes via web" },
        { title: "Indicators", desc: "MA / MACD / RSI" },
        { title: "Strategy ref", desc: "Backtest notes" },
      ],
      formFields: [
        { key: "symbol", label: "Ticker", placeholder: "e.g. 600519 / 00700 / AAPL", required: true },
        { key: "name", label: "Name (optional)", required: false },
        { key: "market", label: "Market", placeholder: "CN / HK / US", required: false },
        { key: "period", label: "Period", placeholder: "1M / 3M / 1Y", required: false },
        { key: "focus", label: "Focus", required: false, type: "textarea" },
      ],
      quickStarts: [
        { label: "600519 Moutai", values: { symbol: "600519", name: "Kweichow Moutai", market: "CN", period: "3M", focus: "trend and risk" } },
      ],
      cta: "Fetch quotes & analyze",
    },
    buildPrompt: (d, lang) =>
      lang === "en"
        ? `You are a professional quant/technical analyst.
User request (ticker-based):
${d}
${webEn}
CRITICAL WORKFLOW:
1) Use web search to fetch recent public OHLCV / price trend for the given ticker and period (daily preferred). Summarize the data window and source as public reference.
2) If exact OHLCV table is unavailable, reconstruct a best-effort trend series from public quotes/charts and state limitations.
3) Then analyze: trend & MA(5/10/20), support/resistance, MACD, RSI(14), volatility, volume-price, simple MA cross backtest if data allows, and public market/news context.
4) Start with a strong disclaimer: not investment advice; public data may be delayed/incomplete.
Generate charts when possible.
${reportSpecEn}`
        : `你是专业的量化与技术分析师。
用户请求（按股票代码联网取数）：
${d}
${webZh}
【关键工作流，必须遵守】
1) 必须先联网搜索该股票代码在指定区间的公开行情（优先日线 OHLCV：日期/开/高/低/收/量）。在报告中写明数据区间与「公开信息参考」来源局限。
2) 若无法拿到完整 OHLCV 表，请基于公开行情/走势图尽量还原趋势序列，并明确说明数据不完整与可能偏差。
3) 再进行分析：趋势与均线(5/10/20)、支撑/压力、MACD、RSI(14)、波动率、量价关系；数据足够时做 5/20 均线交叉策略参考回测；并补充公开资讯/行业背景。
4) 报告开头必须有醒目免责声明：不构成任何投资建议；公开行情可能延迟或不完整，投资有风险。
请尽量生成价格与均线、成交量、MACD/RSI 等图表。
${reportSpecZh}`,
  },

  // —— 旅游费用估算（联网）——
  travel_cost: {
    id: "travel_cost",
    brandColor: "#0369a1",
    accentColor: "#38bdf8",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "旅游费用估算",
      tagline: "出发地到目的地：高铁/高速/打车/门票/酒店一算便知",
      intro:
        "输入出发地、目的地、出行方式、人数与天数，系统联网检索公开的火车票/高铁、高速通行费参考、打车区间、景点门票与酒店均价，生成分项费用表与总预算区间。价格随季节与库存波动，请以官方购票与预订平台最终价格为准。",
      personaTitle: "旅游预算",
      templateName: "",
      columns: [],
      features: [
        { title: "交通费用", desc: "高铁/火车/高速/打车参考" },
        { title: "门票与酒店", desc: "公开票价与均价区间" },
        { title: "总预算", desc: "分项汇总与弹性预留" },
      ],
      formFields: [
        { key: "from", label: "出发地", placeholder: "例如：上海", required: true },
        { key: "to", label: "目的地", placeholder: "例如：杭州", required: true },
        { key: "days", label: "天数", placeholder: "例如：2", required: true },
        { key: "people", label: "人数", placeholder: "例如：2", required: true },
        { key: "transport", label: "主要交通", placeholder: "高铁/自驾/动车+打车…", required: false },
        { key: "level", label: "住宿与消费档次", placeholder: "经济/舒适/轻奢", required: false },
        { key: "spots", label: "计划景点（可选）", placeholder: "西湖、灵隐寺…", required: false, type: "textarea" },
      ],
      quickStarts: [
        {
          label: "沪杭 2 日双人",
          values: {
            from: "上海",
            to: "杭州",
            days: "2",
            people: "2",
            transport: "高铁往返 + 市内打车/地铁",
            level: "舒适",
            spots: "西湖、河坊街、灵隐寺",
          },
        },
        {
          label: "京沪 3 日自驾",
          values: {
            from: "北京",
            to: "上海",
            days: "3",
            people: "3",
            transport: "自驾（含高速费、油费、停车）",
            level: "舒适",
            spots: "外滩、豫园",
          },
        },
      ],
      cta: "生成旅游费用报告",
    },
    en: {
      name: "Travel Cost Estimator",
      tagline: "Train/highway/taxi/tickets/hotel budget ranges",
      intro: "Estimate trip costs with public fare and hotel ranges. Final prices vary; verify on official booking sites.",
      personaTitle: "Travel Budget",
      templateName: "",
      columns: [],
      features: [
        { title: "Transport", desc: "Rail / highway / taxi" },
        { title: "Tickets & stay", desc: "Public price ranges" },
        { title: "Total budget", desc: "Breakdown + buffer" },
      ],
      formFields: [
        { key: "from", label: "From", required: true },
        { key: "to", label: "To", required: true },
        { key: "days", label: "Days", required: true },
        { key: "people", label: "People", required: true },
        { key: "transport", label: "Transport", required: false },
        { key: "level", label: "Budget level", required: false },
        { key: "spots", label: "Spots", required: false, type: "textarea" },
      ],
      quickStarts: [],
      cta: "Estimate travel cost",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Travel cost analyst.\n${formBlock(data, lang)}\n${webEn}\nEstimate: high-speed rail/train, highway tolls, taxi/rideshare, attraction tickets, hotel ADR ranges, food buffer, total budget with low/mid/high cases. Mark all as public reference; prices change. Charts for cost breakdown.\n${reportSpecEn}`
        : `你是旅游费用分析师。\n${formBlock(data, lang)}\n${webZh}\n请联网检索并估算：高铁/火车参考票价、自驾高速费与油费/停车（如适用）、市内打车或网约车区间、主要景点门票公开价、酒店均价区间、餐饮预留，最后给出低/中/高三档总预算与分项表。所有价格标注「公开信息参考」，说明会随日期与库存变化，建议以12306/高德/美团/酒店平台最终价为准。尽量生成费用结构图。\n${reportSpecZh}`,
  },

  // —— 餐厅推荐（联网）——
  restaurant: {
    id: "restaurant",
    brandColor: "#c2410c",
    accentColor: "#fb923c",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "餐厅推荐助手",
      tagline: "按省市区 + 口味 + 价位 + 营业时间，联网推荐餐厅",
      intro:
        "输入省/市/区与口味偏好（如辣、油炸、清淡）、人均预算、用餐时段与忌口，系统联网检索公开点评与营业信息，给出可落地的餐厅短名单、理由与注意事项。口碑与营业时间可能变动，请以到店前核验为准。",
      personaTitle: "餐厅推荐",
      templateName: "",
      columns: [],
      features: [
        { title: "区域匹配", desc: "省市区定位" },
        { title: "口味与价位", desc: "辣/油炸/人均等" },
        { title: "时段可用", desc: "结合营业时间偏好" },
      ],
      formFields: [
        { key: "region", label: "省市区/商圈", placeholder: "例如：上海市徐汇区 或 成都春熙路", required: true },
        { key: "taste", label: "口味偏好", placeholder: "喜欢辣、可接受油炸、忌香菜…", required: true },
        { key: "budget", label: "人均预算（元）", placeholder: "例如：80-150", required: false },
        { key: "meal_time", label: "用餐时段", placeholder: "今晚 18:30 / 周末中午", required: false },
        { key: "party", label: "人数与场景", placeholder: "2人约会 / 4人聚餐", required: false },
        { key: "other", label: "其他要求", placeholder: "有包间、停车、不排队…", required: false, type: "textarea" },
      ],
      quickStarts: [
        {
          label: "徐汇 · 辣 · 百元",
          values: {
            region: "上海市徐汇区",
            taste: "偏辣，可接受一定油炸，不吃香菜",
            budget: "80-120",
            meal_time: "工作日晚饭 18:30",
            party: "2人",
            other: "最好地铁可达，环境干净",
          },
        },
        {
          label: "成都 · 串串",
          values: {
            region: "成都市武侯区",
            taste: "重辣，喜欢串串/火锅",
            budget: "100-180",
            meal_time: "周末晚上",
            party: "4人朋友聚餐",
            other: "接受排队但不要太夸张",
          },
        },
      ],
      cta: "生成餐厅推荐",
    },
    en: {
      name: "Restaurant Finder",
      tagline: "Region + taste + budget + hours → shortlist",
      intro: "Recommend restaurants from public review sources by area, taste, budget and meal time. Verify hours before visit.",
      personaTitle: "Dining",
      templateName: "",
      columns: [],
      features: [
        { title: "Area", desc: "District match" },
        { title: "Taste/budget", desc: "Spice, fried, price" },
        { title: "Hours", desc: "Open for your slot" },
      ],
      formFields: [
        { key: "region", label: "Region", required: true },
        { key: "taste", label: "Taste", required: true },
        { key: "budget", label: "Budget per person", required: false },
        { key: "meal_time", label: "Meal time", required: false },
        { key: "party", label: "Party", required: false },
        { key: "other", label: "Other", required: false, type: "textarea" },
      ],
      quickStarts: [],
      cta: "Recommend restaurants",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Local dining recommender.\n${formBlock(data, lang)}\n${webEn}\nShortlist 5-8 restaurants with reasons, price band, signature dishes, hours notes, caveats. Public reference only.\n${reportSpecEn}`
        : `你是本地餐饮推荐分析师。\n${formBlock(data, lang)}\n${webZh}\n请联网检索该区域公开点评/榜单/营业信息，输出 5-8 家餐厅短名单：推荐理由、人均区间、招牌菜、是否偏辣/油炸、营业时间注意点、避雷提示。价格与营业时间标注「公开信息参考」，建议出发前再确认。可用表格呈现。\n${reportSpecZh}`,
  },

  // —— 应季蔬菜与三餐（联网）——
  seasonal_food: {
    id: "seasonal_food",
    brandColor: "#15803d",
    accentColor: "#4ade80",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "应季蔬食参谋",
      tagline: "按月份与口味，推荐应季菜、营养与一日三餐",
      intro:
        "选择月份/季节、口味与忌口、营养目标，系统结合应季蔬菜公开知识，推荐当季菜品、简单做法、营养与热量/维生素要点，并给出一日三餐示例菜单。营养数据为估算，不构成医疗或营养治疗建议。",
      personaTitle: "应季饮食",
      templateName: "",
      columns: [],
      features: [
        { title: "应季清单", desc: "当月时令蔬菜" },
        { title: "做法与营养", desc: "烧法、热量与维生素" },
        { title: "三餐菜单", desc: "一日示例搭配" },
      ],
      formFields: [
        { key: "month", label: "月份/季节", placeholder: "例如：7月 或 夏季", required: true },
        { key: "region", label: "所在地区（可选）", placeholder: "例如：华东 / 四川", required: false },
        { key: "taste", label: "口味与忌口", placeholder: "清淡/微辣，不吃香菜，少油…", required: false },
        { key: "goal", label: "营养目标", placeholder: "减脂 / 补铁 / 高纤维 / 控糖…", required: false },
        { key: "people", label: "用餐人数", placeholder: "例如：2 人", required: false },
        { key: "time", label: "可接受下厨时间", placeholder: "每餐 20-30 分钟", required: false },
      ],
      quickStarts: [
        {
          label: "7月 · 清淡减脂",
          values: {
            month: "7月",
            region: "华东",
            taste: "清淡少油，微辣可以，不吃香菜",
            goal: "减脂、高纤维、控制热量",
            people: "2",
            time: "每餐约25分钟",
          },
        },
        {
          label: "冬季 · 补维C",
          values: {
            month: "1月",
            region: "北方",
            taste: "偏家常，可炖煮",
            goal: "补充维生素C与优质蛋白",
            people: "3",
            time: "可接受40分钟",
          },
        },
      ],
      cta: "生成应季蔬食方案",
    },
    en: {
      name: "Seasonal Produce Planner",
      tagline: "Month + taste → seasonal veggies, recipes & daily menu",
      intro: "Seasonal vegetables, simple recipes, nutrition notes and a sample full-day menu. Estimates only, not medical advice.",
      personaTitle: "Seasonal Food",
      templateName: "",
      columns: [],
      features: [
        { title: "In season", desc: "Monthly produce" },
        { title: "Cook & nutrition", desc: "Methods & macros" },
        { title: "Daily menu", desc: "3 meals sample" },
      ],
      formFields: [
        { key: "month", label: "Month/season", required: true },
        { key: "region", label: "Region", required: false },
        { key: "taste", label: "Taste & avoid", required: false },
        { key: "goal", label: "Nutrition goal", required: false },
        { key: "people", label: "People", required: false },
        { key: "time", label: "Cook time", required: false },
      ],
      quickStarts: [],
      cta: "Generate seasonal plan",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Seasonal nutrition cooking assistant.\n${formBlock(data, lang)}\n${webEn}\nList seasonal vegetables, simple recipes, approx calories/vitamins, and a full-day 3-meal menu. Disclaimer: not medical advice.\n${reportSpecEn}`
        : `你是应季饮食与家常菜分析师。\n${formBlock(data, lang)}\n${webZh}\n请结合当季公开蔬果信息输出：1) 当月/当季推荐蔬菜清单 2) 每样简要营养点（热量/维生素/纤维等，估算）3) 2-3 种家常烧法步骤 4) 按用户口味与目标给出一日三餐示例菜单（早午晚）与大概总热量 5) 采购与保存提示。开头免责：营养数据为估算，不构成医疗或营养治疗建议。\n${reportSpecZh}`,
  },
  // —— 运动锻炼推荐（联网）——
  workout: {
    id: "workout",
    brandColor: "#7c2d92",
    accentColor: "#e879f9",
    sampleFile: "",
    mode: "form",
    useWebSearch: true,
    zh: {
      name: "运动锻炼规划",
      tagline: "按身体条件、伤病与工作时间，定制可坚持的锻炼计划",
      intro:
        "输入身高体重、运动基础、伤病情况与每周可用时间段，系统结合公开运动科学知识，评估 BMI 与强度区间，避开伤病风险动作，输出一周可执行的锻炼计划（动作/组次/时长/热量估算）与恢复建议。存在伤病或慢性疾病时请先咨询医生，本报告不构成医疗建议。",
      personaTitle: "锻炼规划",
      templateName: "",
      columns: [],
      features: [
        { title: "身体评估", desc: "BMI 与强度区间估算" },
        { title: "避开伤病", desc: "规避风险动作并给替代" },
        { title: "时间适配", desc: "按工作日程排一周计划" },
      ],
      formFields: [
        { key: "basic", label: "身高/体重/年龄/性别", placeholder: "例如：175cm，78kg，29岁，男", required: true },
        { key: "goal", label: "锻炼目标", placeholder: "减脂 / 增肌 / 体态改善 / 恢复体能…", required: true },
        { key: "injury", label: "伤病与不适", placeholder: "例如：腰椎间盘突出史、右膝半月板不适、无…", required: false, type: "textarea" },
        { key: "schedule", label: "工作与可用时间", placeholder: "例如：995 工作制，周二四晚 21 点后 40 分钟，周末上午充裕", required: true, type: "textarea" },
        { key: "base", label: "运动基础", placeholder: "久坐无基础 / 偶尔跑步 / 健身房1年…", required: false },
        { key: "equipment", label: "场地与器械", placeholder: "居家无器械 / 有哑铃弹力带 / 健身房", required: false },
      ],
      quickStarts: [
        {
          label: "久坐上班族减脂",
          values: {
            basic: "175cm，78kg，29岁，男",
            goal: "减脂并改善体态",
            injury: "偶发腰部酸痛，无确诊伤病",
            schedule: "朝九晚八，周二/四晚上21点后约40分钟，周六上午2小时",
            base: "久坐，基础较弱，能慢跑3公里",
            equipment: "居家有瑜伽垫和一对哑铃",
          },
        },
        {
          label: "膝伤后恢复",
          values: {
            basic: "168cm，60kg，33岁，女",
            goal: "恢复体能，保护膝盖，轻度减脂",
            injury: "右膝半月板损伤恢复期，避免深蹲跳跃",
            schedule: "工作日午休30分钟，周日下午1小时",
            base: "受伤前常游泳",
            equipment: "小区健身角+泳池",
          },
        },
      ],
      cta: "生成锻炼计划",
    },
    en: {
      name: "Workout Planner",
      tagline: "Body stats + injuries + work schedule → sustainable plan",
      intro:
        "Enter body stats, injuries and weekly availability; get a one-week executable plan with intensity zones, injury-safe substitutions and recovery tips. Consult a doctor for medical conditions; not medical advice.",
      personaTitle: "Workout",
      templateName: "",
      columns: [],
      features: [
        { title: "Assessment", desc: "BMI & intensity zones" },
        { title: "Injury-safe", desc: "Risk moves avoided" },
        { title: "Schedule fit", desc: "Plan around work hours" },
      ],
      formFields: [
        { key: "basic", label: "Height/weight/age/sex", required: true },
        { key: "goal", label: "Goal", required: true },
        { key: "injury", label: "Injuries", required: false, type: "textarea" },
        { key: "schedule", label: "Work & available time", required: true, type: "textarea" },
        { key: "base", label: "Fitness base", required: false },
        { key: "equipment", label: "Equipment", required: false },
      ],
      quickStarts: [],
      cta: "Generate workout plan",
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `Certified-style fitness planning analyst.\n${formBlock(data, lang)}\n${webEn}\nWorkflow: 1) assess BMI, estimated HR zones, workload capacity from work schedule; 2) flag injury-risk movements and give safe substitutions; 3) produce a 7-day plan table (day, time slot, exercises, sets/reps or duration, RPE, est. calories); 4) warm-up/recovery/nutrition notes; 5) progression for 4 weeks. Start with disclaimer: not medical advice; consult a doctor for injuries.\n${reportSpecEn}`
        : `你是专业的运动与体能规划分析师。\n${formBlock(data, lang)}\n${webZh}\n请按以下流程输出《个性化锻炼规划报告》：\n1) 身体评估：BMI、估算强度/心率区间、结合工作时间评估每周可承受训练量；\n2) 伤病规避：明确列出应避免的动作，并给出安全替代动作；\n3) 一周计划表（星期、时间段、动作、组数次数或时长、强度RPE、估算热量消耗），严格贴合用户可用时间；\n4) 热身、拉伸恢复与睡眠/饮食配合要点；\n5) 未来4周渐进方案与自测指标。\n开头必须免责：本报告不构成医疗建议，伤病或慢性疾病请先咨询医生；训练量为估算，量力而行。可生成计划表格与热量估算图。\n${reportSpecZh}`,
  },
};

export const SCENARIO_ORDER: string[] = [
  "travel_cost",
  "restaurant",
  "seasonal_food",
  "workout",
  "offer_compare",
  "city_cost",
  "worth_it",
  "store_diag",
  "content_audit",
  "weekly_compare",
  "stock",
  "consumption",
  "finance",
  "health",
];

export function getScenario(id: string): Vertical | undefined {
  return VERTICALS[(id || "").toLowerCase()];
}

export function locOf(v: Vertical, lang: Lang): Loc {
  return lang === "en" ? v.en : v.zh;
}

export const PLATFORM = {
  zh: {
    name: process.env.PLATFORM_NAME || "析数",
    subname: "智能决策分析平台",
    tagline: "旅游花费 · 餐厅推荐 · 应季饮食 · 职场决策 · 个人与经营数据 — 支持联网",
    intro:
      "析数基于 InfiniSynapse 泛数据分析引擎。支持旅游费用估算、按地区口味推餐厅、应季蔬食与三餐方案；也支持 Offer 对比、城市生活成本、账单/持仓/行情分析与经营周环比。上传或填表即可，自动联网并生成可分享专业报告。",
  },
  en: {
    name: process.env.PLATFORM_NAME || "析数",
    subname: "Decision Analytics Platform",
    tagline: "Travel costs · restaurants · seasonal meals · career & personal analytics — with web search",
    intro:
      "Built on InfiniSynapse. Travel budgets, restaurant shortlists, seasonal meal plans, offer compare, city cost, uploads for bills/portfolio/stocks and weekly ops compare. Form or upload, web-enhanced professional reports.",
  },
};

export function exampleTaskId(id: string): string {
  const envKey = `EXAMPLE_${id.toUpperCase()}`;
  return process.env[envKey] || "";
}
