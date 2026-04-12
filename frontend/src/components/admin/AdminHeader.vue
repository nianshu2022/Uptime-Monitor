<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 dark:border-white/5"
    :style="isDark ? 'background:rgba(15,23,42,0.85);backdrop-filter:blur(16px)' : 'background:rgba(255,255,255,0.85);backdrop-filter:blur(16px)'">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="font-semibold text-slate-900 dark:text-white tracking-tight">Uptime<span class="text-green-500">.</span>Admin</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span v-if="lastRefreshed" class="hidden md:inline text-[10px] font-mono text-slate-400 dark:text-slate-600 mr-1">{{ lastRefreshed }}</span>
        <router-link to="/" class="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-500 hover:bg-green-500/10 transition-colors text-sm" title="状态页">
          <i class="fas fa-external-link-alt"></i>
        </router-link>
        <button @click="$emit('refresh')" class="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-500 hover:bg-green-500/10 transition-colors text-sm" :class="{ 'animate-spin': loading }" title="刷新">
          <i class="fas fa-sync-alt"></i>
        </button>
        <button @click="$emit('toggle-theme')" class="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-sm cursor-pointer">
          <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>
        <div class="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5"></div>
        <button @click="$emit('logout')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
          <i class="fas fa-sign-out-alt"></i>
          <span class="hidden sm:inline">退出</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({ isDark: Boolean, loading: Boolean, lastRefreshed: String });
defineEmits(['toggle-theme', 'refresh', 'logout']);
</script>
