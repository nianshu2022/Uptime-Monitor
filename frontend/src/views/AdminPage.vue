<template>
  <div class="min-h-screen flex flex-col text-slate-800 dark:text-slate-200">
    <!-- 背景光晕 -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div class="absolute -top-40 -right-40 w-[600px] h-[600px] bg-green-600/[0.02] dark:bg-green-600/[0.08] rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600/[0.02] dark:bg-blue-600/[0.06] rounded-full blur-3xl"></div>
    </div>

    <!-- 登录弹窗 -->
    <LoginDialog v-if="!isAuthenticated" @login="onLogin" />

    <!-- 顶部导航 -->
    <AdminHeader :isDark="isDark" :loading="loading" :lastRefreshed="lastRefreshed"
      @toggle-theme="toggleTheme" @refresh="fetchMonitors" @logout="logout" />

    <!-- 主要内容 -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
      <!-- 页面标题 -->
      <div class="mb-8 fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">管理控制台</h1>
          <p class="text-slate-500 text-sm mt-0.5">管理监控项目与通知配置</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button @click="showIncidents = true" class="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-600/50">
            <i class="fas fa-flag text-xs"></i> 事件公告
          </button>
          <button @click="showSettings = true" class="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-600/50">
            <i class="fas fa-cog text-xs"></i> 站点设置
          </button>
          <button @click="exportMonitors" class="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-600/50">
            <i class="fas fa-download text-xs"></i> 导出
          </button>
          <button @click="showChannels = true" class="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-600/50">
            <i class="fas fa-bell text-xs"></i> 通知渠道
          </button>
          <button @click="showAddModal = true" class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/20 cursor-pointer">
            <i class="fas fa-plus text-xs"></i> 添加监控
          </button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="mb-6 glass rounded-xl p-4 flex items-center gap-3 border-l-4 border-orange-500 fade-up">
        <i class="fas fa-exclamation-circle text-orange-400 shrink-0"></i>
        <p class="text-sm text-orange-300 flex-1">{{ error }}</p>
        <button @click="fetchMonitors" class="text-xs px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors font-medium cursor-pointer">重试</button>
      </div>

      <!-- 统计概览 -->
      <StatsOverview v-if="isAuthenticated && monitors.length > 0" :stats="stats" />

      <!-- 加载占位 -->
      <div v-if="loading && monitors.length === 0" class="space-y-3 fade-up-d2">
        <div v-for="i in 4" :key="i" class="glass rounded-xl h-16 animate-pulse"></div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="monitors.length === 0 && !loading"
        class="text-center py-20 glass rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 fade-up-d2">
        <div class="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-satellite-dish text-2xl text-slate-400 dark:text-slate-600"></i>
        </div>
        <h3 class="text-lg font-medium text-slate-900 dark:text-white">暂无监控项目</h3>
        <p class="text-slate-500 mt-1 mb-6 text-sm">点击上方「添加监控」开始配置</p>
        <button @click="showAddModal = true" class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-green-500/20 cursor-pointer">
          <i class="fas fa-plus text-xs"></i> 添加第一个监控
        </button>
      </div>

      <!-- 监控列表 -->
      <MonitorList v-else
        :monitors="monitors" :filteredMonitors="filteredMonitors" :allTags="allTags"
        :activeTag="activeTag" :selectedIds="selectedIds" :searchQuery="searchQuery" :sortKey="sortKey"
        @update:activeTag="activeTag = $event" @update:selectedIds="selectedIds = $event"
        @update:searchQuery="searchQuery = $event" @update:sortKey="sortKey = $event"
        @force-check="forceCheck" @toggle-pause="togglePause" @open-config="openConfig"
        @view-logs="viewLogs" @clone="cloneMonitor" @delete="deleteMonitor"
        @batch-action="batchAction" @reorder="handleReorder"
      />
    </main>

    <!-- Footer -->
    <footer class="mt-auto py-5 border-t border-white/5">
      <div class="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
        <p class="text-xs text-slate-600">
          &copy; {{ new Date().getFullYear() }} <a :href="footerUrl" target="_blank" class="hover:text-green-400 transition-colors font-medium">{{ footerAuthor }}</a>. All Rights Reserved.
        </p>
        <div class="flex items-center gap-4 text-xs text-slate-700 font-mono">
          <span><i class="fas fa-code-branch mr-1"></i>v1.4.0</span>
          <span><i class="fas fa-server mr-1"></i>Cloudflare Edge</span>
        </div>
      </div>
    </footer>

    <!-- 所有 Modal -->
    <AddMonitorModal v-if="showAddModal" :newMonitor="newMonitor" :submitting="submitting"
      @close="showAddModal = false" @submit="addMonitor" />

    <ConfigModal v-if="showConfig" :configTarget="configTarget" :configForm="configForm" :configSaving="configSaving"
      @close="showConfig = false" @save="saveConfig" />

    <LogsModal v-if="showLogs" :monitor="currentMonitor" :logs="logs" :logsLoading="logsLoading"
      :hasMoreLogs="hasMoreLogs" :sparkline="sparklineComputed" :uptimeStats="uptimeStats" :latencyPercentiles="latencyPercentiles"
      @close="showLogs = false" @load-more="loadMoreLogs" />

    <ChannelsModal v-if="showChannels" @close="showChannels = false" />

    <IncidentsModal v-if="showIncidents" :monitors="monitors" @close="showIncidents = false" />

    <SettingsModal v-if="showSettings" :monitors="monitors" @close="showSettings = false" @import-done="fetchMonitors" />

    <ConfirmDialog v-if="confirmModal.show" :message="confirmModal.message" @confirm="handleConfirm(true)" @cancel="handleConfirm(false)" />

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useTheme } from '../composables/useTheme';
import { useToast } from '../composables/useToast';
import { API_BASE, fetchT, withRetry } from '../utils/api';
import { formatDateFull, getDaysRemaining, getExpiryClassAdmin } from '../utils/format';

