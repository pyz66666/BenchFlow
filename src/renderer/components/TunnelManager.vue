<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="流量转发代理"
    width="820px"
    :close-on-click-modal="false"
    top="5vh"
  >
    <div class="proxy-panel">
      <!-- 本机 IP -->
      <div class="section">
        <div class="section-title">本机 IP</div>
        <div class="ip-list">
          <el-tag v-for="ip in localIPs" :key="ip.ip" :type="ipTagType(ip.category)" size="small" effect="plain">
            {{ ip.ip }} ({{ ip.category }})
          </el-tag>
          <span v-if="!localIPs.length" class="empty-text">无 IP</span>
        </div>
      </div>

      <!-- 代理控制 -->
      <div class="section">
        <div class="proxy-control">
          <div class="proxy-config">
            <span class="config-label">监听端口</span>
            <el-input-number v-model="proxyPort" :min="1" :max="65535" controls-position="right" :disabled="proxyRunning" size="small" style="width: 120px" />
            <span class="config-hint">监听 0.0.0.0:{{ proxyPort }}</span>
          </div>
          <div class="proxy-actions">
            <el-button type="primary" :icon="VideoPlay" @click="startProxy" :loading="starting" :disabled="proxyRunning" size="small">
              开启代理
            </el-button>
            <el-button type="danger" :icon="VideoPause" @click="stopProxy" :disabled="!proxyRunning" size="small">
              关闭代理
            </el-button>
            <el-button :icon="Delete" @click="clearLogs" :disabled="!logs.length" size="small">清空日志</el-button>
          </div>
        </div>

        <el-alert v-if="proxyRunning" type="success" :closable="false" show-icon>
          <template #title>
            代理运行中 — 其他服务器配置以下地址即可转发流量：
          </template>
          <div class="access-list">
            <div v-for="ip in localIPs" :key="ip.ip" class="access-item">
              <span class="access-cmd">export http_proxy=http://{{ ip.ip }}:{{ proxyPort }}</span>
              <el-button size="small" text :icon="CopyDocument" @click="copyText(`export http_proxy=http://${ip.ip}:${proxyPort}`)" />
            </div>
            <div class="access-item">
              <span class="access-cmd">export https_proxy=http://{{ localIPs[0]?.ip || 'YOUR_IP' }}:{{ proxyPort }}</span>
              <el-button size="small" text :icon="CopyDocument" @click="copyText(`export https_proxy=http://${localIPs[0]?.ip || 'YOUR_IP'}:${proxyPort}`)" />
            </div>
          </div>
        </el-alert>

        <el-alert v-else type="info" :closable="false" show-icon>
          <template #title>代理未运行 — 点击「开启代理」启动</template>
        </el-alert>
      </div>

      <!-- 流量日志 -->
      <div class="section">
        <div class="section-title">
          <span>流量日志</span>
          <el-tag size="small" type="info">{{ logs.length }} 条</el-tag>
        </div>
        <div class="log-container" ref="logContainer">
          <div v-for="(log, i) in logs" :key="i" class="log-entry" :class="'log-' + log.status">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-source">{{ log.sourceIP }}</span>
            <span class="log-method">{{ log.method }}</span>
            <span class="log-target">{{ log.targetHost }}:{{ log.targetPort }}</span>
            <span class="log-status" :class="'status-' + log.status">{{ statusText(log.status) }}</span>
            <span class="log-bytes" v-if="log.bytesSent || log.bytesReceived">
              ↑{{ formatBytes(log.bytesSent) }} ↓{{ formatBytes(log.bytesReceived) }}
            </span>
          </div>
          <el-empty v-if="!logs.length" description="暂无流量日志" :image-size="60" />
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause, Delete, CopyDocument } from '@element-plus/icons-vue'
import type { LocalIP, ProxyLogEntry } from '@shared/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

const localIPs = ref<LocalIP[]>([])
const proxyPort = ref(8888)
const proxyRunning = ref(false)
const starting = ref(false)
const logs = ref<ProxyLogEntry[]>([])
const logContainer = ref<HTMLElement | null>(null)

let unsubscribe: (() => void) | null = null

onMounted(async () => {
  localIPs.value = await window.api.local.getIPs()
  proxyRunning.value = await window.api.proxy.status()
  logs.value = await window.api.proxy.getLogs()

  unsubscribe = window.api.proxy.onLog((log: ProxyLogEntry) => {
    logs.value.push(log)
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(-300)
    }
    scrollToBottom()
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

async function startProxy() {
  starting.value = true
  try {
    const ok = await window.api.proxy.start(proxyPort.value)
    proxyRunning.value = ok
    if (ok) {
      ElMessage.success(`代理已开启 0.0.0.0:${proxyPort.value}`)
    } else {
      ElMessage.error('代理启动失败')
    }
  } catch (err: any) {
    ElMessage.error(`启动失败: ${err.message || err}`)
  } finally {
    starting.value = false
  }
}

async function stopProxy() {
  await window.api.proxy.stop()
  proxyRunning.value = false
  ElMessage.success('代理已关闭')
}

async function clearLogs() {
  await window.api.proxy.clearLogs()
  logs.value = []
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function statusText(status: string): string {
  switch (status) {
    case 'connected': return '已连接'
    case 'error': return '错误'
    case 'closed': return '已关闭'
    default: return '未知'
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K'
  return (bytes / (1024 * 1024)).toFixed(1) + 'M'
}

function ipTagType(category: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  switch (category) {
    case '10': return 'success'
    case '141': return 'warning'
    case '90': return 'danger'
    default: return 'info'
  }
}
</script>

<style scoped>
.proxy-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.ip-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.empty-text {
  font-size: 13px;
  color: #c0c4cc;
}

.proxy-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.proxy-config {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label {
  font-size: 14px;
  font-weight: 500;
}

.config-hint {
  font-size: 12px;
  color: #909399;
}

.proxy-actions {
  display: flex;
  gap: 6px;
}

.access-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.access-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.access-cmd {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  color: #67c23a;
}

.log-container {
  max-height: 320px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 8px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  color: #d4d4d4;
  border-bottom: 1px solid #2d2d2d;
}

.log-time {
  color: #858585;
  flex-shrink: 0;
}

.log-source {
  color: #569cd6;
  min-width: 100px;
}

.log-method {
  color: #c586c0;
  min-width: 70px;
}

.log-target {
  color: #dcdcaa;
  flex: 1;
}

.log-status {
  flex-shrink: 0;
  min-width: 50px;
}

.status-connected { color: #67c23a; }
.status-error { color: #f56c6c; }
.status-closed { color: #909399; }

.log-bytes {
  color: #858585;
  flex-shrink: 0;
}
</style>
