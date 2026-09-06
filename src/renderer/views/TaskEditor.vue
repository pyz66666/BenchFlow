<template>
  <div class="task-editor">
    <div class="task-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="taskJsonPath"
          placeholder="task.json 路径"
          style="width: 360px"
        >
          <template #prepend><el-icon><Document /></el-icon></template>
        </el-input>
        <el-button :icon="Download" @click="loadTaskJson">加载</el-button>
        <el-button :icon="Refresh" @click="loadTaskJson" :disabled="!taskJsonPath">刷新</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="success" :icon="Check" @click="saveTaskJson" :disabled="!tasks.length">保存</el-button>
        <el-button type="primary" :icon="VideoPlay" @click="executeTask" :disabled="!tasks.length">执行</el-button>
      </div>
    </div>

    <div class="task-content">
      <div class="task-list-panel">
        <div class="panel-header">
          <span>任务列表 (拖拽排序)</span>
          <el-button size="small" :icon="Plus" @click="addTask">添加任务</el-button>
        </div>
        <VueDraggable
          v-model="tasks"
          :animation="150"
          handle=".drag-handle"
          class="task-drag-list"
        >
          <div v-for="(task, index) in tasks" :key="task.id" class="task-item">
            <el-icon class="drag-handle"><Rank /></el-icon>
            <el-tag :type="task.type === 'perAuto' ? 'primary' : 'success'" size="small">
              {{ task.type === 'perAuto' ? 'perAuto' : '测试结果' }}
            </el-tag>
            <span class="task-name">{{ task.name }}</span>
            <div class="task-actions">
              <el-switch v-model="task.enabled" size="small" />
              <el-button size="small" :icon="Edit" @click="editTask(index)" />
              <el-button size="small" type="danger" :icon="Delete" @click="removeTask(index)" />
            </div>
          </div>
        </VueDraggable>
        <el-empty v-if="!tasks.length" description="暂无任务" />
      </div>

      <div class="task-json-preview">
        <div class="panel-header">
          <span>JSON 预览</span>
        </div>
        <pre class="json-preview">{{ taskJsonPreview }}</pre>
      </div>
    </div>

    <TaskEditDialog
      v-model="showEditDialog"
      :task="editingTask"
      @save="onTaskSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, Download, Refresh, Check, VideoPlay,
  Plus, Edit, Delete, Rank
} from '@element-plus/icons-vue'
import TaskEditDialog from '../components/TaskEditDialog.vue'
import type { TaskItem } from '@shared/types'

const props = defineProps<{ connectionId: string }>()

const taskJsonPath = ref('')
const tasks = ref<TaskItem[]>([])
const showEditDialog = ref(false)
const editingTask = ref<TaskItem | null>(null)
const editingIndex = ref(-1)

const taskJsonPreview = computed(() => {
  return JSON.stringify(tasks.value, null, 2)
})

async function loadTaskJson() {
  if (!taskJsonPath.value) {
    ElMessage.warning('请输入 task.json 路径')
    return
  }
  try {
    const content = await window.api.ssh.readFile(props.connectionId, taskJsonPath.value)
    const data = JSON.parse(content)
    tasks.value = Array.isArray(data) ? data : (data.tasks || [])
    ElMessage.success('加载成功')
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

async function saveTaskJson() {
  if (!taskJsonPath.value) return
  try {
    const content = JSON.stringify(tasks.value, null, 2)
    await window.api.ssh.writeFile(props.connectionId, taskJsonPath.value, content)
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}

function addTask() {
  editingTask.value = null
  editingIndex.value = -1
  showEditDialog.value = true
}

function editTask(index: number) {
  editingTask.value = { ...tasks.value[index] }
  editingIndex.value = index
  showEditDialog.value = true
}

function onTaskSave(task: TaskItem) {
  if (editingIndex.value >= 0) {
    tasks.value[editingIndex.value] = task
  } else {
    tasks.value.push(task)
  }
  showEditDialog.value = false
}

function removeTask(index: number) {
  ElMessageBox.confirm('确认删除该任务?', '提示', { type: 'warning' })
    .then(() => {
      tasks.value.splice(index, 1)
    })
    .catch(() => {})
}

async function executeTask() {
  ElMessageBox.confirm('确认执行任务?', '提示', { type: 'warning' })
    .then(() => {
      ElMessage.info('执行功能待接入')
    })
    .catch(() => {})
}
</script>

<style scoped>
.task-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-content {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.task-list-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-json-preview {
  width: 380px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 10px 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.task-drag-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: box-shadow 0.2s;
}

.task-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.drag-handle {
  cursor: move;
  color: #c0c4cc;
}

.task-name {
  flex: 1;
  font-size: 14px;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.json-preview {
  flex: 1;
  overflow: auto;
  padding: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #303133;
  background: #fafafa;
}
</style>
