<template>
  <div class="pxe-install">
    <div class="install-toolbar">
      <div class="toolbar-left">
        <el-icon :size="20" color="#E6A23C"><Cpu /></el-icon>
        <span class="install-title">安装 OS</span>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="VideoPlay" @click="executeInstall" :loading="running">
          执行安装
        </el-button>
        <el-button type="danger" :icon="VideoPause" @click="abortInstall" :disabled="!running">
          中断
        </el-button>
        <el-button :icon="Delete" @click="clearLog">清屏</el-button>
      </div>
    </div>

    <div class="install-info">
      <el-alert
        title="点击执行安装后将在 /home/AutoBench/ 目录下执行 bash bin/pxe_install.sh"
        type="info"
        :closable="false"
        show-icon
      />
    </div>

    <div class="console-output" ref="outputRef">
      <div v-for="(line, i) in logLines" :key="i" class="log-line">{{ line }}</div>
      <div v-if="running" class="log-line log-running">_</div>
      <el-empty v-if="!logLines.length && !running" description="点击执行安装开始" :image-size="80" />
    </div>

    <div class="console-status">
      <el-tag v-if="status === 'idle'" type="info">就绪</el-tag>
      <el-tag v-else-if="status === 'running'" type="warning">运行中</el-tag>
      <el-tag v-else-if="status === 'success'" type="success">完成 (exit 0)</el-tag>
      <el-tag v-else-if="status === 'failed'" type="danger">失败 (exit {{ exitCode }})</el-tag>
      <el-tag v-else-if="status === 'aborted'" type="danger">已中断</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cpu, VideoPlay, VideoPause, Delete } from '@element-plus/icons-vue'

const props = defineProps<{ connectionId: string }>()

const logLines = ref<string[]>([])
const running = ref(false)
const status = ref<'idle' | 'running' | 'success' | 'failed' | 'aborted'>('idle')
const exitCode = ref(0)
const outputRef = ref<HTMLElement | null>(null)

let currentExecId: string | null = null
let unsubscribe: (() => void) | null = null

async function executeInstall() {
  try {
    await ElMessageBox.confirm(
      '确认执行 PXE 安装?\n将在 /home/AutoBench/ 目录下执行 bash bin/pxe_install.sh',
      '执行确认',
      { type: 'warning' }
    )
  } catch {
    return
  }

  logLines.value = []
  status.value = 'running'
  running.value = true

  const command = 'cd /home/AutoBench && bash bin/pxe_install.sh'

  logLines.value.push(`$ ${command}`)
  logLines.value.push('─'.repeat(50))

  try {
    const { execId } = await window.api.ssh.execStream(props.connectionId, command)
    currentExecId = execId

    unsubscribe = window.api.ssh.onStream(props.connectionId, execId, (data: string) => {
      const lines = data.split('\n')
      lines.forEach(line => {
        if (line) logLines.value.push(line)
      })
      scrollToBottom()
    })

    const result = await window.api.ssh.execWait(execId)
    if ((status.value as string) === 'aborted') return
    if (result.code === 0) {
      status.value = 'success'
    } else {
      status.value = 'failed'
      exitCode.value = result.code
    }
  } catch (err: any) {
    logLines.value.push(`[ERROR] ${err.message || err}`)
    status.value = 'failed'
  } finally {
    running.value = false
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    scrollToBottom()
  }
}

async function abortInstall() {
  if (!currentExecId || !running.value) return
  try {
    await ElMessageBox.confirm('确认中断安装进程?', '中断确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await window.api.ssh.execAbort(props.connectionId, currentExecId)
    running.value = false
    status.value = 'aborted'
    logLines.value.push('\n[已中断]')
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    ElMessage.warning('安装已中断')
  } catch (err: any) {
    ElMessage.error(`中断失败: ${err.message || err}`)
  }
}

function clearLog() {
  logLines.value = []
  status.value = 'idle'
}

function scrollToBottom() {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.pxe-install {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.install-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.install-title {
  font-size: 16px;
  font-weight: 600;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.install-info {
  flex-shrink: 0;
}

.console-output {
  flex: 1;
  overflow: auto;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 12px;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.log-running {
  color: #569cd6;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.console-status {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
</style>
