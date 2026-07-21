import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { Globe } from "./Globe";

type Lang = "zh" | "en";
type Field = { field: string; desc: string; example: string };
type Feature = { title: string; desc: string };
type FormField = { key: string; label: string; placeholder?: string; required?: boolean; type?: "text" | "textarea" };
type QuickStart = { label: string; values: Record<string, string> };
type Scenario = {
  id: string; name: string; tagline: string; intro: string;
  brandColor: string; accentColor: string;
  mode?: "upload" | "form" | "dual_upload";
  useWebSearch?: boolean;
  columns: Field[]; features: Feature[]; templateName: string; exampleTaskId: string;
  formFields?: FormField[];
  quickStarts?: QuickStart[];
  cta?: string;
  dualLabels?: string[];
};
type Platform = { name: string; subname: string; tagline: string; intro: string };
type Chart = { name: string; svg: string };
type Report = { taskId: string; summary: string; charts: Chart[]; tables: any[]; pdfUrl?: string };
type View = "home" | "scenario" | "running" | "done" | "error";

const PHASES = [
  { key: "connect", zh: "连接引擎", en: "Connect" },
  { key: "ingest", zh: "数据建表", en: "Ingest" },
  { key: "compute", zh: "指标计算", en: "Compute" },
  { key: "chart", zh: "图表生成", en: "Charts" },
  { key: "report", zh: "报告汇总", en: "Report" },
];

const UI = {
  zh: {
    heroBadge: "InfiniSynapse × CSDN · 泛数据分析引擎驱动",
    start: "立即开始", about: "了解 InfiniSynapse ›",
    chooseScenario: "选择分析场景", chooseLead: "表单提问或上传数据，AI 自动生成专业分析报告（支持联网）",
    enter: "进入分析 ›", back: "返回首页", scenarioBadge: "分析场景",
    howto: "使用流程",
    step1: "选择场景并填写/上传", step1d: "表单场景直接填写；上传场景可用模板或示例数据。",
    step2: "一键生成", step2d: "引擎自动分析，必要时联网检索公开信息。",
    step3: "获取报告", step3d: "专业可视化报告，支持分享与导出。",
    dataFormat: "数据格式说明", field: "字段", desc: "说明", example: "示例",
    dlTemplate: "下载数据模板", dlSample: "下载示例数据", viewExample: "查看示例报告",
    upload: "上传数据，开始分析", trySample: "使用示例数据体验",
    formTitle: "填写信息", quickStart: "快速试用",
    privacy: "🔒 数据仅用于本次分析，不作留存",
    generating: "正在生成分析报告", generatingSub: "AI 正在分析，必要时联网检索公开信息，通常需要 1~4 分钟",
    failed: "分析未能完成", retry: "返回重试",
    copyLink: "复制分享链接", copied: "✓ 链接已复制", openShare: "打开分享页", dlPdf: "下载 PDF 报告", reanalyze: "重新分析",
    viz: "数据可视化",
    footer1: "分析能力由", footer2: "提供 · 自然语言驱动的泛数据分析平台",
    dualHint: "请分别选择上期与本期两个文件（CSV/Excel）",
  },
  en: {
    heroBadge: "Powered by InfiniSynapse × CSDN",
    start: "Get Started", about: "About InfiniSynapse ›",
    chooseScenario: "Choose a Scenario", chooseLead: "Form or upload — AI reports with optional web search",
    enter: "Analyze ›", back: "Home", scenarioBadge: "Scenario",
    howto: "How It Works",
    step1: "Fill form or upload", step1d: "Forms need no file; uploads support templates/samples.",
    step2: "Generate", step2d: "Engine analyzes; may use web search.",
    step3: "Get report", step3d: "Professional visual report with share/export.",
    dataFormat: "Data Format", field: "Field", desc: "Description", example: "Example",
    dlTemplate: "Download Template", dlSample: "Download Sample", viewExample: "View Example Report",
    upload: "Upload Data & Analyze", trySample: "Try Sample",
    formTitle: "Your inputs", quickStart: "Quick start",
    privacy: "🔒 Data is used only for this analysis and not stored",
    generating: "Generating your report", generatingSub: "AI is analyzing (web search when needed) — usually 1–4 minutes",
    failed: "Analysis failed", retry: "Back",
    copyLink: "Copy Share Link", copied: "✓ Copied", openShare: "Open Share Page", dlPdf: "Download PDF", reanalyze: "Analyze Again",
    viz: "Visualizations",
    footer1: "Analytics powered by", footer2: "· natural-language data analytics platform",
    dualHint: "Select previous-period and current-period files (CSV/Excel)",
  },
};

