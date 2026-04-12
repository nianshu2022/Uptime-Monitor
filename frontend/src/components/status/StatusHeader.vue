<template>
  <header class="sticky top-0 z-40 border-b border-black/[0.06] dark:border-white/[0.04] transition-colors duration-300"
    :style="isDark ? 'background:rgba(3,7,18,0.8);backdrop-filter:blur(24px) saturate(1.5)' : 'background:rgba(255,255,255,0.8);backdrop-filter:blur(24px) saturate(1.5)'">
    <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative">
          <img v-if="siteSettings.site_logo_url" :src="siteSettings.site_logo_url" alt="Logo" class="w-8 h-8 rounded-lg object-contain">
          <div v-else class="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
            <svg class="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <div>
          <span class="font-bold text-slate-900 dark:text-white tracking-tight text-[15px]">{{ siteSettings.site_title || 'Uptime Monitor' }}</span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono -mt-0.5 tracking-wider truncate max-w-[200px]">{{ siteSettings.site_description || 'STATUS PAGE' }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <!-- LIVE 指示 -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs">
          <div class="relative">
            <span v-if="!loading" class="w-1.5 h-1.5 rounded-full bg-emerald-400 block"></span>
            <span v-if="!loading" class="pulse-ring bg-emerald-400/30 block"></span>
            <svg v-else class="w-3 h-3 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
          <span class="font-mono text-slate-500 dark:text-slate-400">{{ loading ? 'SYNCING' : 'LIVE' }}</span>
        </div>
        <!-- 主题切换 -->
        <button @click="$emit('toggle-theme')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all duration-300 cursor-pointer">
          <svg v-if="isDark" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
    loading: Boolean,
    isDark: Boolean,
    siteSettings: Object,
});
defineEmits(['toggle-theme']);
</script>
