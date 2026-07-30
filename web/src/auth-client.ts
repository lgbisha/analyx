// Partner SSO 前端客户端（自 fire-institute web/src/lib/auth-client.ts 移植）：
// /api/auth/me 会话查询（模块级缓存 + 订阅）与登录/退出。
// ssoEnabled=false（服务端未配置凭据）时登录入口整体不渲染，未登录一切功能照旧。
// 平台部署在域名根路径（www / xishu 双域名皆然），API 直接用绝对路径。

import { useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  nickname: string;
}

export interface AuthState {
  ready: boolean; // /api/auth/me 是否已返回（避免闪烁）
  ssoEnabled: boolean;
  user: AuthUser | null;
}

export const LOGIN_URL = "/api/auth/login";

const INITIAL: AuthState = { ready: false, ssoEnabled: false, user: null };
let cache: AuthState = INITIAL;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setCache(next: AuthState) {
  cache = next;
  listeners.forEach((fn) => fn());
}

function load(): Promise<void> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { ssoEnabled?: boolean; user?: AuthUser | null };
        setCache({
          ready: true,
          ssoEnabled: Boolean(j.ssoEnabled),
          user: j.user && typeof j.user.id === "string" ? { id: j.user.id, nickname: j.user.nickname || "InfiniSynapse" } : null,
        });
      } catch {
        // 网络/服务异常：视作 SSO 不可用，入口不渲染（不影响其他功能）
        setCache({ ready: true, ssoEnabled: false, user: null });
      }
    })();
  }
  return inflight;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    /* 网络异常也按已退出处理（cookie 未清则下次 me 会纠正） */
  }
  setCache({ ...cache, user: null });
}

/** 会话状态 hook：多组件共享同一份缓存，仅首次挂载触发一次 /api/auth/me。 */
export function useAuth(): AuthState {
  const [state, setState] = useState(cache);
  useEffect(() => {
    const fn = () => setState(cache);
    listeners.add(fn);
    load();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}
