// 三个垂直方向的差异化配置（中英双语）。共享同一套引擎与前端。

export type Lang = "zh" | "en";
export type FieldSpec = { field: string; desc: string; example: string };
export type Feature = { title: string; desc: string };
type Loc = {
  name: string;
  tagline: string;
  intro: string;
  personaTitle: string;
  templateName: string;
  columns: FieldSpec[];
  features: Feature[];
};
export type Vertical = {
  id: "consumption" | "health" | "finance" | "stock";
  brandColor: string;
  accentColor: string;
  sampleFile: string;
  zh: Loc;
  en: Loc;
  buildPrompt: (dataText: string, lang: Lang) => string;
};

const reportSpecZh = `
输出规范：
1. 全程使用专业、客观、书面的中文表述；避免口语化、网络流行语、玩梗和过度调侃。
2. 生成规范的可视化图表（柱状图、饼图、折线图等，SVG 格式），图表需有标题与坐标含义。
3. 以结构化 Markdown 报告输出，结构固定为：一、分析摘要 二、关键指标（表格）三、分维度分析 四、关键发现与洞察 五、优化建议。
4. 每个结论都必须有数据支撑，杜绝空泛表述。`;
const reportSpecEn = `
Output requirements:
1. Use professional, objective, written English throughout; avoid slang, memes and casual tone.
2. Generate proper visual charts (bar, pie, line, in SVG) with titles and labeled axes.
3. Output a structured Markdown report with fixed sections: 1. Executive Summary 2. Key Metrics (table) 3. Dimensional Analysis 4. Key Findings & Insights 5. Recommendations.
4. Support every conclusion with data; avoid vague statements.`;

