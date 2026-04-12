<template>
  <div class="fixed bottom-6 right-6 z-[70] flex flex-col gap-2 pointer-events-none">
    <div v-for="toast in toasts" :key="toast.id"
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-xs transition-all toast-enter"
      :class="{
        'bg-green-900/40 border-green-500/30 text-green-300': toast.type === 'success',
        'bg-red-900/40 border-red-500/30 text-red-300': toast.type === 'error',
        'bg-blue-900/40 border-blue-500/30 text-blue-300': toast.type === 'info',
      }">
      <i :class="{
        'fas fa-check-circle': toast.type === 'success',
        'fas fa-times-circle': toast.type === 'error',
        'fas fa-info-circle': toast.type === 'info'
      }"></i>
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '../../composables/useToast';
const { toasts } = useToast();
</script>
