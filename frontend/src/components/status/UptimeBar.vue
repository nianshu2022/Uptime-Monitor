<template>
  <div class="pl-[26px] monitor-row3">
    <div class="flex gap-[1.5px] items-end">
      <div v-for="(day, i) in displayDays" :key="i"
        class="uptime-bar-cell flex-1 rounded-[2px]"
        style="height:18px"
        :class="dayColorClass(day)">
        <div class="uptime-tooltip">{{ day.date }} · <span v-if="day.total > 0">{{ ((day.up / day.total) * 100).toFixed(1) }}%</span><span v-else>No data</span></div>
      </div>
    </div>
    <div class="flex justify-between items-center mt-1.5">
      <span class="text-[10px] font-mono text-slate-400/60 dark:text-slate-600/60">90 days ago</span>
      <span v-if="monitor.uptime_30d != null" class="text-[11px] font-mono font-semibold"
        :class="monitor.uptime_30d >= 99.9 ? 'text-emerald-500' : monitor.uptime_30d >= 95 ? 'text-yellow-500' : 'text-red-500'"
      >30d: {{ monitor.uptime_30d }}%</span>
      <span class="text-[10px] font-mono text-slate-400/60 dark:text-slate-600/60">Yesterday</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    monitor: Object,
});

const displayDays = computed(() => {
    const stats = props.monitor.daily_stats || [];
    const map = {};
    stats.forEach(s => { map[s.date] = s; });
    const days = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const ds = d.toISOString().slice(0, 10);
        const s = map[ds];
        days.push({ date: ds, up: s ? s.up : 0, total: s ? s.total : 0 });
    }
    return days;
});

const dayColorClass = (day) => {
    if (day.total === 0) return 'bg-slate-200/80 dark:bg-slate-800/60';
    const pct = (day.up / day.total) * 100;
    if (pct >= 99.9) return 'bg-emerald-400 dark:bg-emerald-500';
    if (pct >= 95) return 'bg-yellow-400 dark:bg-yellow-500';
    return 'bg-red-400 dark:bg-red-500';
};
</script>
