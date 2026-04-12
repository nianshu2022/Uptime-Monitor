<template>
  <div class="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 grid-bg">
    <StatusHeader :loading="loading" :isDark="isDark" :siteSettings="siteSettings" @toggle-theme="toggleTheme" />

    <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-12">
      <!-- 英雄状态区 -->
      <HeroBanner v-if="monitors.length > 0" :monitors="monitors" :activeMonitors="activeMonitors"
        :allUp="allUp" :hasRetrying="hasRetrying" :hasDown="hasDown" :avgLatency="avgLatency" :error="error"
        @retry="fetchMonitors" />

      <!-- 加载占位 -->
      <div v-if="loading && monitors.length === 0" class="space-y-3 fade-up-d2">
        <div v-for="i in 4" :key="i" class="glass rounded-2xl h-20 animate-pulse"></div>
      </div>

      <!-- 无监控项 -->
      <div v-else-if="!loading && monitors.length === 0" class="text-center py-24 glass rounded-3xl border border-dashed border-slate-200 dark:border-white/[0.06] fade-up-d2">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/>
          </svg>
        </div>
        <p class="text-slate-400 dark:text-slate-600 font-mono text-sm tracking-widest">NO MONITORS CONFIGURED</p>
      </div>

      <!-- 事件公告 -->
      <div v-if="incidents.length > 0" class="mb-6 space-y-2 fade-up">
        <div v-for="inc in incidents" :key="inc.id"
          class="rounded-2xl px-5 py-4 border flex items-start gap-4"
          :class="{
            'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/20': inc.severity === 'critical',
            'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-500/20': inc.severity === 'warning',
            'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20': inc.severity === 'info'
          }">
          <i class="fas text-lg mt-0.5" :class="{
            'fa-exclamation-circle text-red-500': inc.severity === 'critical',
            'fa-exclamation-triangle text-yellow-500': inc.severity === 'warning',
            'fa-info-circle text-blue-500': inc.severity === 'info'
          }"></i>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm text-slate-900 dark:text-white">{{ inc.title }}</p>
            <p v-if="inc.description" class="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{{ inc.description }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{{ formatDate(inc.created_at) }}</p>
          </div>
        </div>
      </div>

      <!-- 监控列表 -->
      <div v-if="monitors.length > 0" class="fade-up-d1">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="w-1 h-5 rounded-full bg-emerald-500"></div>
            <h2 class="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">服务列表</h2>
          </div>
          <div class="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-600">
            <span class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
              {{ activeMonitors.length }} 个活跃监控
            </span>
            <span v-if="lastUpdated" class="text-slate-400 dark:text-slate-500">·</span>
            <span v-if="lastUpdated" class="text-slate-400 dark:text-slate-500">{{ lastUpdated }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <MonitorCard v-for="(m, idx) in monitors" :key="m.id" :monitor="m" :index="idx" />
        </div>
      </div>
    </main>

    <StatusFooter :loading="loading" :refreshing="refreshing" @refresh="manualRefresh" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTheme } from '../composables/useTheme';
import { API_BASE, fetchT, withRetry } from '../utils/api';
import { formatDate } from '../utils/format';

import StatusHeader from '../components/status/StatusHeader.vue';
import HeroBanner from '../components/status/HeroBanner.vue';
import MonitorCard from '../components/status/MonitorCard.vue';
import StatusFooter from '../components/status/StatusFooter.vue';

const { isDark, toggleTheme } = useTheme('theme');

const monitors = ref([]);
const loading = ref(false);
const error = ref(null);
const lastUpdated = ref('');
const refreshing = ref(false);
const incidents = ref([]);
const siteSettings = ref({ site_title: 'Uptime Monitor', site_description: '', site_logo_url: '' });

const activeMonitors = computed(() => monitors.value.filter(m => m.paused !== 1 && m.status !== 'PAUSED'));
const allUp = computed(() => activeMonitors.value.length > 0 && activeMonitors.value.every(m => m.status === 'UP'));
const hasRetrying = computed(() => activeMonitors.value.some(m => m.status === 'RETRYING'));
const hasDown = computed(() => activeMonitors.value.some(m => m.status === 'DOWN'));
const avgLatency = computed(() => {
    const active = activeMonitors.value.filter(m => m.latency != null);
    if (active.length === 0) return null;
    return Math.round(active.reduce((sum, m) => sum + m.latency, 0) / active.length);
});

const fetchMonitors = async () => {
    loading.value = true;
    error.value = null;
    try {
        const res = await withRetry(() => fetchT(`${API_BASE}/monitors/public/details`));
        if (res.ok) {
            const data = await res.json();
            monitors.value = data.monitors || [];
            lastUpdated.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        } else {
            let errorMsg = `服务器返回错误 (${res.status})`;
            try { const d = await res.json(); if (d?.error) errorMsg = `API 错误: ${d.error}`; } catch {}
            error.value = errorMsg;
        }
    } catch {
        error.value = '连接监控服务超时，已自动重试仍无法连接，请稍后刷新页面。';
    } finally {
        loading.value = false;
    }
};

const manualRefresh = async () => {
    refreshing.value = true;
    await fetchMonitors();
    setTimeout(() => { refreshing.value = false; }, 700);
};

const fetchIncidents = async () => {
    try { const r = await fetchT(`${API_BASE}/incidents`); if (r.ok) incidents.value = await r.json(); } catch {}
};

const fetchSettings = async () => {
    try {
        const r = await fetchT(`${API_BASE}/settings`);
        if (r.ok) {
            const d = await r.json();
            siteSettings.value = d;
            if (d.site_title) document.title = d.site_title + ' — Status';
            const meta = document.querySelector('meta[name=description]');
            if (meta && d.site_description) meta.content = d.site_description;
        }
    } catch {}
};

onMounted(() => {
    fetchMonitors();
    fetchIncidents();
    fetchSettings();
    setInterval(fetchMonitors, 30000);
});
</script>
