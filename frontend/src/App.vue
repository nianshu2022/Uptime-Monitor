<template>
  <!-- 多层动态背景光晕 -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div class="absolute -top-48 -right-48 w-[800px] h-[800px] bg-emerald-500/[0.015] dark:bg-emerald-500/[0.07] rounded-full blur-[128px]" style="animation: float 25s ease-in-out infinite"></div>
    <div class="absolute top-1/2 -left-64 w-[600px] h-[600px] bg-sky-500/[0.01] dark:bg-cyan-500/[0.04] rounded-full blur-[100px]" style="animation: float 30s ease-in-out infinite reverse"></div>
    <div class="absolute -bottom-32 right-1/4 w-[500px] h-[500px] bg-indigo-500/[0.008] dark:bg-violet-500/[0.03] rounded-full blur-[120px]" style="animation: float 35s ease-in-out infinite 5s"></div>
    <div class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white dark:from-emerald-950/20 to-transparent"></div>
  </div>

  <router-view />
</template>

<script setup>
// App.vue — 根组件，只负责背景和路由出口
</script>
