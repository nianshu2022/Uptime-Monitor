<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 fade-up-d1">
    <div class="glass rounded-xl p-4 glow-green">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">总计</span>
        <div class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center"><i class="fas fa-server text-slate-500 dark:text-slate-400 text-xs"></i></div>
      </div>
      <p class="text-2xl font-bold text-slate-900 dark:text-white font-mono">{{ stats.total }}</p>
      <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-wider">Monitors</p>
    </div>
    <div class="glass rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[10px] font-bold uppercase tracking-widest text-green-500">在线</span>
        <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center"><i class="fas fa-check text-green-400 text-xs"></i></div>
      </div>
      <p class="text-2xl font-bold text-green-400 font-mono">{{ stats.online }}</p>
      <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-wider">Operational</p>
    </div>
    <div class="glass rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[10px] font-bold uppercase tracking-widest text-red-400">故障</span>
        <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><i class="fas fa-times text-red-400 text-xs"></i></div>
      </div>
      <p class="text-2xl font-bold text-red-400 font-mono">{{ stats.offline }}</p>
      <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-wider">Disrupted</p>
    </div>
    <div class="glass rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">暂停</span>
        <div class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center"><i class="fas fa-pause text-slate-500 text-xs"></i></div>
      </div>
      <p class="text-2xl font-bold text-slate-600 dark:text-slate-400 font-mono">{{ stats.paused }}</p>
      <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-wider">Paused</p>
    </div>
  </div>
</template>

<script setup>
defineProps({ stats: Object });
</script>
