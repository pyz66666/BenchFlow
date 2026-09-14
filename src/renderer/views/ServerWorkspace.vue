<template>
  <div class="server-workspace">
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
import { ref, onMounted, onUnmounted } from 'vue'
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

defineProps<{
  connectionId: string
  host: string
}>()

const activeCategory = ref('perf')
const activeView = ref('task')
const activePxeView = ref('image')
const consoleRef = ref<InstanceType<typeof ExecutionConsole> | null>(null)

function onNavigate(view: string) {
  activeView.value = view
}

function onExecTask(event: Event) {
  const detail = (event as CustomEvent).detail
  if (consoleRef.value && detail.command) {
    consoleRef.value.executeCommand(detail.command)
  }
}

onMounted(() => {
  window.addEventListener('exec-task', onExecTask)
})

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
