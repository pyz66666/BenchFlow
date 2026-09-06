<template>
  <div class="server-workspace">
    <el-tabs v-model="activeView" class="workspace-tabs">
      <el-tab-pane label="任务编排" name="task">
        <TaskEditor :connection-id="connectionId" />
      </el-tab-pane>
      <el-tab-pane label="测试套件" name="testsuit">
        <TestSuitManager :connection-id="connectionId" />
      </el-tab-pane>
      <el-tab-pane label="文件浏览" name="files">
        <FileBrowser :connection-id="connectionId" />
      </el-tab-pane>
      <el-tab-pane label="执行日志" name="console">
        <ExecutionConsole :connection-id="connectionId" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TaskEditor from './TaskEditor.vue'
import TestSuitManager from './TestSuitManager.vue'
import FileBrowser from './FileBrowser.vue'
import ExecutionConsole from './ExecutionConsole.vue'

defineProps<{
  connectionId: string
  host: string
}>()

const activeView = ref('task')
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
}

.workspace-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}
</style>
