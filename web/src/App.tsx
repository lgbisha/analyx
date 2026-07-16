import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { Globe } from "./Globe";

type Lang = "zh" | "en";
type Field = { field: string; desc: string; example: string };
type Feature = { title: string; desc: string };
type Scenario = {
  id: string; name: string; tagline: string; intro: string;
  brandColor: string; accentColor: string;
  columns: Field[]; features: Feature[]; templateName: string; exampleTaskId: string;
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
    chooseScenario: "选择分析场景", chooseLead: "上传你的数据，AI 自动生成专业分析报告",
    enter: "进入分析 ›", back: "返回首页", scenarioBadge: "分析场景",
    howto: "使用流程",
    step1: "准备数据", step1d: "下载模板按字段整理，或直接使用示例数据体验。",
    step2: "上传文件", step2d: "支持 CSV、Excel，数据仅用于本次分析。",
    step3: "获取报告", step3d: "自动生成专业可视化报告，支持分享与导出。",
    dataFormat: "数据格式说明", field: "字段", desc: "说明", example: "示例",
    dlTemplate: "下载数据模板", dlSample: "下载示例数据", viewExample: "查看示例报告",
    upload: "上传数据，开始分析", trySample: "使用示例数据体验",
    privacy: "🔒 数据仅用于本次分析，不作留存",
    generating: "正在生成分析报告", generatingSub: "AI 正在自动完成建表、指标计算与图表生成，通常需要 1~4 分钟",
    failed: "分析未能完成", retry: "返回重试",
    copyLink: "复制分享链接", copied: "✓ 链接已复制", openShare: "打开分享页", dlPdf: "下载 PDF 报告", reanalyze: "重新分析",
    viz: "数据可视化",
    footer1: "分析能力由", footer2: "提供 · 自然语言驱动的泛数据分析平台",
  },
  en: {
    heroBadge: "Powered by InfiniSynapse × CSDN",
    start: "Get Started", about: "About InfiniSynapse ›",
    chooseScenario: "Choose a Scenario", chooseLead: "Upload your data, AI generates a professional report",
    enter: "Analyze ›", back: "Home", scenarioBadge: "Scenario",
    howto: "How It Works",
    step1: "Prepare Data", step1d: "Download the template, or try with sample data.",
    step2: "Upload File", step2d: "CSV or Excel. Data is used only for this analysis.",
    step3: "Get Report", step3d: "A professional visual report with sharing and export.",
    dataFormat: "Data Format", field: "Field", desc: "Description", example: "Example",
    dlTemplate: "Download Template", dlSample: "Download Sample", viewExample: "View Example Report",
    upload: "Upload Data & Analyze", trySample: "Try Sample Data",
    privacy: "🔒 Data is used only for this analysis and not stored",
    generating: "Generating your report", generatingSub: "AI is building tables, computing metrics and generating charts — usually 1–4 minutes",
    failed: "Analysis failed", retry: "Back",
    copyLink: "Copy Share Link", copied: "✓ Copied", openShare: "Open Share Page", dlPdf: "Download PDF", reanalyze: "Analyze Again",
    viz: "Visualizations",
    footer1: "Analytics powered by", footer2: "· natural-language data analytics platform",
  },
};

const ICONS: Record<string, string> = {
  consumption: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h13l-1 12H5L4 4z"/><path d="M4 4L3 2H1"/><circle cx="7" cy="20" r="1.4"/><circle cx="14" cy="20" r="1.4"/></svg>',
  health: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-5 3 10 2-7 2 2h5"/></svg>',
  finance: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
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
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const t = UI[lang];
  const sc = scenarios.find((s) => s.id === scId) || null;

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

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

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

  async function start(formData: FormData | null) {
    if (!sc) return;
    setView("running"); setLogs([]); setPhaseIdx(0); setReport(null); setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch(`/api/analyze?scenario=${sc.id}&lang=${lang}`, {
        method: "POST",
        ...(formData ? { body: formData } : { headers: { "Content-Type": "application/json" }, body: "{}" }),
      });
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
        if (m.text) setLogs((L) => [...L.slice(-60), { text: m.text, phase: m.phase }]);
        if (m.phase) { const idx = PHASES.findIndex((p) => p.key === m.phase); if (idx >= 0) setPhaseIdx((c) => Math.max(c, idx)); }
      } else if (m.kind === "done") { setReport(m.report); setPhaseIdx(PHASES.length); setView("done"); es.close(); }
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
              <button className="btn-outline lg" onClick={() => start(null)}>{t.trySample}</button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={onPickFile} />
              <p className="privacy">{t.privacy}</p>
            </section>
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
            <div className="console">
              {logs.map((l, i) => (
                <div key={i} className="cline"><span className="cph">{phaseLabel(l.phase)}</span><span className="ctext">{l.text}</span></div>
              ))}
              <div ref={logEndRef} />
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
