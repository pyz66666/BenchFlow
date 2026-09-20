<template>
  <div class="server-workspace">
    <!-- 代理配置栏 -->
    <div class="proxy-bar">
      <div class="proxy-bar-left">
        <el-icon :size="14" color="#409EFF"><Connection /></el-icon>
        <span class="proxy-label">代理:</span>
        <el-tag v-if="proxyApplied" type="success" size="small">{{ appliedProxyIP }}:8888</el-tag>
        <el-tag v-else type="info" size="small">未配置</el-tag>
      </div>
      <div class="proxy-bar-right">
        <el-button size="small" type="primary" :icon="VideoPlay" @click="applyProxy" :disabled="!matchedLocalIP">
          配置代理 ({{ matchedLocalIP || '无匹配' }})
        </el-button>
        <el-button size="small" type="danger" :icon="VideoPause" @click="removeProxy" :disabled="!proxyApplied">
          移除代理
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeCategory" class="workspace-tabs" type="border-card">
      <!-- 性能自动化测试 -->
      <el-tab-pane label="性能自动化测试" name="perf">
        <div class="category-content">
          <el-tabs v-model="activeView" class="sub-tabs" type="card">
            <el-tab-pane label="任务编排" name="task" lazy>
              <TaskEditor :connection-id="connectionId" @navigate="onNavigate" />
            </el-tab-pane>
            <el-tab-pane label="测试套件" name="testsuit" lazy>
              <TestSuitManager :connection-id="connectionId" />
            </el-tab-pane>
            <el-tab-pane label="测试套模板" name="template" lazy>
              <TaskTemplate :connection-id="connectionId" />
            </el-tab-pane>
            <el-tab-pane label="文件浏览" name="files" lazy>
              <FileBrowser :connection-id="connectionId" />
            </el-tab-pane>
            <el-tab-pane label="执行日志" name="console" lazy>
              <ExecutionConsole :connection-id="connectionId" ref="consoleRef" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-tab-pane>

      <!-- PXE 安装 -->
      <el-tab-pane label="PXE 安装" name="pxe">
        <div class="category-content">
          <el-tabs v-model="activePxeView" class="sub-tabs" type="card">
            <el-tab-pane label="配置镜像路径" name="image" lazy>
              <ImagePathConfig :connection-id="connectionId" />
            </el-tab-pane>
            <el-tab-pane label="配置机器信息" name="machine" lazy>
              <MachineInfoConfig :connection-id="connectionId" />
            </el-tab-pane>
            <el-tab-pane label="配置PXE服务器配置文件" name="server" lazy>
              <PxeServerConfig :connection-id="connectionId" />
            </el-tab-pane>
            <el-tab-pane label="安装OS" name="install" lazy>
              <PxeInstall :connection-id="connectionId" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-tab-pane>

      <!-- 配置 -->
      <el-tab-pane label="配置" name="settings">
        <SettingsPage />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import type { LocalIP } from '@shared/types'
import { selectLocalProxyIP } from '@shared/network'
import TaskEditor from './TaskEditor.vue'
import TestSuitManager from './TestSuitManager.vue'
import TaskTemplate from './TaskTemplate.vue'
import FileBrowser from './FileBrowser.vue'
import ExecutionConsole from './ExecutionConsole.vue'
import SettingsPage from './SettingsPage.vue'
import ImagePathConfig from './pxe/ImagePathConfig.vue'
import MachineInfoConfig from './pxe/MachineInfoConfig.vue'
import PxeServerConfig from './pxe/PxeServerConfig.vue'
import PxeInstall from './pxe/PxeInstall.vue'

const props = defineProps<{
  connectionId: string
  host: string
}>()

const activeCategory = ref('perf')
const activeView = ref('task')
const activePxeView = ref('image')
const consoleRef = ref<InstanceType<typeof ExecutionConsole> | null>(null)
const localIPs = ref<LocalIP[]>([])
const proxyApplied = ref(false)
const appliedProxyIP = ref('')

const matchedLocalIP = computed(() => {
  return selectLocalProxyIP(props.host, localIPs.value)
})

onMounted(async () => {
  localIPs.value = await window.api.local.getIPs()
  window.addEventListener('exec-task', onExecTask)
})

function onNavigate(view: string) {
  activeView.value = view
}

function onExecTask(event: Event) {
  const detail = (event as CustomEvent).detail
  if (consoleRef.value && detail.command) {
    consoleRef.value.executeCommand(detail.command)
  }
}

async function applyProxy() {
  if (!matchedLocalIP.value) {
    ElMessage.warning('未找到匹配网段的本机 IP')
    return
  }

  const proxyAddr = `${matchedLocalIP.value}:8888`
  try {
    await ElMessageBox.confirm(
      `将在此服务器上配置代理：\nhttp_proxy=http://${proxyAddr}\n\n将自动配置:\n- 环境变量 (/etc/profile.d + /etc/environment)\n- 包管理器 (dnf/yum/apt/pacman/zypper)\n- 当前会话\n\n配置后将自动验证。确认?`,
      '配置代理',
      { type: 'info', confirmButtonText: '确认配置', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  try {
    const loading = ElMessage({ message: '正在配置代理...', duration: 0, type: 'info' })
    if (!await window.api.proxy.status() && !await window.api.proxy.start(8888)) {
      loading.close()
      ElMessage.error('本机代理启动失败，未修改远端服务器配置')
      return
    }
    const result = await window.api.proxyConfig.apply(props.connectionId, matchedLocalIP.value, 8888)
    loading.close()

    if (result.success) {
      proxyApplied.value = true
      appliedProxyIP.value = matchedLocalIP.value
      ElMessageBox.alert(result.message, '代理配置成功', { type: 'success' })
    } else {
      ElMessageBox.alert(result.message, '代理配置完成（部分验证失败）', { type: 'warning' })
    }
  } catch (err: any) {
    ElMessage.error(`配置失败: ${err.message || err}`)
  }
}

async function removeProxy() {
  try {
    await ElMessageBox.confirm('确认移除此服务器的代理配置?\n将清理所有代理相关配置。', '移除代理', { type: 'warning' })
  } catch {
    return
  }

  try {
    const result = await window.api.proxyConfig.remove(props.connectionId)
    proxyApplied.value = false
    appliedProxyIP.value = ''
    ElMessage.success(result.message)
  } catch (err: any) {
    ElMessage.error(`移除失败: ${err.message || err}`)
  }
}

onUnmounted(() => {
  window.removeEventListener('exec-task', onExecTask)
})
</script>

<style scoped>
.server-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.proxy-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.proxy-bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.proxy-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.proxy-bar-right {
  display: flex;
  gap: 6px;
}

.workspace-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: none;
  box-shadow: none;
}

.workspace-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
}

.workspace-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.workspace-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.category-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sub-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sub-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
  margin: 0;
}

.sub-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.sub-tabs :deep(.el-tab-pane) {
  height: 100%;
}
</style>
