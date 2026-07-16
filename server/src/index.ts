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
    columns: L.columns,
    features: L.features,
    templateName: L.templateName,
    exampleTaskId: exampleTaskId(V.id),
  };
}

app.get("/api/platform", async (req) => {
  const lang = langOf(req.query);
  return {
    platform: PLATFORM[lang],
    lang,
    publicBase: PUBLIC_BASE,
    scenarios: SCENARIO_ORDER.map((id) => scenarioMeta(VERTICALS[id], lang)),
  };
});

app.get("/api/template", async (req, reply) => {
  const V = getScenario((req.query as any)?.scenario) || VERTICALS.consumption;
  const L = locOf(V, langOf(req.query));
  const header = L.columns.map((c) => c.field).join(",");
  const exampleRow = L.columns.map((c) => c.example).join(",");
  reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${encodeURIComponent(L.templateName)}"`)
    .send("﻿" + header + "\n" + exampleRow + "\n");
});

app.get("/api/sample", async (req, reply) => {
  const V = getScenario((req.query as any)?.scenario) || VERTICALS.consumption;
  const L = locOf(V, langOf(req.query));
  const p = join(__dirname, "..", "samples", V.sampleFile);
  const csv = existsSync(p) ? readFileSync(p, "utf-8") : "";
  reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${encodeURIComponent("sample_" + L.templateName)}"`)
    .send("﻿" + csv);
});

app.post("/api/analyze", async (req, reply) => {
  const V = getScenario((req.query as any)?.scenario) || VERTICALS.consumption;
  const lang = langOf(req.query);
  let dataText = "";
  try {
    const ct = req.headers["content-type"] || "";
    if (ct.includes("multipart/form-data")) {
      const file = await (req as any).file();
      if (file) dataText = bufferToDataText(await file.toBuffer(), file.filename || "data.csv");
    }
    if (!dataText) dataText = loadSample(V);
  } catch (e: any) {
    return reply.code(400).send({ error: "File parse failed: " + (e?.message || e) });
  }
  if (!dataText.trim()) return reply.code(400).send({ error: "No data to analyze" });

  const job = startAnalysis(V.buildPrompt(dataText, lang));
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
  const cache = () => { if (job.report) shareCache.set(job.report.taskId, { report: job.report, scenarioId, lang }); };
  for (const m of job.log) send(m);
  if (job.status === "done" && job.report) { cache(); send({ kind: "done", report: job.report }); return reply.raw.end(); }
  if (job.status === "error") { send({ kind: "error", text: job.error }); return reply.raw.end(); }
  const listener = (m: any) => {
    send(m);
    if (m.kind === "done") { cache(); reply.raw.end(); }
    if (m.kind === "error") reply.raw.end();
  };
  job.subscribers.add(listener);
  const hb = setInterval(() => reply.raw.write(`: ping\n\n`), 15000);
  req.raw.on("close", () => { clearInterval(hb); job.subscribers.delete(listener); });
});

app.get("/api/report/:jobId", async (req, reply) => {
  const { jobId } = req.params as { jobId: string };
  const job = getJob(jobId);
  if (!job) return reply.code(404).send({ error: "not found" });
  if (job.status === "done" && job.report) {
    shareCache.set(job.report.taskId, { report: job.report, scenarioId: (job as any).scenarioId || "consumption", lang: (job as any).lang || "zh" });
    return { status: "done", report: job.report, shareUrl: `${PUBLIC_BASE}/s/${job.report.taskId}` };
  }
  return { status: job.status, error: job.error };
});

app.get("/s/:taskId", async (req, reply) => {
  const { taskId } = req.params as { taskId: string };
  const cached = shareCache.get(taskId);
  let scenarioId = cached?.scenarioId;
  if (!scenarioId) for (const id of SCENARIO_ORDER) if (exampleTaskId(id) === taskId) scenarioId = id;
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
  console.log(`[platform] ${PLATFORM.zh.name} 已启动 http://0.0.0.0:${PORT}`);
});
