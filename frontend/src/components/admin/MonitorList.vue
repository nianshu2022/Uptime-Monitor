<template>
  <div class="space-y-2.5 fade-up-d2" ref="listRef">
    <div class="flex flex-col gap-2 mb-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-slate-500 shrink-0">监控列表</h2>
        <div class="flex items-center gap-2 flex-1 justify-end">
          <div class="relative">
            <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"></i>
            <input :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" type="text" placeholder="搜索名称或 URL..." class="search-input">
          </div>
          <select :value="sortKey" @change="$emit('update:sortKey', $event.target.value)" class="text-[11px] font-mono bg-transparent border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:border-green-500" style="appearance:none;-webkit-appearance:none">
            <option value="">默认排序</option><option value="name">按名称</option><option value="status">按状态</option><option value="latency">按延迟</option><option value="ssl">按SSL到期</option>
          </select>
          <span class="text-xs font-mono text-slate-500 dark:text-slate-600 shrink-0">{{ filteredMonitors.length }} / {{ monitors.length }}</span>
        </div>
      </div>
      <!-- Tag 筛选 -->
      <div v-if="allTags.length > 0" class="flex flex-wrap items-center gap-1.5">
        <button class="tag-filter-btn" :class="!activeTag ? 'active' : ''" @click="$emit('update:activeTag', '')">全部</button>
        <button v-for="tag in allTags" :key="tag" class="tag-filter-btn" :class="activeTag === tag ? 'active' : ''" @click="$emit('update:activeTag', activeTag === tag ? '' : tag)">{{ tag }}</button>
      </div>
      <!-- 批量操作栏 -->
      <div v-if="selectedIds.length > 0" class="bulk-bar">
        <span class="text-xs text-green-400 font-medium">已选 {{ selectedIds.length }} 项</span>
        <button @click="$emit('batch-action', 'pause')" class="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition cursor-pointer"><i class="fas fa-pause mr-1"></i>暂停</button>
        <button @click="$emit('batch-action', 'resume')" class="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition cursor-pointer"><i class="fas fa-play mr-1"></i>恢复</button>
        <button @click="$emit('batch-action', 'delete')" class="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition cursor-pointer"><i class="fas fa-trash mr-1"></i>删除</button>
        <button @click="$emit('update:selectedIds', [])" class="ml-auto text-xs text-slate-500 hover:text-white cursor-pointer"><i class="fas fa-times"></i></button>
      </div>
    </div>

    <!-- 监控卡片列表 -->
    <div v-for="m in filteredMonitors" :key="m.id"
      class="glass rounded-xl px-5 py-4 card-hover flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-default group"
      :class="m.paused ? 'opacity-50' : ''">
      <div class="flex items-center gap-3 min-w-0">
        <div class="drag-handle shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" title="拖拽排序">
          <i class="fas fa-grip-vertical text-sm"></i>
        </div>
        <input type="checkbox" :value="m.id" :checked="selectedIds.includes(m.id)" @change="toggleSelected(m.id)"
          class="w-4 h-4 rounded accent-green-500 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          :class="selectedIds.includes(m.id) ? 'opacity-100' : ''">
        <div class="relative shrink-0">
          <div class="w-2.5 h-2.5 rounded-full" :class="{ 'bg-green-400': m.status === 'UP', 'bg-red-400': m.status === 'DOWN', 'bg-yellow-400': m.status === 'RETRYING', 'bg-slate-500': m.status === 'PAUSED' }"></div>
          <div v-if="m.status === 'UP'" class="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400/40 animate-ping"></div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="font-semibold text-slate-900 dark:text-white truncate">{{ m.name }}</h3>
            <span class="text-[10px] font-mono text-slate-600 shrink-0">{{ m.method || 'GET' }}</span>
            <span v-if="m.status === 'DOWN'" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">DOWN</span>
            <span v-if="m.status === 'RETRYING'" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">重试中</span>
            <span v-if="m.paused" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-400">已暂停</span>
          </div>
          <a :href="m.url" target="_blank" class="text-xs text-slate-500 hover:text-green-400 font-mono flex items-center gap-1 truncate max-w-xs transition-colors">
            {{ m.url }} <i class="fas fa-external-link-alt text-[8px] opacity-40"></i>
          </a>
          <div class="flex flex-wrap items-center gap-1.5 mt-1">
            <span v-if="m.keyword" class="text-[10px] text-slate-600 flex items-center gap-1"><i class="fas fa-filter text-[8px]"></i>{{ m.keyword }}</span>
            <span v-for="tag in parseTags(m.tags)" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>
        </div>
      </div>
      <!-- 右侧状态与操作 -->
      <div class="flex items-center gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 border-slate-100 dark:border-white/5 pt-3 md:pt-0">
        <div class="grid grid-cols-4 md:flex md:items-center gap-3 md:gap-4 text-center md:text-right flex-1 md:flex-none">
          <div v-if="m._latency != null && !m.paused" class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-600 font-bold">Latency</span>
            <span class="text-[11px] font-mono font-bold" :class="m._latency < 200 ? 'text-green-500' : m._latency < 500 ? 'text-yellow-500' : 'text-red-500'">{{ m._latency }}ms</span>
          </div>
          <div v-if="m._sparkData && m._sparkData.length > 2 && !m.paused" class="hidden lg:block">
            <svg class="w-[80px] h-[24px] mini-sparkline" :class="m.status === 'DOWN' ? 'text-red-500' : 'text-green-500'" viewBox="0 0 80 24" preserveAspectRatio="none">
              <path :d="miniSparkline(m._sparkData)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-600 font-bold">Last Check</span>
            <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400">{{ formatDateFull(m.last_check) }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-600 font-bold">SSL</span>
            <span class="text-[11px] font-mono font-medium" :class="getExpiryClassAdmin(m.cert_expiry)">{{ m.cert_expiry ? getDaysRemaining(m.cert_expiry) + 'd' : 'OK' }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-600 font-bold">Domain</span>
            <span class="text-[11px] font-mono font-medium" :class="getExpiryClassAdmin(m.domain_expiry)">{{ m.domain_expiry ? getDaysRemaining(m.domain_expiry) + 'd' : '-' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <button @click="$emit('force-check', m)" class="p-2 text-slate-500 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors cursor-pointer" :disabled="m._checking">
            <i class="fas fa-sync-alt text-sm" :class="{ 'fa-spin text-green-400': m._checking }"></i>
          </button>
          <button @click="$emit('toggle-pause', m)" class="p-2 rounded-lg transition-colors cursor-pointer" :class="m.paused ? 'text-green-500 hover:bg-green-500/10' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500 hover:bg-yellow-500/10'">
            <i :class="m.paused ? 'fas fa-play' : 'fas fa-pause'" class="text-sm"></i>
          </button>
          <button @click="$emit('open-config', m)" class="p-2 text-slate-500 hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer"><i class="fas fa-sliders-h text-sm"></i></button>
          <button @click="$emit('view-logs', m)" class="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"><i class="fas fa-list-ul text-sm"></i></button>
          <button @click="$emit('clone', m)" class="p-2 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"><i class="far fa-copy text-sm"></i></button>
          <button @click="$emit('delete', m)" class="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"><i class="far fa-trash-alt text-sm"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import Sortable from 'sortablejs';
import { formatDateFull, getDaysRemaining, getExpiryClassAdmin } from '../../utils/format';

const props = defineProps({
    monitors: Array, filteredMonitors: Array, allTags: Array,
    activeTag: String, selectedIds: Array, searchQuery: String, sortKey: String,
});
const emit = defineEmits([
    'update:activeTag', 'update:selectedIds', 'update:searchQuery', 'update:sortKey',
    'force-check', 'toggle-pause', 'open-config', 'view-logs', 'clone', 'delete', 'batch-action', 'reorder'
]);

const listRef = ref(null);
let sortableInstance = null;

const toggleSelected = (id) => {
    const current = [...props.selectedIds];
    const idx = current.indexOf(id);
    if (idx >= 0) current.splice(idx, 1); else current.push(id);
    emit('update:selectedIds', current);
};

const parseTags = (tags) => tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

const miniSparkline = (lats) => {
    if (!lats || lats.length < 2) return '';
    const W = 80, H = 24, P = 2;
    const max = Math.max(...lats), min = Math.min(...lats);
    const range = max - min || 1;
    return lats.map((v, i) => {
        const x = P + (i / (lats.length - 1)) * (W - 2 * P);
        const y = H - P - ((v - min) / range) * (H - 2 * P);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
};

const initSortable = () => {
    if (sortableInstance) sortableInstance.destroy();
    const el = listRef.value;
    if (!el) return;
    sortableInstance = new Sortable(el, {
        handle: '.drag-handle', animation: 200, ghostClass: 'opacity-30', draggable: '.card-hover',
        onEnd: () => {
            const cards = el.querySelectorAll('.card-hover');
            const ids = [...cards].map((_, idx) => props.filteredMonitors[idx]?.id).filter(Boolean);
            if (ids.length > 0) emit('reorder', ids);
        }
    });
};

watch(() => props.filteredMonitors.length, () => nextTick(initSortable));
onMounted(() => nextTick(initSortable));
</script>
