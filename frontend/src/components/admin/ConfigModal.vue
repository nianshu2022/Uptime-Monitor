<template>
  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative w-full max-w-xl glass rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="animation:modal-in 0.25s ease-out; max-height: 85vh">
        <div class="px-8 py-5 border-b border-white/5 bg-gradient-to-r from-purple-900/15 to-transparent flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center"><i class="fas fa-sliders-h text-purple-400"></i></div>
            <div><h3 class="text-lg font-bold text-white">{{ configTarget?.name }}</h3><p class="text-xs text-slate-500 mt-0.5">功能开关与通知配置</p></div>
          </div>
          <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><i class="fas fa-times text-lg"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- 基础信息 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><i class="fas fa-edit text-green-500 text-[10px]"></i> 基础信息</h4>
            <div class="space-y-3">
              <div><label class="block text-xs font-medium text-slate-400 mb-1">网站名称</label><input v-model="configForm.name" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none"></div>
              <div><label class="block text-xs font-medium text-slate-400 mb-1">URL 地址</label><input v-model="configForm.url" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none font-mono"></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-medium text-slate-400 mb-1">关键词验证</label><input v-model="configForm.keyword" placeholder="留空则不检测" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none"></div>
                <div><label class="block text-xs font-medium text-slate-400 mb-1">User-Agent</label><input v-model="configForm.user_agent" placeholder="Uptime-Monitor/1.0" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none font-mono text-xs"></div>
              </div>
            </div>
          </div>
          <!-- 高级请求设置 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><i class="fas fa-cogs text-blue-500 text-[10px]"></i> 高级请求设置</h4>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-400 mb-1">请求方法</label>
                  <select v-model="configForm.method" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none"><option value="GET">GET</option><option value="POST">POST</option><option value="HEAD">HEAD</option><option value="PUT">PUT</option></select>
                </div>
                <div><label class="block text-xs font-medium text-slate-400 mb-1">标签</label><input v-model="configForm.tags" placeholder="prod,web,api" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none placeholder-slate-600"></div>
              </div>
              <div><label class="block text-xs font-medium text-slate-400 mb-1">自定义请求头</label><input v-model="configForm.request_headers" placeholder='{"Authorization":"Bearer xxx"}' class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600 text-xs"></div>
              <div v-if="['POST','PUT','PATCH'].includes(configForm.method)"><label class="block text-xs font-medium text-slate-400 mb-1">请求体</label><textarea v-model="configForm.request_body" placeholder='{"key":"value"}' rows="2" class="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600 resize-none text-xs"></textarea></div>
            </div>
          </div>
          <!-- 功能开关 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">检测功能</h4>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 cursor-pointer"><div class="flex items-center gap-2 text-sm text-slate-300"><i class="fas fa-lock text-blue-400 w-4"></i><span>SSL 证书到期检测</span></div><input type="checkbox" v-model="configForm.check_ssl" class="w-4 h-4 rounded accent-green-500"></label>
              <label class="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 cursor-pointer"><div class="flex items-center gap-2 text-sm text-slate-300"><i class="fas fa-globe text-green-400 w-4"></i><span>域名到期检测</span></div><input type="checkbox" v-model="configForm.check_domain" class="w-4 h-4 rounded accent-green-500"></label>
            </div>
          </div>
          <!-- 监测频率 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">监测频率</h4>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <label v-for="opt in [{value:60,label:'1 min'},{value:180,label:'3 min'},{value:300,label:'5 min'},{value:600,label:'10 min'},{value:900,label:'15 min'},{value:1800,label:'30 min'}]" :key="opt.value"
                class="flex flex-col items-center justify-center py-2 rounded-lg border-2 cursor-pointer transition-all text-center"
                :class="Number(configForm.interval) === opt.value ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-slate-700 text-slate-400 hover:border-green-500/40'">
                <input type="radio" :value="opt.value" v-model="configForm.interval" class="sr-only"><span class="text-sm font-bold">{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <!-- 告警静默窗口 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">告警通知频率</h4>
            <p class="text-xs text-slate-500 mb-4">同一问题在窗口时间内只发送一次告警。</p>
            <div class="mb-5 pb-4 border-b border-slate-700/50">
              <div class="flex items-center gap-2 text-xs text-slate-400 mb-2"><i class="fas fa-exclamation-triangle text-orange-400 w-3"></i><span>错误率阈值告警</span></div>
              <div class="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <div class="text-xs text-slate-500 mr-2 flex-1">0=关闭。如设定 50，表示近 5 分钟内失败率 ≥50% 时才告警。</div>
                <div class="flex items-center gap-2 shrink-0">
                  <input type="number" v-model="configForm.alert_error_rate" min="0" max="100" placeholder="0" class="w-16 border border-slate-700 rounded text-center px-1 py-1 text-sm bg-slate-800 text-white focus:border-green-500 outline-none block">
                  <span class="text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
            <div class="space-y-4">
              <div v-for="item in silenceItems" :key="item.key">
                <div class="flex items-center gap-2 text-xs text-slate-400 mb-2"><i :class="item.icon + ' w-3'"></i><span>{{ item.label }}</span></div>
                <div class="grid grid-cols-5 gap-1.5">
                  <label v-for="opt in silenceOptions" :key="opt.value"
                    class="flex flex-col items-center justify-center py-2 rounded-lg border-2 cursor-pointer transition-all text-center"
                    :class="configForm[item.key] === opt.value ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-slate-700 text-slate-400 hover:border-green-500/40'">
                    <input type="radio" :value="opt.value" v-model="configForm[item.key]" class="sr-only"><span class="text-sm font-bold">{{ opt.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-white/5 bg-slate-900/30">
          <button @click="$emit('save')" :disabled="configSaving" class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
            <i v-if="configSaving" class="fas fa-spinner fa-spin"></i><i v-else class="fas fa-save"></i>
            {{ configSaving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ configTarget: Object, configForm: Object, configSaving: Boolean });
defineEmits(['close', 'save']);

const silenceOptions = [{ value: 1, label: '1h' }, { value: 4, label: '4h' }, { value: 12, label: '12h' }, { value: 24, label: '24h' }, { value: 72, label: '72h' }];
const silenceItems = [
    { key: 'alert_silence_uptime', label: '可用性告警', icon: 'fas fa-heartbeat text-red-400' },
    { key: 'alert_silence_ssl', label: 'SSL 证书告警', icon: 'fas fa-lock text-blue-400' },
    { key: 'alert_silence_domain', label: '域名到期告警', icon: 'fas fa-globe text-green-400' },
];
</script>