// 子组件
import LoginDialog from '../components/admin/LoginDialog.vue';
import AdminHeader from '../components/admin/AdminHeader.vue';
import StatsOverview from '../components/admin/StatsOverview.vue';
import MonitorList from '../components/admin/MonitorList.vue';
import AddMonitorModal from '../components/admin/AddMonitorModal.vue';
import ConfigModal from '../components/admin/ConfigModal.vue';
import LogsModal from '../components/admin/LogsModal.vue';
import ChannelsModal from '../components/admin/ChannelsModal.vue';
import IncidentsModal from '../components/admin/IncidentsModal.vue';
import SettingsModal from '../components/admin/SettingsModal.vue';
import ConfirmDialog from '../components/admin/ConfirmDialog.vue';
import ToastContainer from '../components/admin/ToastContainer.vue';

const { isDark, toggleTheme } = useTheme('admin_theme');
const { isAuthenticated, storedPassword, logout } = useAuth();
const { addToast } = useToast();

const footerAuthor = import.meta.env.VITE_FOOTER_AUTHOR || 'Uptime Monitor';
const footerUrl = import.meta.env.VITE_FOOTER_URL || '#';

// ── 核心状态 ──
const monitors = ref([]);
const loading = ref(false);
const error = ref(null);
const lastRefreshed = ref('');

// ── 搜索/排序/筛选 ──
const searchQuery = ref('');
const sortKey = ref('');
const activeTag = ref('');
const selectedIds = ref([]);

// ── Modal 控制 ──
const showAddModal = ref(false);
const showConfig = ref(false);
const showLogs = ref(false);
const showChannels = ref(false);
const showIncidents = ref(false);
const showSettings = ref(false);

// ── 添加监控 ──
const newMonitor = ref({ name: '', url: '', method: 'GET', keyword: '', user_agent: '', tags: '', request_headers: '', request_body: '', interval: 300, check_ssl: true, check_domain: true, alert_silence_hours: '24', alert_error_rate: 0 });
const submitting = ref(false);

// ── 配置面板 ──
const configTarget = ref(null);
const configForm = ref({});
const configSaving = ref(false);

// ── 日志面板 ──
const logs = ref([]);
const logsLoading = ref(false);
const currentMonitor = ref(null);
const logOffset = ref(0);
const logLimit = 50;
const hasMoreLogs = ref(false);

// ── 确认对话框 ──
const confirmModal = ref({ show: false, message: '', resolve: null });
const showConfirm = (message) => new Promise(resolve => {
    confirmModal.value = { show: true, message, resolve };
});
const handleConfirm = (result) => {
    if (confirmModal.value.resolve) confirmModal.value.resolve(result);
    confirmModal.value.show = false;
};

// ── 带鉴权 fetch ──
const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers, 'Authorization': `Bearer ${storedPassword.value}` };
    const res = await fetchT(url, { ...options, headers });
    if (res.status === 401) {
        sessionStorage.removeItem('uptime_admin_password');
        location.reload();
    }
    return res;
};

