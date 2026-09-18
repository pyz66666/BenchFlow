<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="任务模版管理"
    width="800px"
    :close-on-click-modal="false"
    top="6vh"
  >
    <div class="template-manager">
      <div class="template-toolbar">
        <el-button type="primary" :icon="Upload" @click="importTemplate">导入模版</el-button>
        <el-button :icon="Download" @click="exportTemplate">导出全部</el-button>
      </div>

      <el-table :data="templates" stripe :row-style="{ height: '52px' }" :cell-style="{ padding: '8px 0' }">
        <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="机器类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.isPreset ? 'info' : 'success'">{{ row.machineType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="testCategory" label="测试分类" min-width="140" />
        <el-table-column label="任务数" width="80">
          <template #default="{ row }">{{ row.tasks.length }}</template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.isPreset ? 'warning' : ''">{{ row.isPreset ? '预设' : '自定义' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" type="primary" @click="onApply(row)">应用</el-button>
              <el-button size="small" :icon="Edit" @click="onEdit(row)" :disabled="row.isPreset">编辑</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="onRemove(row)" :disabled="row.isPreset">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <input ref="fileInputRef" type="file" accept=".json" style="display:none" @change="onFileSelected" />
    </div>

    <TemplateEditDialog
      v-model="showEdit"
      :template="editingTemplate"
      @save="onTemplateSave"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Edit, Delete } from '@element-plus/icons-vue'
import TemplateEditDialog from './TemplateEditDialog.vue'
import type { TaskTemplate } from '@shared/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'apply'])

const templates = ref<TaskTemplate[]>([])
const showEdit = ref(false)
const editingTemplate = ref<TaskTemplate | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await loadTemplates()
})

async function loadTemplates() {
  templates.value = await window.api.template.getAll()
}

function onApply(template: TaskTemplate) {
  emit('apply', template)
  emit('update:modelValue', false)
}

function onEdit(template: TaskTemplate) {
  editingTemplate.value = { ...template, tasks: JSON.parse(JSON.stringify(template.tasks)) }
  showEdit.value = true
}

async function onTemplateSave(template: TaskTemplate) {
  templates.value = await window.api.template.save(template)
  showEdit.value = false
  ElMessage.success('保存成功')
}

async function onRemove(template: TaskTemplate) {
  try {
    await ElMessageBox.confirm(`确认删除模版 "${template.name}"?`, '提示', { type: 'warning' })
    templates.value = await window.api.template.remove(template.id)
    ElMessage.success('已删除')
  } catch {}
}

function importTemplate() {
  fileInputRef.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const text = await file.text()
  try {
    templates.value = await window.api.template.import(text)
    ElMessage.success('导入成功')
  } catch (err: any) {
    ElMessage.error(`导入失败: ${err.message || err}`)
  }
  input.value = ''
}

async function exportTemplate() {
  const json = await window.api.template.exportAll()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `benchflow_templates_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}
</script>

<style scoped>
.template-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-toolbar {
  display: flex;
  gap: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin-left: 0 !important;
}
</style>
