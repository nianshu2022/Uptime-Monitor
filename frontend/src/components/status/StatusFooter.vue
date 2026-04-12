<template>
  <footer class="border-t border-black/[0.06] dark:border-white/[0.04] py-8 mt-8">
    <div class="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500">
      <div class="flex items-center gap-2">
        <div class="w-1 h-1 rounded-full bg-emerald-500/40"></div>
        <p>&copy; {{ new Date().getFullYear() }} <a :href="footerUrl" target="_blank" class="hover:text-slate-700 dark:hover:text-slate-400 transition-colors">{{ footerAuthor }}</a>. All Rights Reserved.</p>
      </div>
      <div class="flex items-center gap-5 font-mono">
        <button @click="$emit('refresh')" :disabled="loading" class="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-40" title="刷新数据">
          <svg :class="{'refresh-spin': refreshing}" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183"/></svg>
          Refresh
        </button>
        <span class="flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/></svg>
          Cloudflare Edge
        </span>
        <router-link to="/admin" class="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"/></svg>
          Admin
        </router-link>
      </div>
    </div>
  </footer>
</template>

<script setup>
defineProps({
    loading: Boolean,
    refreshing: Boolean,
});
defineEmits(['refresh']);

// 从 Vite 环境变量读取，回退默认值
const footerAuthor = import.meta.env.VITE_FOOTER_AUTHOR || 'Uptime Monitor';
const footerUrl = import.meta.env.VITE_FOOTER_URL || '#';
</script>
