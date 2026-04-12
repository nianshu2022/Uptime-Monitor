// ── 网络增强：超时控制 + 自动重试 ──

export const API_BASE = '/api';

/**
 * 带超时的 fetch
 */
export const fetchT = (url, opts = {}, ms = 15000) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

/**
 * 自动重试封装
 */
export const withRetry = async (fn, n = 2, base = 1500) => {
    for (let i = 0; i <= n; i++) {
        try { return await fn(); }
        catch (e) { if (i === n) throw e; await new Promise(r => setTimeout(r, base * (i + 1))); }
    }
};
