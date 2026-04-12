<template>
  <transition name="fade">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)" @click.self="$emit('close')">
      <div class="glass rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div class="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div><h3 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-bell text-green-400"></i> 通知渠道管理</h3><p class="text-xs text-slate-500 mt-0.5">配置告警通知的推送渠道</p></div>
          <button @click="$emit('close')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <!-- 列表视图 -->
          <div v-if="!editing">
            <div v-if="channels.length === 0 && !channelsLoading" class="text-center py-12"><i class="fas fa-bell-slash text-3xl text-slate-600 mb-3"></i><p class="text-slate-500 text-sm">暂无通知渠道</p></div>
            <div v-if="channelsLoading" class="space-y-3"><div v-for="i in 2" :key="i" class="h-16 rounded-xl bg-slate-800/50 animate-pulse"></div></div>
            <div v-for="ch in channels" :key="ch.id" class="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-2.5 hover:border-slate-600/50 transition-all group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" :class="typeInfo[ch.type]?.bg || 'bg-slate-700'">
                <span class="flex items-center justify-center" v-html="typeInfo[ch.type]?.icon || '<i class=\'fas fa-bell text-slate-400\'></i>'"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2"><span class="font-medium text-white text-sm truncate">{{ ch.name }}</span><span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">{{ typeInfo[ch.type]?.label || ch.type }}</span></div>
              </div>
              <button @click="toggleCh(ch)" class="w-10 h-5 rounded-full transition-all cursor-pointer relative shrink-0" :class="ch.enabled ? 'bg-green-600' : 'bg-slate-600'">
                <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="ch.enabled ? 'left-[22px]' : 'left-0.5'"></span>
              </button>
              <div class="flex items-center gap-1.5">
                <button @click="testCh(ch)" class="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition cursor-pointer flex items-center gap-1.5"><i class="fas fa-play text-[9px]"></i> 测试</button>
                <button @click="editCh(ch)" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"><i class="fas fa-pen text-[10px]"></i></button>
                <button @click="deleteCh(ch)" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"><i class="fas fa-trash text-[10px]"></i></button>
              </div>
            </div>
            <button @click="editing = { type: 'dingtalk', name: '', config: {} }" class="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-500 hover:border-green-500/40 hover:text-green-400 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer">
              <i class="fas fa-plus text-xs"></i> 添加通知渠道
            </button>
          </div>
          <!-- 编辑/添加表单 -->
          <div v-else>
            <button @click="editing = null" class="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition mb-5 cursor-pointer"><i class="fas fa-arrow-left text-xs"></i> 返回列表</button>
            <h4 class="text-white font-bold mb-5">{{ editing.id ? '编辑渠道' : '添加渠道' }}</h4>
            <div class="mb-5" v-if="!editing.id">
              <label class="block text-xs text-slate-400 mb-2">渠道类型</label>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button v-for="(info, key) in typeInfo" :key="key" @click="editing.type = key; editing.config = {}"
                  class="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all cursor-pointer text-center"
                  :class="editing.type === key ? 'border-green-500 bg-green-900/20' : 'border-slate-700 hover:border-green-500/30'">
                  <span class="text-lg flex items-center justify-center" v-html="info.icon"></span>
                  <span class="text-[11px] font-medium" :class="editing.type === key ? 'text-green-400' : 'text-slate-400'">{{ info.label }}</span>
                </button>
              </div>
            </div>
            <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">渠道名称</label><input v-model="editing.name" placeholder="例如：研发群机器人" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none placeholder-slate-600"></div>
            <!-- 钉钉 -->
            <template v-if="editing.type === 'dingtalk'">
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Access Token</label><input v-model="editing.config.access_token" :placeholder="editing.id ? '留空则保留原密钥' : '机器人的 access_token'" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">签名密钥 (Secret)</label><input v-model="editing.config.secret" :placeholder="editing.id ? '留空则保留原密钥' : '加签的 Secret'" type="password" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
            </template>
            <!-- 企业微信 -->
            <template v-if="editing.type === 'wecom'">
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Webhook Key</label><input v-model="editing.config.key" :placeholder="editing.id ? '留空' : 'Webhook URL 中的 key'" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
            </template>
            <!-- 飞书 -->
            <template v-if="editing.type === 'feishu'">
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Webhook URL</label><input v-model="editing.config.webhook_url" placeholder="https://open.feishu.cn/..." class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">签名密钥 <span class="text-slate-600">可选</span></label><input v-model="editing.config.secret" type="password" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
            </template>
            <!-- Telegram -->
            <template v-if="editing.type === 'telegram'">
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Bot Token</label><input v-model="editing.config.bot_token" type="password" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Chat ID</label><input v-model="editing.config.chat_id" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
            </template>
            <!-- Webhook -->
            <template v-if="editing.type === 'webhook'">
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Webhook URL</label><input v-model="editing.config.url" placeholder="https://your-server.com/webhook" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">HTTP Method</label><input v-model="editing.config.method" placeholder="POST" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">自定义 Headers</label><input v-model="editing.config.headers" placeholder='{"Authorization":"Bearer xxx"}' class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
            </template>
            <!-- Email -->
            <template v-if="editing.type === 'email'">
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">Resend API Key</label><input v-model="editing.config.api_key" type="password" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">发件人邮箱</label><input v-model="editing.config.from_email" placeholder="Uptime Monitor <notify@yourdomain.com>" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
              <div class="mb-4"><label class="block text-xs text-slate-400 mb-2">收件人邮箱</label><input v-model="editing.config.to_email" placeholder="admin@example.com" class="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono"></div>
            </template>
            <button @click="saveCh" :disabled="saving" class="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-all disabled:opacity-50 cursor-pointer mt-2">
              {{ saving ? '保存中...' : (editing.id ? '保存修改' : '添加渠道') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { API_BASE, fetchT } from '../../utils/api';

const emit = defineEmits(['close']);
const { storedPassword } = useAuth();
const { addToast } = useToast();

const channels = ref([]);
const channelsLoading = ref(false);
const editing = ref(null);
const saving = ref(false);

const typeInfo = {
    dingtalk: { icon: '<iconify-icon icon="ant-design:dingding-outlined" class="text-blue-400 text-xl"></iconify-icon>', label: '钉钉', bg: 'bg-blue-900/40' },
    wecom: { icon: '<iconify-icon icon="ant-design:wechat-filled" class="text-green-400 text-xl"></iconify-icon>', label: '企业微信', bg: 'bg-green-900/40' },
    feishu: { icon: '<iconify-icon icon="icon-park-outline:lark" class="text-purple-400 text-lg"></iconify-icon>', label: '飞书', bg: 'bg-purple-900/40' },
    telegram: { icon: '<i class="fab fa-telegram text-sky-400 text-lg"></i>', label: 'Telegram', bg: 'bg-sky-900/40' },
    webhook: { icon: '<i class="fas fa-link text-orange-400 text-lg"></i>', label: 'Webhook', bg: 'bg-orange-900/40' },
    email: { icon: '<i class="fas fa-envelope text-rose-400 text-lg"></i>', label: 'Email', bg: 'bg-rose-900/40' },
};

const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers, 'Authorization': `Bearer ${storedPassword.value}` };
    return fetchT(url, { ...options, headers });
};

