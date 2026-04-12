<template>
  <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative w-full max-w-md glass rounded-2xl shadow-2xl" style="animation:modal-in 0.25s ease-out">
        <div class="px-6 py-5 border-b border-white/5 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-indigo-500/15 rounded-xl flex items-center justify-center"><i class="fas fa-cog text-indigo-400"></i></div>
            <h3 class="text-lg font-bold text-white">站点设置</h3>
          </div>
          <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 space-y-4">
          <div><label class="block text-sm font-medium text-slate-300 mb-2">状态页标题</label><input v-model="settings.site_title" placeholder="Uptime Monitor" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-indigo-500 outline-none"></div>
          <div><label class="block text-sm font-medium text-slate-300 mb-2">页面描述</label><textarea v-model="settings.site_description" rows="2" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-indigo-500 outline-none resize-none"></textarea></div>
          <div><label class="block text-sm font-medium text-slate-300 mb-2">Logo URL <span class="text-xs font-normal text-slate-500">可选</span></label><input v-model="settings.site_logo_url" placeholder="https://example.com/logo.png" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-indigo-500 outline-none"></div>
          <button @click="save" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer">保存设置</button>
          <div class="border-t border-white/5 pt-4">
            <h4 class="text-xs font-semibold uppercase text-slate-500 mb-3">导入监控配置</h4>
            <label class="flex items-center gap-3 px-4 py-3 bg-slate-900/60 rounded-xl border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition">
              <i class="fas fa-upload text-indigo-400"></i>
              <div><p class="text-sm text-white font-medium">选择 JSON 文件</p><p class="text-xs text-slate-500">导入之前导出的监控配置</p></div>
              <input type="file" accept=".json" @change="importMonitors" class="hidden">
            </label>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { API_BASE, fetchT } from '../../utils/api';

const emit = defineEmits(['close', 'import-done']);
const { storedPassword } = useAuth();
const { addToast } = useToast();
const settings = ref({ site_title: 'Uptime Monitor', site_description: '', site_logo_url: '' });

const authFetch = async (url, opts = {}) => fetchT(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${storedPassword.value}` } });

const fetchSettings = async () => {
    try { const r = await fetch(`${API_BASE}/settings`); if (r.ok) { const d = await r.json(); settings.value = { site_title: d.site_title || 'Uptime Monitor', site_description: d.site_description || '', site_logo_url: d.site_logo_url || '' }; } } catch {}
};

const save = async () => {
    try { const r = await authFetch(`${API_BASE}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings.value) }); if (r.ok) { addToast('设置已保存', 'success'); emit('close'); } else { addToast('保存失败', 'error'); } } catch { addToast('网络错误', 'error'); }
};

const importMonitors = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
        const text = await file.text(); const items = JSON.parse(text);
        if (!Array.isArray(items)) { addToast('无效格式', 'error'); return; }
        let ok = 0;
        for (const item of items) { const r = await authFetch(`${API_BASE}/monitors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }); if (r.ok) ok++; }
        addToast(`导入 ${ok}/${items.length} 个成功`, 'success'); emit('import-done'); emit('close');
    } catch { addToast('导入失败', 'error'); }
    e.target.value = '';
};

fetchSettings();
</script>
