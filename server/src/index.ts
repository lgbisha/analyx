import Fastify from "fastify";
import multipart from "@fastify/multipart";
import fstatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import * as XLSX from "xlsx";
import { VERTICALS, SCENARIO_ORDER, PLATFORM, getScenario, locOf, exampleTaskId, type Vertical, type Lang } from "./verticals.js";
import { startAnalysis, getJob, type Report } from "./jobs.js";
import { renderSharePage } from "./share.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 30080);
const PUBLIC_BASE = process.env.PUBLIC_BASE || `http://localhost:${PORT}`;

export const shareCache = new Map<string, { report: Report; scenarioId: string; lang: Lang }>();

const app = Fastify({ logger: false, bodyLimit: 25 * 1024 * 1024 });
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

const langOf = (q: any): Lang => ((q?.lang === "en" ? "en" : "zh") as Lang);

function truncateData(text: string, maxRows = 300, maxChars = 18000): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let out = lines.slice(0, maxRows).join("\n");
  if (out.length > maxChars) out = out.slice(0, maxChars) + "\n...(truncated)";
  if (lines.length > maxRows) out += `\n...(${lines.length} rows total, first ${maxRows} shown)`;
  return out;
}
function bufferToDataText(buf: Buffer, filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer" });
    return truncateData(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
  }
  return truncateData(buf.toString("utf-8"));
}
function loadSample(V: Vertical): string {
  if (!V.sampleFile) return "";
  const p = join(__dirname, "..", "samples", V.sampleFile);
  return existsSync(p) ? truncateData(readFileSync(p, "utf-8")) : "";
}
function scenarioMeta(V: Vertical, lang: Lang) {
  const L = locOf(V, lang);
  return {
    id: V.id,
    name: L.name,
    tagline: L.tagline,
    intro: L.intro,
    brandColor: V.brandColor,
    accentColor: V.accentColor,
    mode: V.mode,
    useWebSearch: V.useWebSearch,
    columns: L.columns,
    features: L.features,
    templateName: L.templateName,
    formFields: L.formFields || [],
    quickStarts: L.quickStarts || [],
    cta: L.cta || "",
    dualLabels: L.dualLabels || [],
    exampleTaskId: exampleTaskId(V.id),
  };
}

app.get("/api/platform", async (req) => {
  const lang = langOf(req.query);
  return {
    platform: PLATFORM[lang],
    lang,
    publicBase: PUBLIC_BASE,
    scenarios: SCENARIO_ORDER.map((id) => scenarioMeta(VERTICALS[id], lang)).filter(Boolean),
  };
});

app.get("/api/template", async (req, reply) => {
  const V = getScenario((req.query as any)?.scenario) || VERTICALS.consumption;
  const L = locOf(V, langOf(req.query));
  if (!L.columns?.length) return reply.code(400).send({ error: "no template" });
  const header = L.columns.map((c) => c.field).join(",");
  const exampleRow = L.columns.map((c) => c.example).join(",");
  reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${encodeURIComponent(L.templateName || "template.csv")}"`)
    .send("﻿" + header + "\n" + exampleRow + "\n");
});

app.get("/api/sample", async (req, reply) => {
  const V = getScenario((req.query as any)?.scenario) || VERTICALS.consumption;
  const L = locOf(V, langOf(req.query));
  const p = V.sampleFile ? join(__dirname, "..", "samples", V.sampleFile) : "";
  const csv = p && existsSync(p) ? readFileSync(p, "utf-8") : "";
  if (!csv) return reply.code(400).send({ error: "no sample" });
  reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${encodeURIComponent("sample_" + (L.templateName || "data.csv"))}"`)
    .send("﻿" + csv);
});