// ── 统计概览 ──
const stats = computed(() => ({
    total: monitors.value.length,
    online: monitors.value.filter(m => m.status === 'UP').length,
    offline: monitors.value.filter(m => m.status === 'DOWN' || m.status === 'RETRYING').length,
    paused: monitors.value.filter(m => m.paused === 1).length,
}));

// ── Tag 和筛选 ──
const allTags = computed(() => {
    const tags = new Set();
    monitors.value.forEach(m => { if (m.tags) m.tags.split(',').forEach(t => { const s = t.trim(); if (s) tags.add(s); }); });
    return [...tags].sort();
});
const filteredMonitors = computed(() => {
    let list = monitors.value;
    if (activeTag.value) list = list.filter(m => m.tags && m.tags.split(',').map(t => t.trim()).includes(activeTag.value));
    const q = searchQuery.value.trim().toLowerCase();
    if (q) list = list.filter(m => (m.name && m.name.toLowerCase().includes(q)) || (m.url && m.url.toLowerCase().includes(q)));
    if (sortKey.value) {
        list = [...list].sort((a, b) => {
            switch (sortKey.value) {
                case 'name': return (a.name || '').localeCompare(b.name || '', 'zh-CN');
                case 'status': { const order = { 'DOWN': 0, 'RETRYING': 1, 'UP': 2, 'PAUSED': 3 }; return (order[a.status] ?? 9) - (order[b.status] ?? 9); }
                case 'latency': return (a._latency ?? 9999) - (b._latency ?? 9999);
                case 'ssl': { const dA = a.cert_expiry ? new Date(a.cert_expiry).getTime() : Infinity; const dB = b.cert_expiry ? new Date(b.cert_expiry).getTime() : Infinity; return dA - dB; }
                default: return 0;
            }
        });
    }
    return list;
});

// ── 数据获取 ──
const fetchMonitors = async () => {
    if (!isAuthenticated.value) return;
    loading.value = true; error.value = null;
    try {
        const [adminRes, publicRes] = await Promise.all([
            withRetry(() => authFetch(`${API_BASE}/monitors`)),
            fetchT(`${API_BASE}/monitors/public/details`).catch(() => null)
        ]);
        if (adminRes && adminRes.ok) {
            const adminData = await adminRes.json();
            let publicMap = {};
            if (publicRes && publicRes.ok) { try { const pd = await publicRes.json(); (pd.monitors || []).forEach(pm => { publicMap[pm.id] = pm; }); } catch {} }
            monitors.value = adminData.map(m => { const pm = publicMap[m.id]; m._latency = pm?.latency ?? null; m._sparkData = pm?.recent_latencies ?? null; return m; });
            lastRefreshed.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        } else {
            let errorMsg = `数据加载失败 (${adminRes?.status || '网络错误'})`;
            if (adminRes) { try { const d = await adminRes.json(); if (d?.error) errorMsg = `API 错误: ${d.error}`; } catch {} }
            error.value = errorMsg;
        }
    } catch { error.value = '连接服务器超时，请稍后刷新页面。'; }
    finally { loading.value = false; }
};

const onLogin = () => { fetchMonitors(); };

