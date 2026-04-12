<template>
  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="glass w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6">
          <div class="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h3 class="text-lg font-bold text-white text-center mb-2">确认操作</h3>
          <p class="text-slate-400 text-sm text-center">{{ message }}</p>
        </div>
        <div class="px-6 pb-6 flex gap-3">
          <button @click="$emit('cancel')" class="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-white/5 transition font-medium text-sm cursor-pointer">取消</button>
          <button @click="$emit('confirm')" class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition shadow-sm cursor-pointer">确认删除</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ message: String });
defineEmits(['confirm', 'cancel']);
</script>
