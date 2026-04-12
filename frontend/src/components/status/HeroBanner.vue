<template>
  <div class="mb-6 fade-up">
    <!-- 全部正常 -->
    <div v-if="allUp && !hasRetrying && !error"
      class="hero-banner relative overflow-hidden rounded-3xl p-8 md:p-10 border border-emerald-200 dark:border-emerald-500/15 glow-green">
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/40 dark:via-emerald-900/10 dark:to-transparent"></div>
      <div class="absolute top-0 right-0 w-80 h-80 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] rounded-full blur-[80px] hero-glow"></div>
      <div class="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="flex items-start gap-5">
          <div class="hero-icon w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-500/20">
            <svg class="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">所有系统运行正常</h1>
            <p class="text-sm text-emerald-600/70 dark:text-emerald-400/70 font-mono tracking-wider">ALL SYSTEMS OPERATIONAL</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span class="text-xs font-bold font-mono text-emerald-500 dark:text-emerald-400 tracking-widest">OPERATIONAL</span>
          </div>
        </div>
      </div>
      <!-- 底部统计 -->
      <div class="relative mt-8 pt-6 border-t border-emerald-200 dark:border-emerald-500/10 grid grid-cols-3 gap-6">
        <div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mb-1">MONITORS</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white font-mono">{{ activeMonitors.length }}</p>
        </div>
        <div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mb-1">UPTIME</p>
          <p class="text-2xl font-bold text-emerald-500 dark:text-emerald-400 font-mono">{{ activeMonitors.length > 0 ? Math.round(activeMonitors.filter(m=>m.status==='UP').length / activeMonitors.length * 100) : 0 }}%</p>
        </div>
        <div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mb-1">AVG LATENCY</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white font-mono">{{ avgLatency != null ? avgLatency + 'ms' : '-' }}</p>
        </div>
      </div>
    </div>

    <!-- 探测中 -->
    <div v-else-if="hasRetrying && !hasDown && !error"
      class="hero-banner relative overflow-hidden rounded-3xl p-8 md:p-10 border border-yellow-200 dark:border-yellow-400/15">
      <div class="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-white dark:from-yellow-950/30 dark:via-yellow-900/5 dark:to-transparent"></div>
      <div class="absolute top-0 right-0 w-80 h-80 bg-yellow-500/[0.03] dark:bg-yellow-500/[0.04] rounded-full blur-[80px] hero-glow"></div>
      <div class="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="flex items-start gap-5">
          <div class="hero-icon w-14 h-14 rounded-2xl bg-yellow-100 dark:bg-yellow-400/15 flex items-center justify-center shrink-0 border border-yellow-200 dark:border-yellow-400/20">
            <svg class="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">正在探测异常站点</h1>
            <p class="text-sm text-yellow-600/70 dark:text-yellow-400/70 font-mono tracking-wider">INVESTIGATING POTENTIAL ISSUE</p>
          </div>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
          </span>
          <span class="text-xs font-bold font-mono text-yellow-400 tracking-widest">DEGRADED</span>
        </div>
      </div>
    </div>

    <!-- 服务故障 -->
    <div v-else-if="hasDown && !error"
      class="hero-banner relative overflow-hidden rounded-3xl p-8 md:p-10 border border-red-200 dark:border-red-500/15 glow-red">
      <div class="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-white dark:from-red-950/40 dark:via-red-900/10 dark:to-transparent"></div>
      <div class="absolute top-0 right-0 w-80 h-80 bg-red-500/[0.03] dark:bg-red-500/[0.06] rounded-full blur-[80px] hero-glow"></div>
      <div class="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="flex items-start gap-5">
          <div class="hero-icon w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-500/20">
            <svg class="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">部分服务出现异常</h1>
            <p class="text-sm text-red-600/70 dark:text-red-400/70 font-mono tracking-wider">SERVICE DISRUPTION DETECTED</p>
          </div>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
          </span>
          <span class="text-xs font-bold font-mono text-red-400 tracking-widest">DISRUPTED</span>
        </div>
      </div>
    </div>

    <!-- API 错误 -->
    <div v-if="error" class="mt-4 glass rounded-2xl p-5 flex items-center gap-4 border-l-4 border-orange-400 dark:border-orange-500">
      <div class="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
        </svg>
      </div>
      <p class="text-sm text-orange-600 dark:text-orange-300 flex-1">{{ error }}</p>
      <button @click="$emit('retry')" class="text-xs px-4 py-2 rounded-xl bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-500/25 transition-all cursor-pointer font-bold font-mono tracking-wide">RETRY</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
    monitors: Array, activeMonitors: Array,
    allUp: Boolean, hasRetrying: Boolean, hasDown: Boolean,
    avgLatency: Number, error: String,
});
defineEmits(['retry']);
</script>