const fetchChannels = async () => {
    channelsLoading.value = true;
    try { const res = await authFetch(`${API_BASE}/notification-channels`); if (res?.ok) channels.value = await res.json(); } catch {}
    channelsLoading.value = false;
};

const saveCh = async () => {
    const ch = editing.value; if (!ch.name || !ch.type) { addToast('请填写渠道名称', 'error'); return; }
    saving.value = true;
    try {
        const url = ch.id ? `${API_BASE}/notification-channels/${ch.id}` : `${API_BASE}/notification-channels`;
        const res = await authFetch(url, { method: ch.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: ch.type, name: ch.name, config: ch.config }) });
        if (res.ok) { addToast(ch.id ? '渠道已更新' : '渠道已添加', 'success'); editing.value = null; fetchChannels(); }
        else { const d = await res.json(); addToast(d.error || '操作失败', 'error'); }
    } catch { addToast('网络错误', 'error'); }
    saving.value = false;
};

const editCh = (ch) => {
    let parsedConfig = {}; try { parsedConfig = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {}); } catch {}
    const secretKeys = ['secret', 'token', 'access_token', 'bot_token', 'key'];
    const cleanConfig = {};
    for (const [k, v] of Object.entries(parsedConfig)) { const isSecret = secretKeys.some(s => k.toLowerCase().includes(s)); cleanConfig[k] = (isSecret || (typeof v === 'string' && v.includes('****'))) ? '' : v; }
    editing.value = { id: ch.id, type: ch.type, name: ch.name, config: cleanConfig };
};

const deleteCh = async (ch) => {
    if (!confirm(`确定删除通知渠道「${ch.name}」？`)) return;
    try { const res = await authFetch(`${API_BASE}/notification-channels/${ch.id}`, { method: 'DELETE' }); if (res.ok) { addToast('渠道已删除', 'success'); fetchChannels(); } } catch { addToast('删除失败', 'error'); }
};

const toggleCh = async (ch) => {
    try { const res = await authFetch(`${API_BASE}/notification-channels/${ch.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: ch.enabled ? 0 : 1 }) }); if (res.ok) ch.enabled = ch.enabled ? 0 : 1; } catch { addToast('操作失败', 'error'); }
};

const testCh = async (ch) => {
    addToast('正在发送测试消息...', 'info');
    try { const res = await authFetch(`${API_BASE}/notification-channels/${ch.id}/test`, { method: 'POST' }); const d = await res.json(); addToast(d.success ? '测试消息发送成功！' : '测试失败，请检查配置', d.success ? 'success' : 'error'); } catch { addToast('测试失败', 'error'); }
};

// 打开时加载
fetchChannels();
</script>
