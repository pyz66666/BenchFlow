<template>
  <div class="task-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="taskJsonPath"
          placeholder="task.json 路径"
          class="path-input"
        >
          <template #prepend><el-icon><Document /></el-icon></template>
        </el-input>
        <el-button :icon="Download" @click="loadTaskJson">加载</el-button>
        <el-button :icon="Refresh" @click="loadTaskJson" :disabled="!taskJsonPath">刷新</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="success" :icon="Check" @click="saveTaskJson" :disabled="!tasks.length">保存</el-button>
        <el-button type="primary" :icon="VideoPlay" @click="goToConsole">执行</el-button>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="editor-body">
      <!-- 左侧任务列表 -->
      <div class="task-panel">
        <div class="panel-header">
          <span>任务列表</span>
          <el-button size="small" type="primary" :icon="Plus" @click="addTask">添加任务</el-button>
        </div>
        <div class="panel-subheader" v-if="tasks.length">
          共 {{ tasks.length }} 个任务 · 拖拽排序 · 点击编辑
        </div>
        <VueDraggable
          v-model="tasks"
          :animation="150"
          handle=".drag-handle"
          class="task-drag-list"
        >
          <div v-for="(task, index) in tasks" :key="index" class="task-item" @click="editTask(index)">
            <el-icon class="drag-handle" @click.stop><Rank /></el-icon>
            <div class="task-info">
              <div class="task-info-top">
                <el-tag type="primary" size="small" effect="light">
                  {{ task.suit || '未命名' }}
                </el-tag>
                <span class="task-detail" v-if="task.ips">
                  {{ Array.isArray(task.ips) ? task.ips.length : 0 }} 台机器
                </span>
                <span class="task-detail" v-if="task.wait_time != null">
                  等待 {{ task.wait_time }}s
                </span>
              </div>
              <div class="task-info-bottom" v-if="task.ips && Array.isArray(task.ips)">
                <el-text type="info" size="small" class="ips-preview">
                  {{ task.ips.join(', ') }}
                </el-text>
              </div>
            </div>
            <div class="task-actions" @click.stop>
              <el-button size="small" type="danger" :icon="Delete" circle @click="removeTask(index)" />
            </div>
          </div>
        </VueDraggable>
        <el-empty v-if="!tasks.length" description="暂无任务，点击添加" :image-size="60" />
      </div>

      <!-- 右侧 JSON 预览 -->
      <div class="json-panel">
        <div class="panel-header">
          <span>JSON 预览</span>
          <el-button size="small" :icon="CopyDocument" @click="copyJson">复制</el-button>
        </div>
        <pre class="json-preview">{{ taskJsonPreview }}</pre>
      </div>
    </div>

    <TaskEditDialog v-model="showEditDialog" :task="editingTask" @save="onTaskSave" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, Download, Refresh, Check, VideoPlay,
  Plus, Delete, Rank, CopyDocument
} from '@element-plus/icons-vue'
import TaskEditDialog from '../components/TaskEditDialog.vue'

const props = defineProps<{ connectionId: string }>()
const emit = defineEmits<{ (e: 'navigate', view: string): void }>()

const taskJsonPath = ref('')
const tasks = ref<Record<string, any>[]>([])
const showEditDialog = ref(false)
const editingTask = ref<Record<string, any> | null>(null)
const editingIndex = ref(-1)

const taskJsonPreview = computed(() => {
  return JSON.stringify(tasks.value, null, 2)
})

onMounted(async () => {
  const config = await window.api.config.get()
  taskJsonPath.value = config.taskJsonPath
})

function fixJsonContent(raw: string): string {
  return raw.replace(/:\s*\[([^\]]*)\]/g, (_match, inner: string) => {
    const fixed = inner.split(',').map((item: string) => {
      const trimmed = item.trim()
      if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed) && !trimmed.startsWith('"')) {
        return `"${trimmed}"`
      }
      return trimmed
    }).join(', ')
    return `: [${fixed}]`
  })
}

async function loadTaskJson() {
  if (!taskJsonPath.value) {
    ElMessage.warning('请输入 task.json 路径')
    return
  }
  try {
    let content = await window.api.ssh.readFile(props.connectionId, taskJsonPath.value)
    let data
    try {
      data = JSON.parse(content)
    } catch {
      content = fixJsonContent(content)
      data = JSON.parse(content)
    }
    tasks.value = (Array.isArray(data) ? data : (data.tasks || [])).map((t: any) => {
      const { enabled, ...rest } = t
      return rest
    })
    ElMessage.success(`加载成功，共 ${tasks.value.length} 个任务`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

async function saveTaskJson() {
  if (!taskJsonPath.value) return
  try {
    const content = '[\n' + tasks.value.map(t => JSON.stringify(t)).join(',\n') + '\n]'
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
  editingTask.value = JSON.parse(JSON.stringify(tasks.value[index]))
  editingIndex.value = index
  showEditDialog.value = true
}

function onTaskSave(task: Record<string, any>) {
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

function goToConsole() {
  ElMessage.info('请到「执行日志」页面执行')
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(taskJsonPreview.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.task-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.path-input {
  width: 360px;
}

.editor-body {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

.task-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.panel-subheader {
  padding: 6px 16px;
  font-size: 12px;
  color: #909399;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.task-drag-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
}

.drag-handle {
  cursor: move;
  color: #c0c4cc;
  flex-shrink: 0;
}

.drag-handle:hover {
  color: #409eff;
}

.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-info-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-detail {
  font-size: 13px;
  color: #606266;
}

.task-info-bottom {
  display: flex;
  align-items: center;
}

.ips-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.json-panel {
  width: 400px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.json-preview {
  flex: 1;
  overflow: auto;
  padding: 12px;
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #303133;
  background: #fafafa;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
