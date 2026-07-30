// Partner SSO ·「使用 InfiniSynapse 登录」（自 fire-institute server/src/auth.ts 移植改造）。
// 官方接入指南：https://infinisynapse.cn/zh/docs/InfiniSynapse%20Partner%20SSO%20Integration%20Guide
// 授权码模式，服务端全程只需 2 个 HTTP 请求：
//   ① POST {SSO_API}/auth/partner/sessions（X-Client-Id/X-Client-Secret）→ entryUrl，302 带用户过去；
//   ② 用户在 app.infinisynapse.cn 完成登录后跳回 returnUrl?code&state → POST {SSO_API}/auth/partner/token
//      用一次性 code（5 分钟、只能兑换一次）换用户资料（id/nickname/...）。
// 会话：HMAC-SHA256 签名 cookie，无数据库、无状态（密钥 SESSION_SECRET 存 server/.env）。
// state 防 CSRF：随机值签名后写短时 cookie，回调时比对。
// 平台侧适配：
//   - 双域名（www.lgbisha.cn / xishu.lgbisha.cn）并行 → returnUrl 按请求 Host 动态构造
//     （复用 index.ts 的 baseOf 先例，由 registerAuth 注入），cookie 各域名独立会话即可；
//   - 平台是生产系统，登录不解锁新限制：登录后仅导航显昵称 + 分析调用日志归因 + 报告页免注册引导。
// 凭据未配置（INFINI_SSO_CLIENT_ID/SECRET 缺失）时：/api/auth/me 返回 ssoEnabled:false，
// 前端隐藏登录入口，未登录一切功能照旧——SSO 缺席不影响任何既有能力。

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// SSO 接口在账号 API 域（api.infinisynapse.cn），与任务 API（app.infinisynapse.cn）不同域
const SSO_API = (process.env.INFINI_SSO_API_BASE || "https://api.infinisynapse.cn/api").replace(/\/$/, "");
const CLIENT_ID = process.env.INFINI_SSO_CLIENT_ID || "";
const CLIENT_SECRET = process.env.INFINI_SSO_CLIENT_SECRET || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 7 * 24 * 3600 * 1000); // 7 天

const SESS_COOKIE = "xishu_sess";
const STATE_COOKIE = "xishu_sso_state";

export function ssoEnabled(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && SESSION_SECRET);
}

// ---------- HMAC 签名 cookie（无状态会话） ----------

function hmac(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export interface SessionUser {
  uid: string; // InfiniSynapse 用户 ID（稳定唯一，文档建议的绑定键）
  nick: string;
}

interface SessionPayload extends SessionUser {
  exp: number; // 过期时间戳（ms）
}

function encodeSession(p: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  return `${body}.${hmac(body)}`;
}

function decodeSession(value: string): SessionUser | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(sig) || !safeEqual(hmac(body), sig)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!p || typeof p.uid !== "string" || !p.uid || typeof p.exp !== "number") return null;
    if (Date.now() > p.exp) return null;
    return { uid: p.uid, nick: typeof p.nick === "string" ? p.nick : "" };
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

/** 供 /api/analyze 读取登录态（用户级调用归因日志用）；未登录/签名不合法/过期均返回 null。 */
export function getSessionUser(req: FastifyRequest): SessionUser | null {
  if (!ssoEnabled()) return null;
  const raw = parseCookies(req.headers.cookie)[SESS_COOKIE];
  return raw ? decodeSession(raw) : null;
}

function cookieAttrs(req: FastifyRequest, maxAgeSec: number): string {
  // 平台未开 trustProxy，直接看 nginx 转发的 X-Forwarded-Proto；本地 http 调试时不加 Secure
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = proto === "https" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Lax${secure}`;
}

// ---------- 出错兜底页（浏览器顶层导航到这些端点，回 HTML 而非裸 JSON；双语） ----------

const FAIL_REASONS = {
  state: {
    zh: "登录回调校验未通过（可能是链接过期或被伪造）。",
    en: "Login callback validation failed (the link may have expired or been tampered with).",
  },
  exchange: {
    zh: "授权码兑换失败（可能已过期或已使用过，授权码 5 分钟内有效且只能用一次）。",
    en: "Authorization code exchange failed (codes are single-use and valid for 5 minutes).",
  },
  session: {
    zh: "创建登录会话失败，InfiniSynapse 登录服务暂时不可用。",
    en: "Failed to create a login session; the InfiniSynapse sign-in service is temporarily unavailable.",
  },
} as const;

function failPage(reason: keyof typeof FAIL_REASONS): string {
  const r = FAIL_REASONS[reason];
  return [
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"/>`,
    `<meta name="viewport" content="width=device-width,initial-scale=1"/>`,
    `<title>登录未完成 · 析数·智能数据分析平台</title>`,
    `<body style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:560px;margin:15vh auto;padding:0 24px;color:#1d1d1f">`,
    `<h2 style="font-weight:700">登录未完成 / Sign-in not completed</h2>`,
    `<p style="color:#6e6e73;line-height:1.7">${r.zh}<br/>这不影响使用——平台所有分析功能无需登录也完全可用。</p>`,
    `<p style="color:#86868b;line-height:1.6;font-size:14px">${r.en} All analysis features remain fully available without signing in.</p>`,
    `<p><a href="/api/auth/login" style="color:#2f6fed">重新登录 / Retry</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="/" style="color:#1d1d1f">返回首页 / Home</a></p>`,
    `</body></html>`,
  ].join("");
}

