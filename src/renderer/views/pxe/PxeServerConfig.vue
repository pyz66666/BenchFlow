<template>
  <div class="pxe-server-config">
    <div class="config-layout">
      <!-- 左侧：dhcpd.conf -->
      <div class="file-panel">
        <div class="panel-header">
          <span class="file-title">dhcpd.conf</span>
          <div class="header-actions">
            <el-button size="small" :icon="Download" @click="loadFile('dhcp')">加载</el-button>
            <el-button size="small" type="success" :icon="Check" @click="saveFile('dhcp')" :disabled="!dhcpContent">保存</el-button>
          </div>
        </div>
        <div class="panel-path">
          <el-input v-model="dhcpPath" size="small" class="path-input">
            <template #prepend><el-icon><Document /></el-icon></template>
          </el-input>
        </div>
        <el-input
          v-model="dhcpContent"
          type="textarea"
          :rows="30"
          placeholder="点击加载 dhcpd.conf"
          class="file-textarea"
          resize="none"
        />
      </div>

      <!-- 右侧：server.csv -->
      <div class="file-panel">
        <div class="panel-header">
          <span class="file-title">server.csv</span>
          <div class="header-actions">
            <el-button size="small" :icon="Download" @click="loadFile('server')">加载</el-button>
            <el-button size="small" type="success" :icon="Check" @click="saveFile('server')" :disabled="!serverContent">保存</el-button>
          </div>
        </div>
        <div class="panel-path">
          <el-input v-model="serverPath" size="small" class="path-input">
            <template #prepend><el-icon><Document /></el-icon></template>
          </el-input>
        </div>
        <el-input
          v-model="serverContent"
          type="textarea"
          :rows="30"
          placeholder="点击加载 server.csv"
          class="file-textarea"
          resize="none"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Download, Check } from '@element-plus/icons-vue'

const props = defineProps<{ connectionId: string }>()

const dhcpPath = ref('/etc/dhcp/dhcpd.conf')
const serverPath = ref('/var/www/html/script/server.csv')
const dhcpContent = ref('')
const serverContent = ref('')

const loadedFiles = ref<Record<string, boolean>>({ dhcp: false, server: false })

onMounted(() => {
  loadFile('dhcp')
  loadFile('server')
})

async function loadFile(type: 'dhcp' | 'server') {
  const path = type === 'dhcp' ? dhcpPath.value : serverPath.value
  try {
    const content = await window.api.ssh.readFile(props.connectionId, path)
    if (type === 'dhcp') {
      dhcpContent.value = content
    } else {
      serverContent.value = content
    }
    loadedFiles.value[type] = true
    ElMessage.success(`${type === 'dhcp' ? 'dhcpd.conf' : 'server.csv'} 加载成功`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

async function saveFile(type: 'dhcp' | 'server') {
  try {
    await ElMessageBox.confirm(
      `确认保存修改到 ${type === 'dhcp' ? 'dhcpd.conf' : 'server.csv'}?\n该操作会覆盖服务器上的文件！`,
      '保存确认',
      { type: 'warning' }
    )
  } catch {
    return
  }

  const path = type === 'dhcp' ? dhcpPath.value : serverPath.value
  const content = type === 'dhcp' ? dhcpContent.value : serverContent.value

  try {
    await window.api.ssh.writeFile(props.connectionId, path, content)
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}
</script>

<style scoped>
.pxe-server-config {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-layout {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.file-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.file-title {
  font-weight: 600;
}

.panel-path {
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.panel-path .path-input {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.file-textarea {
  flex: 1;
  padding: 8px;
}

.file-textarea :deep(.el-textarea__inner) {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  height: 100% !important;
  resize: none;
}
</style>