export const VERTICALS: Record<string, Vertical> = {
  consumption: {
    id: "consumption",
    brandColor: "#2f6fed",
    accentColor: "#12b76a",
    sampleFile: "consumption_sample.csv",
    zh: {
      name: "消费账单分析",
      tagline: "上传账单数据，生成专业的个人消费结构分析报告",
      intro:
        "面向个人与家庭的消费数据分析工具。上传账单数据后，系统自动完成分类结构、趋势、异常识别与现金流分析，输出专业的可视化分析报告，并支持一键分享与导出。",
      personaTitle: "消费分析",
      templateName: "消费账单数据模板.csv",
      columns: [
        { field: "交易时间", desc: "交易发生的日期时间", example: "2026-06-01 08:12" },
        { field: "交易分类", desc: "消费类别（餐饮/购物/交通等）", example: "餐饮" },
        { field: "交易对方", desc: "商户或交易方名称", example: "肯德基" },
        { field: "商品说明", desc: "交易备注/商品说明", example: "早餐" },
        { field: "收支", desc: "收入或支出", example: "支出" },
        { field: "金额", desc: "交易金额（数值）", example: "23.5" },
        { field: "支付方式", desc: "支付渠道", example: "余额宝" },
      ],
      features: [
        { title: "结构与趋势", desc: "分类占比、消费趋势与周期特征" },
        { title: "异常识别", desc: "基于统计方法识别大额与异常支出" },
        { title: "现金流洞察", desc: "收支概览与支付渠道结构分析" },
      ],
    },
    en: {
      name: "Spending Analysis",
      tagline: "Upload your bills to get a professional personal spending report",
      intro:
        "A spending analytics tool for individuals and households. Upload your transaction data and the system automatically analyzes category structure, trends, anomalies and cash flow, producing a professional visual report with one-click sharing and export.",
      personaTitle: "Spending",
      templateName: "spending_data_template.csv",
      columns: [
        { field: "datetime", desc: "Transaction date & time", example: "2026-06-01 08:12" },
        { field: "category", desc: "Spending category (Dining/Shopping/Transport)", example: "Dining" },
        { field: "merchant", desc: "Counterparty / merchant name", example: "KFC" },
        { field: "description", desc: "Note / item description", example: "Breakfast" },
        { field: "type", desc: "Income or Expense", example: "Expense" },
        { field: "amount", desc: "Transaction amount (number)", example: "23.5" },
        { field: "payment", desc: "Payment channel", example: "Alipay" },
      ],
      features: [
        { title: "Structure & Trends", desc: "Category mix, spending trends and cyclical patterns" },
        { title: "Anomaly Detection", desc: "Identify large and abnormal spending via statistics" },
        { title: "Cash-flow Insight", desc: "Income/expense overview and payment channels" },
      ],
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `You are a professional personal-finance and spending data analyst. Analyze the bill data (CSV) below rigorously and produce a professional spending report.
First load and register the data as a table, then analyze: 1) spending structure (amount and share per category); 2) spending trends over time; 3) anomalies (threshold = mean + 2*std); 4) cash flow and payment-channel structure; 5) an objective profile of the user's spending behavior.
${reportSpecEn}

Bill data:
${data}`
        : `你是一位专业的个人财务与消费数据分析师。请基于以下账单数据（CSV）进行严谨分析，输出一份专业的消费分析报告。
请先将数据加载注册为数据表，再从以下维度分析：1) 消费结构（各分类金额与占比）；2) 消费趋势；3) 异常支出（阈值=均值+2倍标准差）；4) 现金流与支付方式结构；5) 客观总结该用户的消费行为特征。
${reportSpecZh}

账单数据如下：
${data}`,
  },

  health: {
    id: "health",
    brandColor: "#0e9f6e",
    accentColor: "#2f6fed",
    sampleFile: "health_sample.csv",
    zh: {
      name: "健康数据分析",
      tagline: "上传健康记录，生成专业的个人健康趋势分析报告",
      intro:
        "面向个人的健康数据分析工具。上传每日健康记录后，系统自动完成各项指标的趋势、相关性与预警分析，输出专业的可视化健康分析报告。报告为数据趋势解读，不构成医疗诊断。",
      personaTitle: "健康分析",
      templateName: "健康数据模板.csv",
      columns: [
        { field: "日期", desc: "记录日期", example: "2026-06-01" },
        { field: "体重kg", desc: "体重（千克）", example: "72.5" },
        { field: "睡眠小时", desc: "睡眠总时长（小时）", example: "6.2" },
        { field: "深睡小时", desc: "深睡时长（小时）", example: "1.1" },
        { field: "步数", desc: "当日步数", example: "6800" },
        { field: "静息心率", desc: "静息心率（次/分）", example: "68" },
        { field: "运动分钟", desc: "运动时长（分钟）", example: "20" },
        { field: "饮水ml", desc: "饮水量（毫升）", example: "1200" },
      ],
      features: [
        { title: "趋势分析", desc: "各项健康指标的时间趋势" },
        { title: "相关性分析", desc: "指标间关联（如睡眠与运动）" },
        { title: "健康预警", desc: "识别需关注的指标信号" },
      ],
    },
    en: {
      name: "Health Data Analysis",
      tagline: "Upload health records for a professional wellness-trend report",
      intro:
        "A personal health data analytics tool. Upload daily health records and the system analyzes trends, correlations and warning signals, producing a professional visual report. For data-trend interpretation only, not medical diagnosis.",
      personaTitle: "Health",
      templateName: "health_data_template.csv",
      columns: [
        { field: "date", desc: "Record date", example: "2026-06-01" },
        { field: "weight_kg", desc: "Weight (kg)", example: "72.5" },
        { field: "sleep_h", desc: "Total sleep (hours)", example: "6.2" },
        { field: "deep_sleep_h", desc: "Deep sleep (hours)", example: "1.1" },
        { field: "steps", desc: "Daily steps", example: "6800" },
        { field: "resting_hr", desc: "Resting heart rate (bpm)", example: "68" },
        { field: "exercise_min", desc: "Exercise (minutes)", example: "20" },
        { field: "water_ml", desc: "Water intake (ml)", example: "1200" },
      ],
      features: [
        { title: "Trend Analysis", desc: "Time trends of each health metric" },
        { title: "Correlation", desc: "Relationships between metrics (sleep vs exercise)" },
        { title: "Health Alerts", desc: "Identify signals worth attention" },
      ],
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `You are a professional health data analyst. Analyze the daily health-record data (CSV) below rigorously and produce a professional health report.
First load and register the data as a table, then analyze: 1) trends of each metric; 2) correlations (sleep vs steps, exercise vs heart rate, weight vs exercise); 3) warning signals; 4) weekday/weekend and week-over-week differences; 5) an objective profile of the user's health and routine.
${reportSpecEn}
Note: this is data-level interpretation and lifestyle suggestions only, not medical diagnosis.

Health data:
${data}`
        : `你是一位专业的健康数据分析师。请基于以下每日健康记录（CSV）进行严谨分析，输出一份专业的健康分析报告。
请先将数据加载注册为数据表，再从以下维度分析：1) 各指标趋势；2) 相关性（睡眠与步数、运动与心率、体重与运动）；3) 健康预警信号；4) 工作日/周末与周间差异；5) 客观总结该用户的健康与作息特征。
${reportSpecZh}
特别说明：本报告为数据层面的趋势解读与生活方式建议，不构成医疗诊断。

健康记录数据如下：
${data}`,
  },

  finance: {
    id: "finance",
    brandColor: "#6938ef",
    accentColor: "#f79009",
    sampleFile: "finance_sample.csv",
    zh: {
      name: "投资持仓分析",
      tagline: "上传持仓与交易数据，生成专业的投资组合复盘报告",
      intro:
        "面向个人投资者的投资组合分析工具。上传持仓与交易数据后，系统自动完成资产结构、收益归因与风险敞口分析，输出专业的可视化复盘报告。报告为数据层面的复盘，不构成投资建议。",
      personaTitle: "投资分析",
      templateName: "投资持仓数据模板.csv",
      columns: [
        { field: "日期", desc: "交易或记录日期", example: "2026-01-15" },
        { field: "标的名称", desc: "投资标的名称", example: "沪深300ETF" },
        { field: "类型", desc: "资产类型（基金/股票等）", example: "基金" },
        { field: "操作", desc: "买入/加仓/卖出", example: "买入" },
        { field: "数量", desc: "成交数量", example: "10000" },
        { field: "成交价", desc: "成交价格", example: "3.85" },
        { field: "金额", desc: "成交金额", example: "38500" },
        { field: "当前市值", desc: "当前持仓市值", example: "42000" },
        { field: "持仓成本", desc: "持仓总成本", example: "38500" },
      ],
      features: [
        { title: "资产结构", desc: "持仓分布与集中度分析" },
        { title: "收益归因", desc: "各标的盈亏与收益率排名" },
        { title: "风险敞口", desc: "集中度与波动风险提示" },
      ],
    },
    en: {
      name: "Portfolio Analysis",
      tagline: "Upload holdings and trades for a professional portfolio review",
      intro:
        "A portfolio analytics tool for individual investors. Upload holdings and trade data and the system analyzes asset structure, return attribution and risk exposure, producing a professional visual review. For data review only, not investment advice.",
      personaTitle: "Portfolio",
      templateName: "portfolio_data_template.csv",
      columns: [
        { field: "date", desc: "Trade or record date", example: "2026-01-15" },
        { field: "asset", desc: "Instrument name", example: "CSI300 ETF" },
        { field: "type", desc: "Asset type (Fund/Stock)", example: "Fund" },
        { field: "action", desc: "Buy / Add / Sell", example: "Buy" },
        { field: "quantity", desc: "Quantity", example: "10000" },
        { field: "price", desc: "Execution price", example: "3.85" },
        { field: "amount", desc: "Trade amount", example: "38500" },
        { field: "market_value", desc: "Current market value", example: "42000" },
        { field: "cost", desc: "Total cost", example: "38500" },
      ],
      features: [
        { title: "Asset Structure", desc: "Holdings distribution and concentration" },
        { title: "Return Attribution", desc: "P&L and return ranking per instrument" },
        { title: "Risk Exposure", desc: "Concentration and volatility warnings" },
      ],
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `You are a professional investment analyst. Analyze the holdings and trade data (CSV) below rigorously and produce a professional portfolio review.
First load and register the data as a table, then analyze: 1) asset structure (holdings, market-value share, fund/stock allocation); 2) return attribution (P&L and return per instrument, contribution ranking); 3) risk exposure (concentration, single-name weight, potential volatility); 4) trading behavior; 5) an objective profile of the portfolio's style and risk preference.
${reportSpecEn}
Note: this is a data-level review and risk note only, not investment advice.

Investment data:
${data}`
        : `你是一位专业的投资分析师。请基于以下投资持仓与交易数据（CSV）进行严谨分析，输出一份专业的投资组合复盘报告。
请先将数据加载注册为数据表，再从以下维度分析：1) 资产结构（持仓、市值占比、大类配置）；2) 收益归因（各标的盈亏与收益率、贡献排名）；3) 风险敞口（集中度、单一标的占比、潜在波动）；4) 交易行为；5) 客观总结该组合的风格与风险偏好。
${reportSpecZh}
特别说明：本报告为数据层面的复盘与风险提示，不构成任何投资建议。

投资数据如下：
${data}`,
  },

  stock: {
    id: "stock",
    brandColor: "#d92d20",
    accentColor: "#f79009",
    sampleFile: "stock_sample.csv",
    zh: {
      name: "股票走势分析",
      tagline: "上传行情数据，生成专业的走势研判与量化策略参考报告",
      intro:
        "面向个人投资者的股票走势分析工具。上传日线行情数据（OHLCV）后，系统自动完成趋势研判、技术指标计算、支撑压力位识别与量化策略回测参考，输出专业的可视化研判报告。报告为数据层面的技术分析参考，不构成投资建议。",
      personaTitle: "走势研判",
      templateName: "股票行情数据模板.csv",
      columns: [
        { field: "日期", desc: "交易日", example: "2026-06-02" },
        { field: "股票代码", desc: "标的代码", example: "600519" },
        { field: "股票名称", desc: "标的名称", example: "贵州茅台" },
        { field: "开盘价", desc: "当日开盘价", example: "1420.00" },
        { field: "最高价", desc: "当日最高价", example: "1439.80" },
        { field: "最低价", desc: "当日最低价", example: "1415.20" },
        { field: "收盘价", desc: "当日收盘价", example: "1433.50" },
        { field: "成交量", desc: "成交量（手）", example: "28650" },
      ],
      features: [
        { title: "趋势研判", desc: "均线系统、趋势方向与支撑压力位" },
        { title: "技术指标", desc: "MACD、RSI、波动率等指标计算与解读" },
        { title: "量化策略参考", desc: "均线交叉等规则的历史回测表现" },
      ],
    },
    en: {
      name: "Stock Trend Analysis",
      tagline: "Upload OHLCV data for a professional trend & quant-strategy report",
      intro:
        "A stock trend analysis tool for individual investors. Upload daily OHLCV data and the system performs trend assessment, technical indicators, support/resistance detection and rule-based backtest references, producing a professional visual report. Technical-analysis reference only, not investment advice.",
      personaTitle: "Trend",
      templateName: "stock_ohlcv_template.csv",
      columns: [
        { field: "date", desc: "Trading day", example: "2026-06-02" },
        { field: "symbol", desc: "Ticker", example: "600519" },
        { field: "name", desc: "Instrument name", example: "Kweichow Moutai" },
        { field: "open", desc: "Open price", example: "1420.00" },
        { field: "high", desc: "High price", example: "1439.80" },
        { field: "low", desc: "Low price", example: "1415.20" },
        { field: "close", desc: "Close price", example: "1433.50" },
        { field: "volume", desc: "Volume", example: "28650" },
      ],
      features: [
        { title: "Trend Assessment", desc: "Moving averages, trend direction, support/resistance" },
        { title: "Technical Indicators", desc: "MACD, RSI, volatility computed and interpreted" },
        { title: "Quant References", desc: "Backtest of rule-based strategies (e.g., MA cross)" },
      ],
    },
    buildPrompt: (data, lang) =>
      lang === "en"
        ? `You are a professional quantitative and technical analyst. Analyze the daily OHLCV stock data (CSV) below rigorously and produce a professional trend-analysis report.
First load and register the data as a table, then analyze:
1) Trend: 5/10/20-day moving averages, trend direction and stage; recent support and resistance levels;
2) Technical indicators: compute and interpret MACD, RSI(14) and rolling volatility; note overbought/oversold and divergence signals;
3) Volume-price: volume trends and notable volume-price patterns;
4) Quant strategy reference: backtest a simple MA(5/20) crossover rule on this data — trades, win rate, cumulative return vs buy-and-hold;
5) Scenario outlook: based on the data, outline bullish/neutral/bearish conditions with key levels to watch (objective, data-driven).
${reportSpecEn}
IMPORTANT: include a prominent disclaimer that this is a data-driven technical reference only and NOT investment advice; markets are risky.

Stock data:
${data}`
        : `你是一位专业的量化与技术分析师。请基于以下股票日线行情数据（CSV，OHLCV）进行严谨分析，输出一份专业的走势研判报告。
请先将数据加载注册为数据表，再从以下维度分析：
1) 趋势研判：计算 5/10/20 日均线，判断趋势方向与所处阶段；识别近期支撑位与压力位；
2) 技术指标：计算并解读 MACD、RSI(14)、滚动波动率；提示超买超卖与背离信号；
3) 量价关系：成交量趋势与显著的量价形态；
4) 量化策略参考：在本数据上回测简单的 5/20 日均线交叉策略——交易次数、胜率、累计收益并与买入持有对比；
5) 情景展望：基于数据给出偏多/中性/偏空三种情景的条件与关键点位（客观、数据驱动，不做主观荐股）。
${reportSpecZh}
重要：报告开头必须包含醒目的免责声明——本报告为数据驱动的技术分析参考，不构成任何投资建议，市场有风险，投资需谨慎。

行情数据如下：
${data}`,
  },
};

export const SCENARIO_ORDER: Array<Vertical["id"]> = ["consumption", "health", "finance", "stock"];

export function getScenario(id: string): Vertical | undefined {
  return VERTICALS[(id || "").toLowerCase()];
}

export function locOf(v: Vertical, lang: Lang): Loc {
  return lang === "en" ? v.en : v.zh;
}

export const PLATFORM = {
  zh: {
    name: process.env.PLATFORM_NAME || "析数",
    subname: "智能数据分析平台",
    tagline: "上传数据，一键生成专业分析报告",
    intro:
      "析数是基于 InfiniSynapse 泛数据分析引擎构建的智能数据分析平台。无需编写 SQL 或代码，上传你的数据，即可由 AI 自动完成建表、指标计算、可视化与专业报告输出，并支持在线分享与导出。",
  },
  en: {
    name: process.env.PLATFORM_NAME || "析数",
    subname: "Intelligent Data Analytics",
    tagline: "Upload data, get a professional analysis report in one click",
    intro:
      "A data analytics platform built on the InfiniSynapse general-purpose analysis engine. No SQL or code required — upload your data and AI automatically handles table building, metric computation, visualization and professional reporting, with online sharing and export.",
  },
};

export function exampleTaskId(id: string): string {
  const map: Record<string, string | undefined> = {
    consumption: process.env.EXAMPLE_CONSUMPTION,
    health: process.env.EXAMPLE_HEALTH,
    finance: process.env.EXAMPLE_FINANCE,
    stock: process.env.EXAMPLE_STOCK,
  };
  return map[id] || "";
}
