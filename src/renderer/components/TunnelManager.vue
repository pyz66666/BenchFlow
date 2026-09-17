<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="SSH 隧道"
    width="720px"
    :close-on-click-modal="false"
    top="6vh"
  >
    <div class="tunnel-panel">
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

      <!-- 隧道配置 -->
      <div class="section">
        <div class="section-title">隧道配置</div>
        <el-form :model="config" label-width="100px" size="small">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="SSH 服务器">
                <el-input v-model="config.sshHost" placeholder="如 192.168.64.3" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="SSH 端口">
                <el-input-number v-model="config.sshPort" :min="1" :max="65535" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="SSH 用户">
                <el-input v-model="config.sshUser" placeholder="如 root" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="SSH 密码">
                <el-input v-model="config.sshPassword" type="password" show-password placeholder="密码" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="本地端口">
                <el-input-number v-model="config.localPort" :min="1" :max="65535" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="目标端口">
                <el-input-number v-model="config.remotePort" :min="1" :max="65535" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="目标地址">
            <el-input v-model="config.remoteHost" placeholder="如 127.0.0.1 或 192.168.1.100" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作按钮 -->
      <div class="section-actions">
        <el-button type="primary" :icon="VideoPlay" @click="startTunnel" :loading="starting">
          开启隧道
        </el-button>
        <el-button type="danger" :icon="VideoPause" @click="stopTunnel" :disabled="!tunnelRunning">
          关闭隧道
        </el-button>
      </div>

      <!-- 命令预览 -->
      <div class="section">
        <div class="section-title">
          <span>SSH 命令</span>
          <el-button size="small" text :icon="CopyDocument" @click="copyCommand">复制</el-button>
        </div>
        <pre class="command-display">{{ sshCommand }}</pre>
      </div>

      <!-- 状态 -->
      <div class="section" v-if="tunnelRunning">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>
            隧道运行中 — 其他机器可通过以下地址访问：
          </template>
          <div class="access-list">
            <div v-for="ip in localIPs" :key="ip.ip" class="access-item">
              {{ ip.ip }}:{{ config.localPort }} → {{ config.remoteHost }}:{{ config.remotePort }}
            </div>
          </div>
        </el-alert>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause, CopyDocument } from '@element-plus/icons-vue'
import type { LocalIP } from '@shared/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

const localIPs = ref<LocalIP[]>([])
const starting = ref(false)
const tunnelRunning = ref(false)
let currentTunnelId: string | null = null

const config = ref({
  sshHost: '',
  sshPort: 22,
  sshUser: 'root',
  sshPassword: '',
  localPort: 8888,
  remoteHost: '127.0.0.1',
  remotePort: 8888
})

const sshCommand = computed(() => {
  const ips = localIPs.value.length
    ? localIPs.value.map(ip => ip.ip).join(' / ')
    : '0.0.0.0'
  return `ssh -N -L 0.0.0.0:${config.value.localPort}:${config.value.remoteHost}:${config.value.remotePort} -p ${config.value.sshPort} -o StrictHostKeyChecking=no ${config.value.sshUser}@${config.value.sshHost}\n\n监听地址: ${ips}:${config.value.localPort}`
})

onMounted(async () => {
  localIPs.value = await window.api.local.getIPs()
})

async function startTunnel() {
  if (!config.value.sshHost || !config.value.sshUser) {
    ElMessage.warning('请填写 SSH 服务器信息')
    return
  }
  starting.value = true
  try {
    currentTunnelId = `tunnel_${Date.now()}`
    await window.api.tunnel.create({
      id: currentTunnelId,
      name: `隧道 ${config.value.localPort}→${config.value.remoteHost}:${config.value.remotePort}`,
      localPort: config.value.localPort,
      remoteHost: config.value.remoteHost,
      remotePort: config.value.remotePort,
      sshHost: config.value.sshHost,
      sshPort: config.value.sshPort,
      sshUser: config.value.sshUser,
      sshPassword: config.value.sshPassword,
      bindAddress: '0.0.0.0'
    })
    tunnelRunning.value = true
    ElMessage.success('隧道已开启')
  } catch (err: any) {
    ElMessage.error(`开启失败: ${err.message || err}`)
  } finally {
    starting.value = false
  }
}

async function stopTunnel() {
  if (currentTunnelId) {
    await window.api.tunnel.remove(currentTunnelId)
    currentTunnelId = null
    tunnelRunning.value = false
    ElMessage.success('隧道已关闭')
  }
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(sshCommand.value)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
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
.tunnel-panel {
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

.section-actions {
  display: flex;
  gap: 8px;
}

.command-display {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.access-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.access-item {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
}
</style>
