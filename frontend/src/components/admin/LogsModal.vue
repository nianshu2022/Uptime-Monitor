<template>
  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative w-full max-w-4xl glass rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="animation:modal-in 0.25s ease-out; max-height: 85vh">
        <div class="px-8 py-5 border-b border-white/5 bg-gradient-to-r from-blue-900/15 to-transparent flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center"><i class="fas fa-list-ul text-blue-400"></i></div>
            <div><h3 class="text-lg font-bold text-white">{{ monitor?.name }}</h3><p class="text-xs text-slate-500 mt-0.5 font-mono">检测日志流水</p></div>
          </div>
          <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><i class="fas fa-times text-lg"></i></button>
        </div>

        <!-- Uptime 统计 + P95/P99 -->
        <div v-if="uptimeStats && (uptimeStats.h24 !== null || uptimeStats.d7 !== null)" class="px-8 py-3 border-b border-white/5 bg-slate-900/30">
          <div class="flex items-center gap-6 text-xs flex-wrap">
            <div v-for="stat in [{label:'24h 可用率', val: uptimeStats.h24},{label:'7d 可用率', val: uptimeStats.d7},{label:'30d 可用率', val: uptimeStats.d30}]" :key="stat.label">
              <span class="text-slate-400 font-medium">{{ stat.label }}</span>
              <span class="font-mono font-bold ml-1.5" :class="stat.val === null ? 'text-slate-500' : Number(stat.val) >= 99 ? 'text-green-400' : Number(stat.val) >= 95 ? 'text-yellow-400' : 'text-red-400'">{{ stat.val !== null ? stat.val + '%' : 'N/A' }}</span>
            </div>
            <div class="h-3 w-px bg-white/10"></div>
            <div v-if="latencyPercentiles"><span class="text-slate-400 font-medium">P95</span><span class="font-mono font-bold ml-1 text-sky-400">{{ latencyPercentiles.p95 }}ms</span></div>
            <div v-if="latencyPercentiles"><span class="text-slate-400 font-medium">P99</span><span class="font-mono font-bold ml-1 text-orange-400">{{ latencyPercentiles.p99 }}ms</span></div>
          </div>
        </div>

        <!-- Sparkline 折线图 -->
        <div v-if="logs.length > 1 && sparkline" class="px-8 py-4 border-b border-white/5 sparkline-container bg-slate-900/20">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">响应延迟趋势</span>
            <span class="text-xs text-slate-500 font-mono">Max: {{ sparkline.maxL }}ms</span>
          </div>
          <svg :viewBox="`0 0 ${sparkline.W} ${sparkline.H}`" class="w-full h-14" preserveAspectRatio="none">
            <path :d="sparkline.path" fill="none" stroke="#22c55e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            <circle v-for="(p, i) in sparkline.points" :key="i" :cx="p.x" :cy="p.y" r="3" :fill="p.fail ? '#ef4444' : '#22c55e'" :opacity="p.fail ? 1 : 0.8" />
            <g v-for="(p, i) in sparkline.points.filter(pt => pt.fail)" :key="'x' + i">
              <line :x1="p.x - 4" :y1="p.y - 4" :x2="p.x + 4" :y2="p.y + 4" stroke="#ef4444" stroke-width="1.5" />
              <line :x1="p.x + 4" :y1="p.y - 4" :x2="p.x - 4" :y2="p.y + 4" stroke="#ef4444" stroke-width="1.5" />
            </g>
          </svg>
        </div>

        <!-- 日志表格 -->
        <div class="flex-1 overflow-y-auto p-0">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-900/50 sticky top-0 z-10">
              <tr>
                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700">Time</th>
                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700">Status</th>
                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700">Latency</th>
                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700">Result</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-white/5 transition">
                <td class="px-6 py-3 text-xs text-slate-400 whitespace-nowrap">{{ formatDateFull(log.created_at) }}</td>
                <td class="px-6 py-3 text-xs font-mono"><span :class="log.status_code >= 200 && log.status_code < 300 ? 'text-green-600' : 'text-red-600'">{{ log.status_code || '-' }}</span></td>
                <td class="px-6 py-3 text-xs font-mono text-slate-400">{{ log.latency }}ms</td>
                <td class="px-6 py-3 text-xs">
                  <span v-if="log.is_fail" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">{{ log.reason || 'Failed' }}</span>
                  <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400">Normal</span>
                </td>
              </tr>
              <tr v-if="logs.length === 0 && !logsLoading"><td colspan="4" class="px-6 py-12 text-center text-slate-500">暂无日志记录</td></tr>
              <tr v-if="logsLoading"><td colspan="4" class="px-6 py-12 text-center"><i class="fas fa-circle-notch fa-spin text-green-500 text-xl"></i></td></tr>
            </tbody>
          </table>
          <div v-if="logs.length > 0 && hasMoreLogs && !logsLoading" class="p-4 text-center border-t border-white/5">
            <button @click="$emit('load-more')" class="px-6 py-2 text-xs font-medium text-green-400 hover:text-white bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-all cursor-pointer">
              <i class="fas fa-chevron-down mr-1.5"></i>加载更多日志
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { formatDateFull } from '../../utils/format';
defineProps({ monitor: Object, logs: Array, logsLoading: Boolean, hasMoreLogs: Boolean, sparkline: Object, uptimeStats: Object, latencyPercentiles: Object });
defineEmits(['close', 'load-more']);
</script>