// ---------- 路由 ----------

/**
 * baseOf 由 index.ts 注入：按请求 Host + X-Forwarded-Proto 动态构造对外地址，
 * 保证 www.lgbisha.cn / xishu.lgbisha.cn 双域名各自回调到自己（回调白名单两个域名都要登记）。
 */
export function registerAuth(app: FastifyInstance, baseOf: (req: FastifyRequest) => string) {
  // ① 发起登录：创建 Partner 会话 → 302 到 entryUrl（服务端请求 1/2）
  app.get("/api/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!ssoEnabled()) {
      return reply.code(503).send({ reason: "sso not configured" });
    }
    const origin = baseOf(req);
    const state = randomBytes(16).toString("hex");
    try {
      const resp = await fetch(`${SSO_API}/auth/partner/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": CLIENT_ID,
          "X-Client-Secret": CLIENT_SECRET,
        },
        body: JSON.stringify({
          returnUrl: `${origin}/api/auth/callback`,
          cancelUrl: `${origin}/`,
          state,
          metadata: { source: "xishu-platform" },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await resp.json()) as { code?: number; message?: string; data?: { entryUrl?: string } };
      if (json.code !== 200 || !json.data?.entryUrl) {
        console.warn(`[sso] create session failed code=${json.code} msg=${json.message}`);
        return reply.code(502).type("text/html; charset=utf-8").send(failPage("session"));
      }
      // state 防 CSRF：签名后写短时 cookie（10 分钟，与会话有效期一致）
      reply.header("set-cookie", `${STATE_COOKIE}=${state}.${hmac(state)}; ${cookieAttrs(req, 600)}`);
      return reply.redirect(json.data.entryUrl, 302);
    } catch (err: any) {
      console.warn(`[sso] create session error: ${err?.message || err}`);
      return reply.code(502).type("text/html; charset=utf-8").send(failPage("session"));
    }
  });

  // ② 登录回调：校验 state → code 换用户资料（服务端请求 2/2）→ 签名 cookie 会话
  app.get("/api/auth/callback", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!ssoEnabled()) {
      return reply.code(503).send({ reason: "sso not configured" });
    }
    const q = (req.query ?? {}) as { code?: string; state?: string };
    const code = typeof q.code === "string" ? q.code : "";
    const state = typeof q.state === "string" ? q.state : "";
    const stateCookie = parseCookies(req.headers.cookie)[STATE_COOKIE] || "";
    // 无论成败都清掉一次性 state cookie
    const clearState = `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;

    const expected = state ? `${state}.${hmac(state)}` : "";
    if (!code || !state || !stateCookie || !safeEqual(stateCookie, expected)) {
      return reply
        .header("set-cookie", clearState)
        .code(400)
        .type("text/html; charset=utf-8")
        .send(failPage("state"));
    }

    try {
      const resp = await fetch(`${SSO_API}/auth/partner/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": CLIENT_ID,
          "X-Client-Secret": CLIENT_SECRET,
        },
        body: JSON.stringify({ code, grant_type: "authorization_code" }),
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await resp.json()) as {
        code?: number;
        message?: string;
        data?: { user?: { id?: string; nickname?: string; username?: string; email?: string } };
      };
      const u = json.data?.user;
      if (json.code !== 200 || !u?.id) {
        console.warn(`[sso] token exchange failed code=${json.code} msg=${json.message}`);
        return reply
          .header("set-cookie", clearState)
          .code(400)
          .type("text/html; charset=utf-8")
          .send(failPage("exchange"));
      }
      // 绑定键用 user.id（文档：昵称/邮箱可变，ID 稳定）；昵称做空值兜底
      const nick = (u.nickname || u.username || u.email || "InfiniSynapse 用户").slice(0, 40);
      const sess = encodeSession({ uid: u.id, nick, exp: Date.now() + SESSION_TTL_MS });
      console.log(`[sso] login completed uid=${u.id} host=${String(req.headers.host || "")}`);
      return reply
        .header("set-cookie", [
          clearState,
          `${SESS_COOKIE}=${sess}; ${cookieAttrs(req, Math.floor(SESSION_TTL_MS / 1000))}`,
        ])
        .redirect("/", 302);
    } catch (err: any) {
      console.warn(`[sso] token exchange error: ${err?.message || err}`);
      return reply
        .header("set-cookie", clearState)
        .code(502)
        .type("text/html; charset=utf-8")
        .send(failPage("exchange"));
    }
  });

  // 会话查询：前端据 ssoEnabled 决定是否渲染登录入口（凭据未配置时按钮不出现）
  app.get("/api/auth/me", async (req: FastifyRequest) => {
    const user = getSessionUser(req);
    return {
      ssoEnabled: ssoEnabled(),
      user: user ? { id: user.uid, nickname: user.nick } : null,
    };
  });

  app.post("/api/auth/logout", async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.header("set-cookie", `${SESS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    return { ok: true };
  });
}
