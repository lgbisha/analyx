// Partner SSO 全链路本地 mock 实测（自 fire-institute scripts/test-sso-mock.ts 移植简化）：
// 起一个 mock InfiniSynapse 账号 API（sessions/entry/token 三端点，行为按官方指南实现：
// code 一次性、state 原样带回、统一信封 {code,message,data}），再以子进程拉起真实 server，
// 用 fetch 模拟浏览器（手动携带/校验 cookie 与 302）走完整个握手：
//   login 302 → entryUrl → 回调 code+state → 签名 cookie 会话 → me → logout，
// 并覆盖：state 篡改拒绝、code 重复兑换拒绝、会话 cookie 篡改失效，
// 以及平台特有的双域名断言：returnUrl 按请求 Host + X-Forwarded-Proto 动态构造。
// 用法：cd server && npm run test:sso

import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const MOCK_PORT = 30381;
const APP_PORT = 30380;
const ORIGIN = `http://127.0.0.1:${APP_PORT}`;
const CLIENT_ID = "partner_test_local";
const CLIENT_SECRET = "psk_test_local";

let passed = 0;
function ok(cond: boolean, name: string, extra?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
    cleanup(1);
  }
}

// ---------- mock InfiniSynapse 账号 API ----------
interface MockSession {
  state: string;
  returnUrl: string;
  code: string;
  codeUsed: boolean;
}
const sessions = new Map<string, MockSession>();
let sessionSeq = 0;
let lastSessionBody: Record<string, unknown> = {};

const mock = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${MOCK_PORT}`);
  const send = (obj: unknown, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const authed = req.headers["x-client-id"] === CLIENT_ID && req.headers["x-client-secret"] === CLIENT_SECRET;
    if (url.pathname === "/api/auth/partner/sessions" && req.method === "POST") {
      if (!authed) return send({ code: 901, message: "无效的客户端请求" });
      const b = JSON.parse(body || "{}");
      lastSessionBody = b;
      const sid = `ps_mock_${++sessionSeq}`;
      sessions.set(sid, { state: b.state || "", returnUrl: b.returnUrl || "", code: `ac_mock_${sessionSeq}`, codeUsed: false });
      return send({ code: 200, message: "success", data: { sessionId: sid, entryUrl: `http://127.0.0.1:${MOCK_PORT}/entry?session=${sid}`, expiresIn: 600 } });
    }
    if (url.pathname === "/entry" && req.method === "GET") {
      // 模拟用户在 app 域完成登录：立即 302 回 returnUrl?code&state
      const s = sessions.get(url.searchParams.get("session") || "");
      if (!s) return send({ code: 404, message: "session not found" }, 404);
      const loc = `${s.returnUrl}?code=${s.code}&state=${encodeURIComponent(s.state)}`;
      res.writeHead(302, { Location: loc });
      return res.end();
    }
    if (url.pathname === "/api/auth/partner/token" && req.method === "POST") {
      if (!authed) return send({ code: 901, message: "无效的客户端请求" });
      const b = JSON.parse(body || "{}");
      const s = [...sessions.values()].find((x) => x.code === b.code);
      if (!s || b.grant_type !== "authorization_code") return send({ code: 400, message: "无效的授权码" });
      if (s.codeUsed) return send({ code: 400, message: "授权码已被使用" });
      s.codeUsed = true;
      return send({
        code: 200,
        message: "success",
        data: {
          user: { id: "u_mock_001", email: "mock@example.com", username: "mock@example.com", nickname: "测试用户", avatar: "", phone: "" },
          sessionId: "ps_mock",
          metadata: { source: "xishu-platform" },
        },
      });
    }
    send({ code: 404, message: "not found" }, 404);
  });
});

