<template>
  <div class="execution-console">
    <div class="console-toolbar">
      <el-input
        v-model="execCommand"
        placeholder="执行命令 (如 cd /opt/pxe && ./run.sh)"
        style="flex: 1"
        @keyup.enter="execute"
      >
        <template #prepend><el-icon><Monitor /></el-icon></template>
      </el-input>
      <el-button type="primary" :icon="VideoPlay" @click="execute" :loading="running">
        执行
      </el-button>
      <el-button type="danger" :icon="VideoPause" @click="abort" :disabled="!running">
        中断
      </el-button>
      <el-button :icon="Delete" @click="clearLog">清屏</el-button>
    </div>

    <div class="console-output" ref="outputRef">
      <div v-for="(line, i) in logLines" :key="i" class="log-line">{{ line }}</div>
      <div v-if="running" class="log-line log-running">_</div>
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
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause, Delete, Monitor } from '@element-plus/icons-vue'

const props = defineProps<{ connectionId: string }>()

const execCommand = ref('')
const logLines = ref<string[]>([])
const running = ref(false)
const status = ref<'idle' | 'running' | 'success' | 'failed' | 'aborted'>('idle')
const exitCode = ref(0)
const outputRef = ref<HTMLElement | null>(null)

let unsubscribe: (() => void) | null = null

async function execute() {
  if (!execCommand.value || running.value) return

  logLines.value = []
  status.value = 'running'
  running.value = true

  logLines.value.push(`$ ${execCommand.value}`)
  logLines.value.push('─'.repeat(50))

  unsubscribe = window.api.ssh.onStream(props.connectionId, (data: string) => {
    const lines = data.split('\n')
    lines.forEach(line => {
      if (line) logLines.value.push(line)
    })
    scrollToBottom()
  })

  try {
    const result = await window.api.ssh.execStream(props.connectionId, execCommand.value)
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

async function abort() {
  ElMessage.info('中断功能待接入 execId')
  running.value = false
  status.value = 'aborted'
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
.execution-console {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.console-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
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
}
</style>
