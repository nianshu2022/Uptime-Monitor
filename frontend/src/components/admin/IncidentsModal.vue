<template>
  <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative w-full max-w-lg glass rounded-2xl shadow-2xl flex flex-col" style="animation:modal-in 0.25s ease-out; max-height:85vh">
        <div class="px-6 py-5 border-b border-white/5 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-orange-500/15 rounded-xl flex items-center justify-center"><i class="fas fa-flag text-orange-400"></i></div>
            <div><h3 class="text-lg font-bold text-white">事件公告</h3><p class="text-xs text-slate-500">计划维护、事故公告等</p></div>
          </div>
          <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- 发布新公告 -->
          <div class="bg-slate-900/60 rounded-xl p-4 space-y-3">
            <h4 class="text-xs font-semibold uppercase text-slate-500">发布新公告</h4>
            <div class="flex gap-2 mb-1">
              <button @click="form.type = 'incident'" class="flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all cursor-pointer" :class="form.type !== 'maintenance' ? 'border-orange-500 bg-orange-900/20 text-orange-400' : 'border-slate-700 text-slate-400 hover:border-orange-500/40'"><i class="fas fa-exclamation-triangle mr-1"></i>事故公告</button>
              <button @click="form.type = 'maintenance'" class="flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all cursor-pointer" :class="form.type === 'maintenance' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400' : 'border-slate-700 text-slate-400 hover:border-cyan-500/40'"><i class="fas fa-wrench mr-1"></i>计划维护</button>
            </div>
            <input v-model="form.title" :placeholder="form.type === 'maintenance' ? '维护标题' : '事件标题'" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white outline-none">
            <textarea v-model="form.description" placeholder="详细说明（可选）" rows="2" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white outline-none resize-none"></textarea>
            <template v-if="form.type === 'maintenance'">
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-[11px] text-slate-400 mb-1">开始时间</label><input type="datetime-local" v-model="form.scheduled_start" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-xs bg-slate-800 text-white outline-none"></div>
                <div><label class="block text-[11px] text-slate-400 mb-1">结束时间</label><input type="datetime-local" v-model="form.scheduled_end" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-xs bg-slate-800 text-white outline-none"></div>
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">受影响的监控</label>
                <div class="flex flex-wrap gap-1.5 p-2 bg-slate-800/60 rounded-lg border border-slate-700 max-h-28 overflow-y-auto">
                  <label v-for="m in monitors" :key="m.id" class="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer text-xs transition-all"
                    :class="form.affected_ids.includes(m.id) ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white border border-transparent hover:border-slate-600'">
                    <input type="checkbox" :value="m.id" v-model="form.affected_ids" class="sr-only">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="m.status === 'UP' ? 'bg-green-400' : 'bg-red-400'"></span>{{ m.name }}
                  </label>
                </div>
              </div>
            </template>
            <div class="flex items-center gap-3">
              <select v-model="form.severity" class="flex-1 border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white outline-none"><option value="info">信息</option><option value="warning">警告</option><option value="critical">紧急</option></select>
              <button @click="create" class="px-4 py-2 text-white text-sm font-medium rounded-lg transition cursor-pointer" :class="form.type === 'maintenance' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-orange-600 hover:bg-orange-500'">发布</button>
            </div>
          </div>
          <!-- 历史列表 -->
          <div v-if="incidents.length === 0" class="text-center text-slate-500 text-sm py-6">暂无事件公告</div>
          <div v-for="inc in incidents" :key="inc.id" class="rounded-xl p-4 border flex items-start gap-3"
            :class="inc.status === 'active' ? (inc.type === 'maintenance' ? 'bg-cyan-900/10 border-cyan-500/20' : 'bg-orange-900/10 border-orange-500/20') : 'bg-slate-900/40 border-slate-700/40 opacity-60'">
            <i class="fas mt-0.5 text-sm flex-shrink-0" :class="{ 'fa-wrench text-cyan-400': inc.type === 'maintenance', 'fa-exclamation-circle text-red-400': inc.type !== 'maintenance' && inc.severity === 'critical', 'fa-exclamation-triangle text-yellow-400': inc.type !== 'maintenance' && inc.severity === 'warning', 'fa-info-circle text-blue-400': inc.type !== 'maintenance' && inc.severity === 'info' }"></i>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-white">{{ inc.title }}</span>
                <span v-if="inc.type === 'maintenance'" class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">维护</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded" :class="inc.status === 'active' ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-400'">{{ inc.status === 'active' ? '进行中' : '已解决' }}</span>
              </div>
              <p v-if="inc.description" class="text-xs text-slate-400 mt-1">{{ inc.description }}</p>
              <p class="text-[10px] text-slate-600 mt-1">{{ formatDateFull(inc.created_at) }}</p>
            </div>
            <div class="flex gap-1.5 shrink-0">
              <button v-if="inc.status === 'active'" @click="resolve(inc)" class="text-xs px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition cursor-pointer">解决</button>
              <button @click="remove(inc)" class="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition cursor-pointer"><i class="fas fa-trash"></i></button>
            </div>
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
import { formatDateFull } from '../../utils/format';

const props = defineProps({ monitors: Array });
defineEmits(['close']);
const { storedPassword } = useAuth();
const { addToast } = useToast();
const incidents = ref([]);
const form = ref({ title: '', description: '', severity: 'info', type: 'incident', scheduled_start: '', scheduled_end: '', affected_ids: [] });

const authFetch = async (url, opts = {}) => fetchT(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${storedPassword.value}` } });

const fetch_ = async () => { try { const r = await authFetch(`${API_BASE}/incidents/all`); if (r.ok) incidents.value = await r.json(); } catch {} };
const create = async () => {
    if (!form.value.title) { addToast('请填写标题', 'error'); return; }
    const payload = { title: form.value.title, description: form.value.description, severity: form.value.severity, type: form.value.type || 'incident' };
    if (form.value.type === 'maintenance') { payload.scheduled_start = form.value.scheduled_start ? new Date(form.value.scheduled_start).toISOString() : null; payload.scheduled_end = form.value.scheduled_end ? new Date(form.value.scheduled_end).toISOString() : null; payload.affected_monitors = (form.value.affected_ids || []).join(','); }
    try { const r = await authFetch(`${API_BASE}/incidents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (r.ok) { addToast('公告已发布', 'success'); form.value = { title: '', description: '', severity: 'info', type: 'incident', scheduled_start: '', scheduled_end: '', affected_ids: [] }; fetch_(); } else { addToast('发布失败', 'error'); } } catch { addToast('网络错误', 'error'); }
};
const resolve = async (inc) => { try { const r = await authFetch(`${API_BASE}/incidents/${inc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'resolved' }) }); if (r.ok) { addToast('已标记解决', 'success'); fetch_(); } } catch {} };
const remove = async (inc) => { if (!confirm(`确定删除「${inc.title}」？`)) return; try { const r = await authFetch(`${API_BASE}/incidents/${inc.id}`, { method: 'DELETE' }); if (r.ok) { addToast('已删除', 'success'); fetch_(); } } catch {} };

fetch_();
</script>