// ---------- 拉起真实 server（tsx src/index.ts，端口与 SSO API 均指向本地） ----------
const child = spawn("npx", ["tsx", "src/index.ts"], {
  cwd: SERVER_DIR,
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    INFINI_SSO_CLIENT_ID: CLIENT_ID,
    INFINI_SSO_CLIENT_SECRET: CLIENT_SECRET,
    INFINI_SSO_API_BASE: `http://127.0.0.1:${MOCK_PORT}/api`,
    SESSION_SECRET: "test_session_secret_0123456789abcdef",
    PUBLIC_BASE: ORIGIN,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

function cleanup(codeNum: number): never {
  try {
    child.kill("SIGTERM");
  } catch { /* noop */ }
  try {
    mock.close();
  } catch { /* noop */ }
  process.exit(codeNum);
}

function getCookie(res: Response, name: string): string | null {
  for (const sc of res.headers.getSetCookie()) {
    if (sc.startsWith(`${name}=`)) return sc.split(";")[0].slice(name.length + 1);
  }
  return null;
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${ORIGIN}/api/platform`);
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error("server 未在 30s 内就绪");
  cleanup(1);
}

/** node:http 原始请求（fetch/undici 不允许覆盖 Host 头，双域名断言需要） */
function rawGet(pathName: string, headers: Record<string, string>): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: APP_PORT, path: pathName, method: "GET", headers, setHost: false },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

await new Promise<void>((r) => mock.listen(MOCK_PORT, "127.0.0.1", () => r()));
await waitReady();

console.log("[test-sso] ① /api/auth/login：创建会话 + 302 到 entryUrl + state cookie");
const login = await fetch(`${ORIGIN}/api/auth/login`, { redirect: "manual" });
ok(login.status === 302, "login 返回 302");
const entryUrl = login.headers.get("location") || "";
ok(entryUrl.startsWith(`http://127.0.0.1:${MOCK_PORT}/entry?session=ps_mock_`), "Location 指向 mock entryUrl", entryUrl);
const stateCookie = getCookie(login, "xishu_sso_state");
ok(Boolean(stateCookie), "下发签名 state cookie");
ok(lastSessionBody.returnUrl === `${ORIGIN}/api/auth/callback`, "创建会话携带正确 returnUrl（按请求 Host 构造）");
const sentState = String(lastSessionBody.state || "");
ok(/^[0-9a-f]{32}$/.test(sentState) && (stateCookie || "").startsWith(`${sentState}.`), "state 随机 32hex 且与 cookie 一致");

console.log("[test-sso] ② 双域名：Host=xishu.lgbisha.cn + X-Forwarded-Proto=https → returnUrl 跟随");
const rawLogin = await rawGet("/api/auth/login", { host: "xishu.lgbisha.cn", "x-forwarded-proto": "https" });
ok(rawLogin.status === 302, "自定义 Host 登录仍 302");
ok(lastSessionBody.returnUrl === "https://xishu.lgbisha.cn/api/auth/callback", "returnUrl 按 Host+Proto 动态构造", String(lastSessionBody.returnUrl));
const rawSetCookie = ([] as string[]).concat(rawLogin.headers["set-cookie"] || []).join("|");
ok(rawSetCookie.includes("; Secure"), "https 转发下 state cookie 带 Secure");

console.log("[test-sso] ③ entryUrl：模拟用户在 app 域完成登录，302 带 code+state 跳回");
const entry = await fetch(entryUrl, { redirect: "manual" });
ok(entry.status === 302, "entry 302 跳回 returnUrl");
const cbUrl = entry.headers.get("location") || "";
ok(cbUrl.startsWith(`${ORIGIN}/api/auth/callback?code=ac_mock_`) && cbUrl.includes(`state=${sentState}`), "回调 URL 携带 code 与原样 state");

console.log("[test-sso] ④ /api/auth/callback：state 校验 + code 换用户 + 签名会话 cookie");
const cb = await fetch(cbUrl, { redirect: "manual", headers: { cookie: `xishu_sso_state=${stateCookie}` } });
ok(cb.status === 302 && cb.headers.get("location") === "/", "回调成功后 302 回首页");
const sess = getCookie(cb, "xishu_sess");
ok(Boolean(sess), "下发签名会话 cookie xishu_sess");
ok(cb.headers.getSetCookie().some((c) => c.startsWith("xishu_sso_state=;")), "一次性 state cookie 已清除");

console.log("[test-sso] ⑤ /api/auth/me：带会话 → 用户资料；篡改 cookie → 失效");
const me = await fetch(`${ORIGIN}/api/auth/me`, { headers: { cookie: `xishu_sess=${sess}` } });
const meJson = (await me.json()) as { ssoEnabled: boolean; user: { id: string; nickname: string } | null };
ok(meJson.ssoEnabled === true, "ssoEnabled=true");
ok(meJson.user?.id === "u_mock_001" && meJson.user?.nickname === "测试用户", "me 返回用户 ID 与昵称");
const tampered = `${sess?.split(".")[0]}x.${sess?.split(".")[1]}`;
const meBad = await fetch(`${ORIGIN}/api/auth/me`, { headers: { cookie: `xishu_sess=${tampered}` } });
ok(((await meBad.json()) as { user: unknown }).user === null, "篡改会话 cookie → user=null（HMAC 校验拒绝）");

console.log("[test-sso] ⑥ 安全路径：state 篡改拒绝、code 重复兑换拒绝");
const login2 = await fetch(`${ORIGIN}/api/auth/login`, { redirect: "manual" });
const state2Cookie = getCookie(login2, "xishu_sso_state");
const entry2 = await fetch(login2.headers.get("location") || "", { redirect: "manual" });
const cbUrl2 = new URL(entry2.headers.get("location") || "");
const badState = new URL(cbUrl2);
badState.searchParams.set("state", "deadbeef".repeat(4));
const cbBadState = await fetch(badState.toString(), { redirect: "manual", headers: { cookie: `xishu_sso_state=${state2Cookie}` } });
ok(cbBadState.status === 400, "state 不匹配 → 400 拒绝");
const cbOk2 = await fetch(cbUrl2.toString(), { redirect: "manual", headers: { cookie: `xishu_sso_state=${state2Cookie}` } });
ok(cbOk2.status === 302, "正确 state 首次兑换成功");
// 同一 code 再兑换（重新带合法 state cookie 也不行：mock 端 codeUsed 拒绝）
const login3 = await fetch(`${ORIGIN}/api/auth/login`, { redirect: "manual" });
const state3Cookie = getCookie(login3, "xishu_sso_state");
const state3 = (state3Cookie || "").split(".")[0];
const reuse = new URL(cbUrl2);
reuse.searchParams.set("state", state3);
const cbReuse = await fetch(reuse.toString(), { redirect: "manual", headers: { cookie: `xishu_sso_state=${state3Cookie}` } });
ok(cbReuse.status === 400, "code 重复兑换 → 400 拒绝（一次性授权码）");

console.log("[test-sso] ⑦ /api/auth/logout：清除会话");
const lo = await fetch(`${ORIGIN}/api/auth/logout`, { method: "POST", headers: { cookie: `xishu_sess=${sess}` } });
ok(lo.ok && lo.headers.getSetCookie().some((c) => c.startsWith("xishu_sess=;")), "logout 清 cookie");

console.log("[test-sso] ⑧ SSO 关闭态：凭据缺席时 me 报 ssoEnabled:false、login 503");
const OFF_PORT = 30382;
const childOff = spawn("npx", ["tsx", "src/index.ts"], {
  cwd: SERVER_DIR,
  env: {
    ...process.env,
    PORT: String(OFF_PORT),
    INFINI_SSO_CLIENT_ID: "",
    INFINI_SSO_CLIENT_SECRET: "",
    SESSION_SECRET: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  let offReady = false;
  for (let i = 0; i < 60 && !offReady; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${OFF_PORT}/api/platform`);
      offReady = r.ok;
    } catch { /* retry */ }
    if (!offReady) await new Promise((r) => setTimeout(r, 500));
  }
  ok(offReady, "关闭态 server 就绪");
  const meOff = (await (await fetch(`http://127.0.0.1:${OFF_PORT}/api/auth/me`)).json()) as { ssoEnabled: boolean; user: unknown };
  ok(meOff.ssoEnabled === false && meOff.user === null, "凭据缺席 → ssoEnabled:false（前端隐藏入口）");
  const loginOff = await fetch(`http://127.0.0.1:${OFF_PORT}/api/auth/login`, { redirect: "manual" });
  ok(loginOff.status === 503, "凭据缺席 → login 503 不外跳");
} finally {
  try {
    childOff.kill("SIGTERM");
  } catch { /* noop */ }
}

console.log(`[test-sso] 全链路 mock 实测全部通过（${passed} 项断言）`);
cleanup(0);
