// 分析任务编排 + 内存 job 存储。
// 一个 job = 一次用户分析请求，映射到 InfiniSynapse 的一个 task。
import {
  uuid,
  openEvents,
  newTask,
  getTaskState,
  getWorkspace,
  previewFile,
  setShare,
  publicDownloadUrl,
} from "./infini.js";

export type Chart = { name: string; svg: string };
export type Table = { name: string; rows: any[] };
export type Report = {
  taskId: string;
  summary: string; // markdown 最终报告
  charts: Chart[];
  tables: Table[];
  pdfUrl?: string; // 引擎生成的 PDF 报告下载链接（公开）
};

type JobStatus = "running" | "done" | "error";
type Phase = "connect" | "ingest" | "compute" | "chart" | "report";
type StatusMsg = { seq: number; kind: "status" | "done" | "error"; text?: string; phase?: Phase; report?: Report };

export type Job = {
  id: string;
  taskId: string | null;
  status: JobStatus;
  log: StatusMsg[];
  report: Report | null;
  error: string | null;
  subscribers: Set<(m: StatusMsg) => void>;
};

const jobs = new Map<string, Job>();
let seqCounter = 0;

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

function emit(job: Job, m: Omit<StatusMsg, "seq">) {
  const msg: StatusMsg = { seq: ++seqCounter, ...m };
  job.log.push(msg);
  if (job.log.length > 200) job.log.shift();
  for (const fn of job.subscribers) {
    try {
      fn(msg);
    } catch {
      /* ignore */
    }
  }
}

const basename = (p: string) => p.split("/").pop() || p;

// 从 SSE 事件里提炼专业进度（含阶段标签）
function friendly(ev: any): { text: string; phase: Phase } | null {
  const m = ev?.data?.message;
  if (!m || typeof m !== "object") return null;
  const say = m.say;
  const text = typeof m.text === "string" ? m.text : "";
  const detectPhase = (s: string): Phase => {
    if (/加载|注册|建表|导入|读取|load|table|视图|view/i.test(s)) return "ingest";
    if (/图|chart|svg|绘制|可视化/i.test(s)) return "chart";
    if (/select|统计|计算|查询|聚合|均值|标准差|占比|sql/i.test(s)) return "compute";
    if (/报告|汇总|总结|summary|report/i.test(s)) return "report";
    return "compute";
  };
  if (say === "reasoning" && text) return { text: text.slice(-70).replace(/\s+/g, " "), phase: detectPhase(text) };
  if (say === "text" && text) return { text: text.slice(0, 90).replace(/\s+/g, " "), phase: "report" };
  if (say === "command" && text) return { text: "执行数据处理指令", phase: detectPhase(text) };
  if (say === "tool" && text) return { text: "处理数据中", phase: detectPhase(text) };
  if (say === "api_req_started") return { text: "已连接分析引擎", phase: "connect" };
  return null;
}