const ICONS: Record<string, string> = {
  consumption: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h13l-1 12H5L4 4z"/><path d="M4 4L3 2H1"/><circle cx="7" cy="20" r="1.4"/><circle cx="14" cy="20" r="1.4"/></svg>',
  health: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-5 3 10 2-7 2 2h5"/></svg>',
  finance: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
  stock: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l5-5 4 3 6-8"/><path d="M15 7h5v5"/></svg>',
  offer_compare: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/><path d="M10 12h4"/></svg>',
  city_cost: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V8l6-4 6 4v13"/><path d="M9 21v-6h6v6"/></svg>',
  worth_it: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h6M9 14h6"/></svg>',
  store_diag: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10h16l-1 10H5L4 10z"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
  content_audit: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>',
  weekly_compare: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V9M10 19v-6M16 19V5M22 19H2"/></svg>',
  travel_cost: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18"/><path d="M5 12V7h4l2 3h8v2H5z"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>',
  restaurant: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v8M6 3v5a2 2 0 004 0V3M16 3v18M14 3h4"/></svg>',
  seasonal_food: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21c4-3 7-6 7-10a7 7 0 10-14 0c0 4 3 7 7 10z"/><path d="M12 11v4"/></svg>',
  workout: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></svg>',
};

export function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "en" || q === "zh") return q;
    return (localStorage.getItem("lang") as Lang) || "zh";
  });
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [publicBase, setPublicBase] = useState("");
  const [view, setView] = useState<View>("home");
  const [scId, setScId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ text: string; phase?: string }[]>([]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [statusText, setStatusText] = useState("正在连接分析引擎");
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const t = UI[lang];
  const sc = scenarios.find((s) => s.id === scId) || null;
  const mode = sc?.mode || "upload";

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    fetch(`/api/platform?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        setPlatform(d.platform);
        setScenarios(d.scenarios);
        setPublicBase(d.publicBase);
        document.title = `${d.platform.name} · ${d.platform.subname}`;
        const hashId = window.location.hash.replace(/^#/, "");
        if (hashId && d.scenarios.some((x: Scenario) => x.id === hashId)) {
          setScId(hashId);
          const sx = d.scenarios.find((x: Scenario) => x.id === hashId);
          if (sx) applyTheme(sx);
          if (view === "home") setView("scenario");
        }
      });
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    // no-op: keep logEndRef for potential future use
  }, [statusText]);

  function applyTheme(s: Scenario) {
    document.documentElement.style.setProperty("--brand", s.brandColor);
    document.documentElement.style.setProperty("--accent", s.accentColor);
  }
  function toggleLang() {
    const nl: Lang = lang === "zh" ? "en" : "zh";
    setLang(nl);
    localStorage.setItem("lang", nl);
  }
  function openScenario(s: Scenario) {
    setScId(s.id);
    setView("scenario");
    applyTheme(s);
    setFormValues(s.quickStarts?.[0]?.values || {});
    window.location.hash = s.id;
    window.scrollTo({ top: 0 });
  }
  function goHome() {
    esRef.current?.close();
    setView("home");
    setReport(null);
    setLogs([]);
    setScId(null);
    document.documentElement.style.setProperty("--brand", "#2f6fed");
    document.documentElement.style.setProperty("--accent", "#12b76a");
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0 });
  }

  async function start(formData: FormData | null, opts?: { useSample?: boolean; form?: Record<string, string> }) {
    if (!sc) return;
    setView("running"); setLogs([]); setPhaseIdx(0); setStatusText("正在连接分析引擎"); setReport(null); setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      let res: Response;
      if (formData) {
        res = await fetch(`/api/analyze?scenario=${sc.id}&lang=${lang}`, { method: "POST", body: formData });
      } else if (opts?.form) {
        res = await fetch(`/api/analyze?scenario=${sc.id}&lang=${lang}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: opts.form }),
        });
      } else {
        res = await fetch(`/api/analyze?scenario=${sc.id}&lang=${lang}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useSample: true }),
        });
      }
      const data = await res.json();
      if (!res.ok || !data.jobId) throw new Error(data.error || "failed");
      listen(data.jobId);
    } catch (e: any) { setErr(e?.message || String(e)); setView("error"); }
  }

  function listen(jobId: string) {
    esRef.current?.close();
    const es = new EventSource(`/api/analyze/${jobId}/stream`);
    esRef.current = es;
    es.onmessage = (ev) => {
      let m: any; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.kind === "status") {
        if (m.text) setStatusText(m.text);
        if (m.phase) {
          const idx = PHASES.findIndex((p) => p.key === m.phase);
          if (idx >= 0) setPhaseIdx((c) => Math.max(c, idx));
        }
      } else if (m.kind === "done") { setReport(m.report); setPhaseIdx(PHASES.length); setStatusText("分析完成"); setView("done"); es.close(); }
      else if (m.kind === "error") { setErr(m.text || "failed"); setView("error"); es.close(); }
    };
    es.onerror = () => setView((v) => (v === "running" ? "error" : v));
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    start(fd);
  }

  function submitForm() {
    if (!sc?.formFields) return;
    for (const f of sc.formFields) {
      if (f.required && !String(formValues[f.key] || "").trim()) {
        setErr(`${f.label} 为必填`);
        setView("error");
        return;
      }
    }
    start(null, { form: formValues });
  }

  function submitDual() {
    const f1 = fileRef.current?.files?.[0];
    const f2 = file2Ref.current?.files?.[0];
    if (!f1 || !f2) {
      setErr(t.dualHint);
      setView("error");
      return;
    }
    const fd = new FormData();
    fd.append("file", f1);
    fd.append("file2", f2);
    start(fd);
  }

  const shareUrl = sc && report ? `${publicBase}/s/${report.taskId}` : "";
  function copyShare() {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  const phaseLabel = (key?: string) => { const p = PHASES.find((x) => x.key === key); return p ? p[lang] : (lang === "en" ? "Analyzing" : "分析"); };

  if (!platform) return <div className="loading">…</div>;

  return (
    <div className={`app ${view === "home" ? "home-mode" : ""}`}>
      <nav className="nav">
        <div className="wrap navwrap">
          <div className="brand" onClick={goHome}>
            <span className="logo">析</span>
            <b>{platform.name}</b>
            <span className="subname">{platform.subname}</span>
          </div>
          <div className="nav-right">
            {view !== "home" && <button className="nav-back" onClick={goHome}>{t.back}</button>}
            <button className="lang-seg" onClick={toggleLang} aria-label="Language" title="中文 / English">
              <span className={lang === "zh" ? "on" : ""}>中</span>
              <span className={lang === "en" ? "on" : ""}>EN</span>
            </button>
          </div>
        </div>
      </nav>

      {view === "home" && (
        <>
          <header className="hero-fs">
            <div className="th-bg" />
            <div className="th-aurora" />
            <div className="th-globe"><Globe size={420} /></div>
            <div className="hero-inner">
              <span className="th-badge">{t.heroBadge}</span>
              <h1 className="hero-title">{platform.name}</h1>
              <p className="hero-sub">{platform.subname}</p>
              <p className="hero-tag">{platform.tagline}</p>
              <div className="hero-cta-row">
                <button className="btn-pill" onClick={() => document.getElementById("scenarios")?.scrollIntoView({ behavior: "smooth" })}>{t.start}</button>
                <a className="btn-text" href="https://infinisynapse.cn" target="_blank" rel="noreferrer">{t.about}</a>
              </div>
            </div>
            <div className="scroll-hint">↓</div>
          </header>

          <section className="section section-gray" id="scenarios">
            <div className="wrap">
              <h2 className="section-h">{t.chooseScenario}</h2>
              <p className="section-lead">{t.chooseLead}</p>
              <div className="tiles">
                {scenarios.map((s, i) => (
                  <button className="tile" key={s.id} onClick={() => openScenario(s)} style={{ ["--c" as any]: s.brandColor, animationDelay: `${i * 0.1}s` }}>
                    <span className="tile-icon" dangerouslySetInnerHTML={{ __html: ICONS[s.id] || "" }} />
                    <h3>{s.name}</h3>
                    <p>{s.tagline}</p>
                    <span className="tile-go">{t.enter}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <footer className="foot">
            {t.footer1} <a href="https://infinisynapse.cn" target="_blank" rel="noreferrer">InfiniSynapse</a> {t.footer2}
          </footer>
        </>
      )}

      {view === "scenario" && sc && (
        <>
          <header className="subhero" style={{ ["--c" as any]: sc.brandColor }}>
            <div className="subhero-inner">
              <span className="th-badge light">{t.scenarioBadge}</span>
              <h1 className="subhero-title">{sc.name}</h1>
              <p className="subhero-tag">{sc.tagline}</p>
            </div>
          </header>

          <div className="wrap" style={{ ["--c" as any]: sc.brandColor }}>
            <section className="block">
              <p className="lead">{sc.intro}</p>
              <div className="features">
                {sc.features.map((f, i) => (
                  <div className="feature" key={i}><div className="feat-dot" /><div><h4>{f.title}</h4><p>{f.desc}</p></div></div>
                ))}
              </div>
            </section>

            <section className="block">
              <h2 className="block-h">{t.howto}</h2>
              <div className="steps">
                <div className="step"><span className="num">1</span><div><b>{t.step1}</b><p>{t.step1d}</p></div></div>
                <div className="step"><span className="num">2</span><div><b>{t.step2}</b><p>{t.step2d}</p></div></div>
                <div className="step"><span className="num">3</span><div><b>{t.step3}</b><p>{t.step3d}</p></div></div>
              </div>
            </section>

            {mode === "form" && sc.formFields && (
              <section className="block">
                <h2 className="block-h">{t.formTitle}</h2>
                {!!sc.quickStarts?.length && (
                  <div className="quick-row">
                    <span className="quick-label">{t.quickStart}</span>
                    {sc.quickStarts.map((q) => (
                      <button key={q.label} type="button" className="chip" onClick={() => setFormValues({ ...q.values })}>{q.label}</button>
                    ))}
                  </div>
                )}
                <div className="form-grid">
                  {sc.formFields.map((f) => (
                    <label key={f.key} className={`form-field ${f.type === "textarea" ? "full" : ""}`}>
                      <span>{f.label}{f.required ? " *" : ""}</span>
                      {f.type === "textarea" ? (
                        <textarea
                          value={formValues[f.key] || ""}
                          placeholder={f.placeholder}
                          rows={4}
                          onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          value={formValues[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="cta-block" style={{ border: "none", paddingTop: 20 }}>
                  <button className="btn-pill lg" onClick={submitForm}>{sc.cta || t.upload}</button>
                  {!!sc.quickStarts?.length && (
                    <button className="btn-outline lg" onClick={() => start(null, { form: sc.quickStarts![0].values })}>{t.trySample}</button>
                  )}
                  <p className="privacy">{t.privacy}</p>
                </div>
              </section>
            )}

            {mode === "dual_upload" && (
              <section className="block">
                <h2 className="block-h">{t.upload}</h2>
                <p className="sub">{t.dualHint}</p>
                <div className="dual-row">
                  <label className="file-card">
                    <b>{sc.dualLabels?.[0] || "上期"}</b>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" />
                  </label>
                  <label className="file-card">
                    <b>{sc.dualLabels?.[1] || "本期"}</b>
                    <input ref={file2Ref} type="file" accept=".csv,.xlsx,.xls" />
                  </label>
                </div>
                <div className="dl-row" style={{ marginTop: 16 }}>
                  {sc.templateName && <a className="link-btn" href={`/api/template?scenario=${sc.id}&lang=${lang}`}>{t.dlTemplate}</a>}
                  <a className="link-btn" href="#" onClick={(e) => { e.preventDefault(); start(null, { useSample: true }); }}>{t.trySample}</a>
                  {sc.exampleTaskId && <a className="link-btn" href={`${publicBase}/s/${sc.exampleTaskId}`} target="_blank" rel="noreferrer">{t.viewExample}</a>}
                </div>
                <div className="cta-block" style={{ border: "none", paddingTop: 20 }}>
                  <button className="btn-pill lg" onClick={submitDual}>{sc.cta || t.upload}</button>
                  <p className="privacy">{t.privacy}</p>
                </div>
              </section>
            )}

            {mode === "upload" && (
              <>
                <section className="block">
                  <h2 className="block-h">{t.dataFormat}</h2>
                  <div className="table-wrap">
                    <table className="spec">
                      <thead><tr><th>{t.field}</th><th>{t.desc}</th><th>{t.example}</th></tr></thead>
                      <tbody>
                        {sc.columns.map((c, i) => (
                          <tr key={i}><td className="mono">{c.field}</td><td>{c.desc}</td><td className="mono muted">{c.example}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="dl-row">
                    <a className="link-btn" href={`/api/template?scenario=${sc.id}&lang=${lang}`}>{t.dlTemplate}</a>
                    <a className="link-btn" href={`/api/sample?scenario=${sc.id}&lang=${lang}`}>{t.dlSample}</a>
                    {sc.exampleTaskId && <a className="link-btn" href={`${publicBase}/s/${sc.exampleTaskId}`} target="_blank" rel="noreferrer">{t.viewExample}</a>}
                  </div>
                </section>
                <section className="block cta-block">
                  <button className="btn-pill lg" onClick={() => fileRef.current?.click()}>{t.upload}</button>
                  <button className="btn-outline lg" onClick={() => start(null, { useSample: true })}>{t.trySample}</button>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={onPickFile} />
                  <p className="privacy">{t.privacy}</p>
                </section>
              </>
            )}
          </div>
        </>
      )}

      {view === "running" && (
        <div className="wrap">
          <section className="block running">
            <h2 className="block-h center">{t.generating}</h2>
            <p className="sub center">{t.generatingSub}</p>
            <div className="stepper">
              {PHASES.map((p, i) => (
                <div className={`pstep ${i < phaseIdx ? "done" : ""} ${i === phaseIdx ? "active" : ""}`} key={p.key}>
                  <span className="dot">{i < phaseIdx ? "✓" : i + 1}</span>
                  <span className="plabel">{p[lang]}</span>
                </div>
              ))}
            </div>
            <div className="status-card">
              <div className="status-spinner" />
              <div className="status-text">{statusText}</div>
              <div className="status-hint">系统正在处理中，请稍候，通常需要 1～4 分钟</div>
            </div>
          </section>
        </div>
      )}

      {view === "error" && (
        <div className="wrap">
          <section className="block error center">
            <h2 className="block-h">{t.failed}</h2>
            <p className="sub">{err}</p>
            <button className="btn-pill" onClick={() => setView("scenario")}>{t.retry}</button>
          </section>
        </div>
      )}

      {view === "done" && report && (
        <div className="wrap">
          <div className="share-bar">
            <button className="btn-pill" onClick={copyShare}>{copied ? t.copied : t.copyLink}</button>
            <a className="btn-outline" href={shareUrl} target="_blank" rel="noreferrer">{t.openShare}</a>
            {report.pdfUrl && <a className="btn-outline" href={report.pdfUrl} target="_blank" rel="noreferrer">{t.dlPdf}</a>}
            <button className="btn-outline" onClick={() => setView("scenario")}>{t.reanalyze}</button>
          </div>
          {report.charts.length > 0 && (
            <section className="block">
              <h2 className="block-h">{t.viz}</h2>
              <div className="charts">
                {report.charts.map((c, i) => (
                  <div className="chart" key={i}><h4>{c.name}</h4><div className="svgbox" dangerouslySetInnerHTML={{ __html: c.svg }} /></div>
                ))}
              </div>
            </section>
          )}
          {report.summary && <section className="block report-md" dangerouslySetInnerHTML={{ __html: marked.parse(report.summary) as string }} />}
        </div>
      )}
    </div>
  );
}
