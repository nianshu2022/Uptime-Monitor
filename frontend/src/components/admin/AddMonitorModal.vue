<template>
  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative w-full max-w-2xl glass rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="animation:modal-in 0.25s ease-out">
        <!-- 头部 -->
        <div class="px-8 py-5 border-b border-white/5 bg-gradient-to-r from-green-900/15 to-transparent">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center"><i class="fas fa-satellite-dish text-green-400"></i></div>
              <div><h3 class="text-lg font-bold text-white">添加新监控</h3><p class="text-xs text-slate-500 mt-0.5">填写站点信息，系统将自动开始检测</p></div>
            </div>
            <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><i class="fas fa-times text-lg"></i></button>
          </div>
        </div>
        <!-- 表单 -->
        <div class="px-8 py-6 space-y-6 overflow-y-auto max-h-[65vh]">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-info-circle text-green-500"></i> 基础信息</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">网站名称 <span class="text-red-400">*</span></label>
                <input v-model="newMonitor.name" placeholder="例如: 我的博客" autofocus class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none placeholder-slate-600">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">URL 地址 <span class="text-red-400">*</span></label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500"><i class="fas fa-link text-xs"></i></span>
                  <input v-model="newMonitor.url" placeholder="https://example.com" @keyup.enter="$emit('submit')" class="input-field w-full border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none font-mono placeholder-slate-600">
                </div>
              </div>
            </div>
          </div>
          <!-- 监测频率 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-clock text-cyan-400"></i> 监测频率</h4>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <label v-for="opt in [{value:60,label:'1 分钟'},{value:180,label:'3 分钟'},{value:300,label:'5 分钟'},{value:600,label:'10 分钟'},{value:900,label:'15 分钟'},{value:1800,label:'30 分钟'}]" :key="opt.value"
                class="flex flex-col items-center justify-center py-2.5 rounded-xl border-2 cursor-pointer transition-all text-center"
                :class="Number(newMonitor.interval) === opt.value ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-slate-700 text-slate-400 hover:border-green-500/40'">
                <input type="radio" :value="opt.value" v-model="newMonitor.interval" class="sr-only">
                <span class="text-sm font-bold">{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <!-- 高级选项 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-cog text-slate-400"></i> 高级选项</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">请求方法</label>
                <select v-model="newMonitor.method" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none">
                  <option value="GET">GET</option><option value="POST">POST</option><option value="HEAD">HEAD</option><option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">关键词验证 <span class="text-xs font-normal text-slate-500">可选</span></label>
                <input v-model="newMonitor.keyword" placeholder="页面必须包含的关键词" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">User-Agent <span class="text-xs font-normal text-slate-500">可选</span></label>
                <input v-model="newMonitor.user_agent" placeholder="Uptime-Monitor/1.0" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">标签 <span class="text-xs font-normal text-slate-500">可选，逗号分隔</span></label>
                <input v-model="newMonitor.tags" placeholder="prod,web,api" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-slate-300 mb-2">自定义请求头 <span class="text-xs font-normal text-slate-500">JSON 格式，可选</span></label>
              <input v-model="newMonitor.request_headers" placeholder='{"Authorization":"Bearer xxx"}' class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600">
            </div>
            <div v-if="['POST','PUT','PATCH'].includes(newMonitor.method)" class="mt-4">
              <label class="block text-sm font-medium text-slate-300 mb-2">请求体</label>
              <textarea v-model="newMonitor.request_body" placeholder='{"key":"value"}' rows="3" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600 resize-none"></textarea>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-slate-300 mb-2">错误率阈值告警 <span class="text-xs font-normal text-slate-500">0=关闭</span></label>
              <input type="number" v-model="newMonitor.alert_error_rate" min="0" max="100" placeholder="0" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
            </div>
          </div>
          <!-- 检测功能 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-shield-alt text-slate-400"></i> 检测功能</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-green-500/50 cursor-pointer select-none transition-colors bg-slate-900/50">
                <input type="checkbox" v-model="newMonitor.check_ssl" class="w-5 h-5 rounded accent-green-500">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-yellow-500/15 rounded-lg flex items-center justify-center"><i class="fas fa-lock text-yellow-400 text-xs"></i></div>
                  <div><span class="text-sm font-medium text-slate-300">SSL 证书</span><p class="text-xs text-slate-500">自动检测证书有效期</p></div>
                </div>
              </label>
              <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-green-500/50 cursor-pointer select-none transition-colors bg-slate-900/50">
                <input type="checkbox" v-model="newMonitor.check_domain" class="w-5 h-5 rounded accent-green-500">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center"><i class="fas fa-globe text-blue-400 text-xs"></i></div>
                  <div><span class="text-sm font-medium text-slate-300">域名到期</span><p class="text-xs text-slate-500">自动查询注册到期时间</p></div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <!-- 底部 -->
        <div class="px-8 py-5 border-t border-white/5 bg-slate-900/30 flex items-center justify-between">
          <p class="text-xs text-slate-600 hidden sm:block"><i class="fas fa-keyboard mr-1"></i> Enter 快速提交</p>
          <div class="flex gap-3 ml-auto">
            <button @click="$emit('close')" class="px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-slate-700">取消</button>
            <button @click="$emit('submit')" :disabled="submitting" class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
              <i v-if="submitting" class="fas fa-spinner fa-spin text-xs"></i>
              <i v-else class="fas fa-rocket text-xs"></i>
              {{ submitting ? '添加中...' : '开始监控' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ newMonitor: Object, submitting: Boolean });
defineEmits(['close', 'submit']);
</script>