// ── 添加监控 ──
const addMonitor = async () => {
    if (!newMonitor.value.name || !newMonitor.value.url) { addToast('请填写名称和 URL', 'error'); return; }
    submitting.value = true;
    try {
        const body = { ...newMonitor.value, check_ssl: newMonitor.value.check_ssl ? 1 : 0, check_domain: newMonitor.value.check_domain ? 1 : 0, interval: Number(newMonitor.value.interval) };
        const res = await authFetch(`${API_BASE}/monitors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { newMonitor.value = { name: '', url: '', method: 'GET', keyword: '', user_agent: '', tags: '', request_headers: '', request_body: '', interval: 300, check_ssl: true, check_domain: true, alert_silence_hours: '24', alert_error_rate: 0 }; showAddModal.value = false; addToast('监控添加成功', 'success'); fetchMonitors(); }
        else { const d = await res.json(); addToast(d.error || '添加失败', 'error'); }
    } catch { addToast('网络错误', 'error'); }
    finally { submitting.value = false; }
};

// ── 删除 ──
const deleteMonitor = async (m) => {
    const ok = await showConfirm(`确定要删除「${m.name}」吗？`); if (!ok) return;
    try { const res = await authFetch(`${API_BASE}/monitors/${m.id}`, { method: 'DELETE' }); if (res.ok) { addToast(`已删除：${m.name}`, 'success'); fetchMonitors(); } else { addToast('删除失败', 'error'); } } catch { addToast('网络错误', 'error'); }
};

// ── 手动检测 ──
const forceCheck = async (m) => {
    if (m._checking) return; m._checking = true;
    try { const res = await authFetch(`${API_BASE}/monitors/${m.id}/check`, { method: 'POST' }); if (res.ok) { addToast(`已更新：${m.name}`, 'success'); fetchMonitors(); } } catch { addToast('网络错误', 'error'); }
    finally { m._checking = false; }
};

// ── 暂停/恢复 ──
const togglePause = async (m) => {
    try { const res = await authFetch(`${API_BASE}/monitors/${m.id}/pause`, { method: 'PATCH' }); if (res.ok) { const d = await res.json(); addToast(d.paused ? `已暂停：${m.name}` : `已恢复：${m.name}`, 'info'); fetchMonitors(); } } catch { addToast('网络错误', 'error'); }
};

// ── 克隆 ──
const cloneMonitor = (m) => {
    newMonitor.value = { name: m.name + ' (Copy)', url: m.url, method: m.method || 'GET', keyword: m.keyword || '', user_agent: m.user_agent || '', tags: m.tags || '', request_headers: m.request_headers || '', request_body: m.request_body || '', interval: m.interval || 300, check_ssl: m.check_ssl !== 0, check_domain: m.check_domain !== 0, alert_silence_hours: m.alert_silence_uptime || 24, alert_error_rate: m.alert_error_rate || 0 };
    showAddModal.value = true;
};

// ── 配置 ──
const openConfig = (m) => {
    configTarget.value = m;
    configForm.value = { name: m.name || '', url: m.url || '', method: m.method || 'GET', keyword: m.keyword || '', user_agent: m.user_agent || '', tags: m.tags || '', request_headers: m.request_headers || '', request_body: m.request_body || '', interval: m.interval || 300, check_ssl: m.check_ssl !== 0, check_domain: m.check_domain !== 0, alert_silence_uptime: m.alert_silence_uptime ?? 24, alert_silence_ssl: m.alert_silence_ssl ?? 24, alert_silence_domain: m.alert_silence_domain ?? 24, alert_error_rate: m.alert_error_rate ?? 0 };
    showConfig.value = true;
};

const saveConfig = async () => {
    if (!configTarget.value) return; configSaving.value = true;
    try {
        const body = { name: configForm.value.name, url: configForm.value.url, method: configForm.value.method || 'GET', keyword: configForm.value.keyword, user_agent: configForm.value.user_agent, tags: configForm.value.tags || '', request_headers: configForm.value.request_headers || '', request_body: configForm.value.request_body || '', interval: Number(configForm.value.interval), check_ssl: configForm.value.check_ssl ? 1 : 0, check_domain: configForm.value.check_domain ? 1 : 0, alert_silence_uptime: Number(configForm.value.alert_silence_uptime), alert_silence_ssl: Number(configForm.value.alert_silence_ssl), alert_silence_domain: Number(configForm.value.alert_silence_domain), alert_error_rate: Number(configForm.value.alert_error_rate ?? 0) };
        const res = await authFetch(`${API_BASE}/monitors/${configTarget.value.id}/config`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { addToast('配置已保存', 'success'); showConfig.value = false; fetchMonitors(); }
        else { const d = await res.json(); addToast(d.error || '保存失败', 'error'); }
    } catch { addToast('网络错误', 'error'); }
    finally { configSaving.value = false; }
};

// ── 日志 ──
const viewLogs = async (monitor) => {
    currentMonitor.value = monitor; logs.value = []; logOffset.value = 0; hasMoreLogs.value = false; logsLoading.value = true; showLogs.value = true;
    try { const res = await authFetch(`${API_BASE}/monitors/${monitor.id}/logs?limit=${logLimit}&offset=0`); if (res.ok) { const d = await res.json(); logs.value = d; hasMoreLogs.value = d.length >= logLimit; logOffset.value = d.length; } } catch {} finally { logsLoading.value = false; }
};
const loadMoreLogs = async () => {
    if (!currentMonitor.value || logsLoading.value) return; logsLoading.value = true;
    try { const res = await authFetch(`${API_BASE}/monitors/${currentMonitor.value.id}/logs?limit=${logLimit}&offset=${logOffset.value}`); if (res.ok) { const d = await res.json(); logs.value = [...logs.value, ...d]; hasMoreLogs.value = d.length >= logLimit; logOffset.value += d.length; } } catch {} finally { logsLoading.value = false; }
};

// ── Sparkline / Uptime 计算 ──
const sparklineComputed = computed(() => {
    if (!logs.value || logs.value.length < 2) return null;
    const ordered = [...logs.value].reverse();
    const W = 560, H = 56, P = 6;
    const latencies = ordered.map(l => l.latency || 0);
    const maxL = Math.max(...latencies, 1);
    const points = ordered.map((log, i) => ({ x: P + (i / Math.max(ordered.length - 1, 1)) * (W - P * 2), y: H - P - ((log.latency || 0) / maxL) * (H - P * 2), fail: !!log.is_fail }));
    let path = '', penDown = false;
    points.forEach(p => { if (!p.fail) { path += penDown ? ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; penDown = true; } else { penDown = false; } });
    return { points, path, maxL, W, H };
});

const uptimeStats = computed(() => {
    if (!logs.value || logs.value.length === 0) return null;
    const calc = (hours) => { const cutoff = Date.now() - hours * 3600000; const filtered = logs.value.filter(l => { const t = new Date(l.created_at).getTime(); return !isNaN(t) && t >= cutoff; }); if (filtered.length === 0) return null; return ((filtered.filter(l => !l.is_fail).length / filtered.length) * 100).toFixed(1); };
    return { h24: calc(24), d7: calc(24*7), d30: calc(24*30) };
});

const latencyPercentiles = computed(() => {
    if (!logs.value || logs.value.length < 5) return null;
    const lats = logs.value.filter(l => !l.is_fail && l.latency > 0).map(l => l.latency).sort((a, b) => a - b);
    if (lats.length < 5) return null;
    const pct = (arr, p) => arr[Math.max(0, Math.min(Math.ceil(arr.length * p / 100) - 1, arr.length - 1))];
    return { p95: pct(lats, 95), p99: pct(lats, 99) };
});

// ── 批量操作 ──
const batchAction = async (action) => {
    if (selectedIds.value.length === 0) return;
    if (action === 'delete') { const ok = await showConfirm(`确定批量删除 ${selectedIds.value.length} 个监控？`); if (!ok) return; }
    try { const res = await authFetch(`${API_BASE}/monitors/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids: selectedIds.value }) }); if (res.ok) { const d = await res.json(); addToast(`操作成功，影响 ${d.affected} 项`, 'success'); selectedIds.value = []; fetchMonitors(); } else { addToast('批量操作失败', 'error'); } } catch { addToast('网络错误', 'error'); }
};