export function startAnalysis(prompt: string): Job {
  const id = uuid();
  const connId = uuid();
  // 客户端预生成唯一 taskId，避免并发时服务端按时间戳生成导致撞车
  const taskId = uuid();
  const job: Job = {
    id,
    taskId,
    status: "running",
    log: [],
    report: null,
    error: null,
    subscribers: new Set(),
  };
  jobs.set(id, job);

  let completionSeen = false;
  let lastStatusAt = 0;
  let finalText = "";
  let completionText = "";
  let userEchoSkipped = false;

  const ctrl = openEvents(
    connId,
    (ev) => {
      // 严格按本任务 taskId 过滤：同账号并发时，事件流可能混入其他任务的事件
      const evTaskId = ev?.data?.taskId;
      if (evTaskId && String(evTaskId) !== taskId) return;
      const m = ev?.data?.message;
      if (m && typeof m === "object") {
        const say = m.say;
        const ask = m.ask;
        // 最终报告文本
        if (say === "text" && m.partial === false && typeof m.text === "string") {
          if (!userEchoSkipped) {
            userEchoSkipped = true; // 第一条 say:text 是用户输入回显，跳过
          } else if (m.text.length > finalText.length) {
            finalText = m.text;
          }
        }
        if ((say === "completion_result" || ask === "completion_result")) {
          completionSeen = true;
          if (typeof m.text === "string" && m.text.length > completionText.length) {
            completionText = m.text;
          }
        }
      }

      // 节流转发进度
      const now = Date.now();
      const line = friendly(ev);
      if (line && now - lastStatusAt > 700) {
        lastStatusAt = now;
        emit(job, { kind: "status", text: line.text, phase: line.phase });
      }
    },
    (err) => {
      /* SSE 断开由轮询兜底 */
    }
  );

  (async () => {
    try {
      await new Promise((r) => setTimeout(r, 1500)); // 等 SSE 就绪
      emit(job, { kind: "status", text: "已提交分析任务", phase: "connect" });
      const res = await newTask(prompt, connId, taskId);
      if (!res?.data?.success && res?.success !== true) {
        // newTask 直接失败
        const errMsg = res?.data?.error || res?.error || res?.message || "任务创建失败";
        throw new Error(String(errMsg));
      }

      // 轮询完成状态
      const startTs = Date.now();
      const maxMs = 10 * 60 * 1000;
      let startedRunning = false;
      while (Date.now() - startTs < maxMs) {
        await new Promise((r) => setTimeout(r, 4000));
        if (!job.taskId) continue;
        const st = await getTaskState(job.taskId);
        if (st.found && st.isRunning) startedRunning = true;
        const finishedByPoll = st.found && startedRunning && !st.isRunning;
        const finishedByBoth = completionSeen && st.found && !st.isRunning;
        if (finishedByPoll || finishedByBoth) break;
      }

      if (!job.taskId) throw new Error("未获取到任务 ID");

      emit(job, { kind: "status", text: "正在整理图表与报告", phase: "report" });
      const report = await collectArtifacts(job.taskId, completionText || finalText);
      job.report = report;
      job.status = "done";
      emit(job, { kind: "done", report });

      // 设为公开，供分享页使用（失败不阻塞）
      setShare(job.taskId, true).catch(() => {});
    } catch (err: any) {
      job.status = "error";
      job.error = err?.message || String(err);
      emit(job, { kind: "error", text: job.error ?? "未知错误" });
    } finally {
      ctrl.abort();
    }
  })();

  return job;
}

async function collectArtifacts(taskId: string, summaryFromSSE: string): Promise<Report> {
  const ws = await getWorkspace(taskId);
  const files = ws.files || [];
  const charts: Chart[] = [];
  const tables: Table[] = [];

  for (const f of files) {
    if (f.toLowerCase().endsWith(".svg")) {
      try {
        const { content } = await previewFile(taskId, f);
        if (content && content.includes("<svg")) {
          charts.push({ name: basename(f).replace(/\.svg$/i, ""), svg: content });
        }
      } catch {
        /* skip */
      }
    } else if (f.toLowerCase().endsWith("_data.jsonl")) {
      try {
        const { content } = await previewFile(taskId, f);
        const rows = content
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        if (rows.length) {
          const name = basename(f).replace(/_data\.jsonl$/i, "");
          tables.push({ name, rows: rows.slice(0, 100) });
        }
      } catch {
        /* skip */
      }
    }
  }

  let summary = "";
  // 优先使用引擎生成的完整报告 md（顶层、非 stats、非文档），内容最丰富
  const reportMd = files.find(
    (f) => f.toLowerCase().endsWith(".md") && !f.includes("/") && !/stats/i.test(f)
  );
  if (reportMd) {
    try {
      summary = (await previewFile(taskId, reportMd)).content || "";
    } catch {
      /* skip */
    }
  }
  // 兜底：用 SSE 抓到的完成文本
  if (!summary) summary = summaryFromSSE || "";
  // 去掉 markdown 里的图片引用（图表在专门区域单独渲染，避免相对路径坏图）
  summary = summary.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\n{3,}/g, "\n\n");

  // 引擎生成的 PDF 报告（若有），提供公开下载链接
  const pdf = files.find((f) => f.toLowerCase().endsWith(".pdf") && !f.includes("/"));
  const pdfUrl = pdf ? publicDownloadUrl(taskId, pdf) : undefined;

  return { taskId, summary, charts, tables, pdfUrl };
}