app.post("/api/analyze", async (req, reply) => {
  const V = getScenario((req.query as any)?.scenario) || VERTICALS.consumption;
  const lang = langOf(req.query);
  let dataText = "";
  try {
    const ct = String(req.headers["content-type"] || "");
    if (ct.includes("multipart/form-data")) {
      // 可能多文件：file / file1 / file2
      const parts: { field: string; filename: string; buf: Buffer }[] = [];
      const bodyFields: Record<string, string> = {};
      for await (const part of (req as any).parts()) {
        if (part.type === "file") {
          const buf = await part.toBuffer();
          parts.push({ field: part.fieldname || "file", filename: part.filename || "data.csv", buf });
        } else {
          bodyFields[part.fieldname] = String(part.value ?? "");
        }
      }
      if (V.mode === "dual_upload" && parts.length >= 2) {
        const a = bufferToDataText(parts[0].buf, parts[0].filename);
        const b = bufferToDataText(parts[1].buf, parts[1].filename);
        dataText = `【上期/文件1】\n${a}\n\n【本期/文件2】\n${b}`;
      } else if (parts.length >= 1) {
        dataText = bufferToDataText(parts[0].buf, parts[0].filename);
      } else if (bodyFields.form) {
        dataText = bodyFields.form;
      }
    } else {
      const body = (req.body || {}) as any;
      if (body.form && typeof body.form === "object") {
        dataText = Object.entries(body.form)
          .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
      } else if (typeof body.text === "string") {
        dataText = body.text;
      } else if (body.useSample) {
        if (V.mode === "dual_upload") {
          const w1 = join(__dirname, "..", "samples", "business_week1.csv");
          const w2 = join(__dirname, "..", "samples", "business_week2.csv");
          const a = existsSync(w1) ? truncateData(readFileSync(w1, "utf-8")) : "";
          const b = existsSync(w2) ? truncateData(readFileSync(w2, "utf-8")) : "";
          dataText = `【上期数据】\n${a}\n\n【本期数据】\n${b}`;
        } else if (V.mode === "form") {
          const qs = locOf(V, lang).quickStarts?.[0]?.values;
          dataText = qs
            ? Object.entries(qs).map(([k, v]) => `${k}: ${v}`).join("\n")
            : "（示例）";
        } else {
          dataText = loadSample(V);
        }
      }
    }
    if (!dataText && V.mode === "upload") dataText = loadSample(V);
  } catch (e: any) {
    return reply.code(400).send({ error: "解析失败: " + (e?.message || e) });
  }
  if (!dataText.trim()) return reply.code(400).send({ error: "没有可分析的数据，请填写表单或上传文件" });

  const job = startAnalysis(V.buildPrompt(dataText, lang), V.useWebSearch !== false);
  (job as any).scenarioId = V.id;
  (job as any).lang = lang;
  return { jobId: job.id, scenario: V.id };
});

app.get("/api/analyze/:jobId/stream", async (req, reply) => {
  const { jobId } = req.params as { jobId: string };
  const job = getJob(jobId);
  if (!job) return reply.code(404).send({ error: "not found" });
  const scenarioId = (job as any).scenarioId || "consumption";
  const lang: Lang = (job as any).lang || "zh";

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (m: any) => reply.raw.write(`data: ${JSON.stringify(m)}\n\n`);
  const cache = () => {
    if (job.report) shareCache.set(job.report.taskId, { report: job.report, scenarioId, lang });
  };
  for (const m of job.log) send(m);
  if (job.status === "done" && job.report) {
    cache();
    send({ kind: "done", report: job.report });
    return reply.raw.end();
  }
  if (job.status === "error") {
    send({ kind: "error", text: job.error });
    return reply.raw.end();
  }
  const listener = (m: any) => {
    send(m);
    if (m.kind === "done") {
      cache();
      reply.raw.end();
    }
    if (m.kind === "error") reply.raw.end();
  };
  job.subscribers.add(listener);
  const hb = setInterval(() => reply.raw.write(`: ping\n\n`), 15000);
  req.raw.on("close", () => {
    clearInterval(hb);
    job.subscribers.delete(listener);
  });
});

app.get("/api/report/:jobId", async (req, reply) => {
  const { jobId } = req.params as { jobId: string };
  const job = getJob(jobId);
  if (!job) return reply.code(404).send({ error: "not found" });
  if (job.status === "done" && job.report) {
    shareCache.set(job.report.taskId, {
      report: job.report,
      scenarioId: (job as any).scenarioId || "consumption",
      lang: (job as any).lang || "zh",
    });
    return { status: "done", report: job.report, shareUrl: `${PUBLIC_BASE}/s/${job.report.taskId}` };
  }
  return { status: job.status, error: job.error };
});

app.get("/s/:taskId", async (req, reply) => {
  const { taskId } = req.params as { taskId: string };
  const cached = shareCache.get(taskId);
  let scenarioId = cached?.scenarioId;
  if (!scenarioId) {
    for (const id of SCENARIO_ORDER) if (exampleTaskId(id) === taskId) scenarioId = id;
  }
  const V = getScenario(scenarioId || "consumption") || VERTICALS.consumption;
  const lang: Lang = cached?.lang || langOf(req.query);
  const html = await renderSharePage(taskId, V, lang, PUBLIC_BASE, cached?.report);
  reply.type("text/html").send(html);
});

const webDist = join(__dirname, "..", "..", "web", "dist");
if (existsSync(webDist)) {
  await app.register(fstatic, { root: webDist, prefix: "/" });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith("/api")) return reply.code(404).send({ error: "not found" });
    reply.type("text/html").send(readFileSync(join(webDist, "index.html"), "utf-8"));
  });
}

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`[platform] ${PLATFORM.zh.name} 已启动 http://0.0.0.0:${PORT} · 场景 ${SCENARIO_ORDER.length} 个`);
});