// ── 排序 ──
const handleReorder = async (ids) => {
    try { await authFetch(`${API_BASE}/monitors/reorder`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }); addToast('排序已保存', 'success'); fetchMonitors(); } catch { addToast('排序保存失败', 'error'); }
};

// ── 导出 ──
const exportMonitors = () => {
    const data = monitors.value.map(m => ({ name: m.name, url: m.url, method: m.method, interval: m.interval, keyword: m.keyword, user_agent: m.user_agent, tags: m.tags, request_headers: m.request_headers, request_body: m.request_body }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.style.display = 'none'; a.href = URL.createObjectURL(blob); a.download = `uptime-monitors-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 200);
    addToast(`已导出 ${data.length} 个监控配置`, 'success');
};

// ── 键盘快捷键 ──
onMounted(() => {
    if (isAuthenticated.value) { fetchMonitors(); setInterval(fetchMonitors, 30000); }
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.key === 'Escape') { showAddModal.value = false; showLogs.value = false; showConfig.value = false; showChannels.value = false; showIncidents.value = false; showSettings.value = false; if (confirmModal.value.show) handleConfirm(false); }
        if ((e.key === 'n' || e.key === 'N') && !showAddModal.value && !showLogs.value && !showConfig.value) { e.preventDefault(); showAddModal.value = true; }
        if ((e.key === 'r' || e.key === 'R') && !showAddModal.value && !showLogs.value && !showConfig.value) { e.preventDefault(); fetchMonitors(); }
        if (e.key === '/' && !showAddModal.value && !showLogs.value && !showConfig.value) { e.preventDefault(); document.querySelector('.search-input')?.focus(); }
    });
});
</script>
