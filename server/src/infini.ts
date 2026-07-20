// InfiniSynapse Server API 客户端：封装 SSE 订阅、任务发起、产物拉取、公开分享。
// API Key 只在服务端使用，绝不下发前端。

const BASE = process.env.INFINI_BASE || "https://app.infinisynapse.cn/api";
const KEY = process.env.INFINI_API_KEY || "";

if (!KEY) {
  console.warn("[infini] 警告：未设置 INFINI_API_KEY 环境变量");
}

function authHeaders(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${KEY}`, "x-lang": "zh_CN", ...extra };
}

export function uuid(): string {
  // 简易 UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type InfiniEvent = { event: string; data: any };

// 建立 SSE 长连接，逐帧回调。返回 AbortController 以便关闭。
export function openEvents(
  connId: string,
  onEvent: (e: InfiniEvent) => void,
  onError?: (err: any) => void
): AbortController {
  const ctrl = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${BASE}/ai/events?connId=${connId}`, {
        headers: authHeaders({ Accept: "text/event-stream" }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error("SSE 无响应体");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let ev = "message";
          const dataLines: string[] = [];
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }
          if (!dataLines.length) continue;
          const raw = dataLines.join("\n");
          let data: any = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            /* heartbeat 等非 JSON */
          }
          onEvent({ event: ev, data });
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") onError?.(err);
    }
  })();
  return ctrl;
}

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: authHeaders({ "Content-Type": "application/json", ...(init?.headers as any) }),
  });
  return res.json();
}

export async function ping(): Promise<boolean> {
  try {
    const r = await api("/ai/ping");
    return !!r?.data?.ok;
  } catch {
    return false;
  }
}

export async function newTask(text: string, connId: string, taskId?: string, useWebSearch = true): Promise<any> {
  return api("/ai/message", {
    method: "POST",
    body: JSON.stringify({
      type: "newTask",
      text,
      connId,
      ...(taskId ? { taskId } : {}),
      chatSettings: { mode: "act" },
      // 尽量开启联网（以平台账号能力为准）
      autoApprovalSettings: {
        enableWebSearch: !!useWebSearch,
        enableNotifications: true,
        enableReadImage: true,
      },
    }),
  });
}

export async function getTaskState(taskId: string): Promise<{ isRunning: boolean; found: boolean }> {
  try {
    const r = await api(`/ai_task/tasks?taskId=${taskId}`);
    const d = r?.data;
    if (!d) return { isRunning: false, found: false };
    return { isRunning: !!d.isRunning, found: true };
  } catch {
    return { isRunning: false, found: false };
  }
}

export async function getWorkspace(taskId: string): Promise<{ cwd: string; files: string[] }> {
  const r = await api(`/ai_task/getTaskWorkspace/${taskId}`);
  return r?.data || { cwd: "", files: [] };
}

export async function previewFile(taskId: string, fileName: string): Promise<{ content: string; fileType: string }> {
  const r = await api("/ai_task/previewFile", {
    method: "POST",
    body: JSON.stringify({ taskId, fileName }),
  });
  return r?.data || { content: "", fileType: "" };
}

export async function setShare(taskId: string, isPublic: boolean): Promise<boolean> {
  const r = await api("/ai_task/setShare", {
    method: "POST",
    body: JSON.stringify({ taskId, isPublic }),
  });
  return r?.code === 200;
}

// —— 公开只读（无鉴权，供分享页使用）——
async function publicApi(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-lang": "zh_CN" } });
  return res.json();
}

export async function publicTaskFileTree(taskId: string): Promise<any> {
  const r = await publicApi(`/ai_task/publicTaskFileTree/${taskId}`);
  return r?.data;
}

// 扁平化公开文件树为 { name, ext, isDir } 列表（兼容嵌套 children）
export async function publicFileList(taskId: string): Promise<Array<{ name: string; ext: string; isDir: boolean }>> {
  const tree = await publicTaskFileTree(taskId);
  const out: Array<{ name: string; ext: string; isDir: boolean }> = [];
  const walk = (nodes: any) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const name = n.key || n.title || "";
      const ext = (n.extName || (typeof name === "string" ? name.split(".").pop() : "") || "").toLowerCase();
      if (name) out.push({ name, ext, isDir: !!n.isDir });
      if (n.children) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

// 公开文件下载 URL（无需鉴权，供分享页 PDF 等直链）
export function publicDownloadUrl(taskId: string, fileName: string): string {
  return `${BASE}/ai_task/publicDownloadTaskFile/${taskId}?path=${encodeURIComponent(fileName)}`;
}

export async function publicPreviewFile(taskId: string, fileName: string): Promise<{ content: string; fileType: string }> {
  const res = await fetch(`${BASE}/ai_task/publicPreviewFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-lang": "zh_CN" },
    body: JSON.stringify({ taskId, fileName }),
  });
  const r = await res.json();
  return r?.data || { content: "", fileType: "" };
}

export async function publicTask(taskId: string): Promise<any> {
  const r = await publicApi(`/ai_task/publicTask?taskId=${taskId}`);
  return r?.data;
}
