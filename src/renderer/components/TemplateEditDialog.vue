<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="template ? '编辑模版' : '添加模版'"
    width="560px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="模版名称">
        <el-input v-model="form.name" placeholder="如：AMD基础性能测试" />
      </el-form-item>
      <el-form-item label="机器类型">
        <el-select v-model="form.machineType" style="width: 100%">
          <el-option label="通用" value="通用" />
          <el-option label="AMD" value="AMD" />
          <el-option label="Intel" value="Intel" />
          <el-option label="920B" value="920B" />
          <el-option label="950" value="950" />
        </el-select>
      </el-form-item>
      <el-form-item label="测试分类">
        <el-select v-model="form.testCategory" style="width: 100%">
          <el-option label="基础性能" value="基础性能" />
          <el-option label="基础性能+nginx-redis" value="基础性能+nginx-redis" />
          <el-option label="场景化测试" value="场景化测试" />
          <el-option label="大数据测试" value="大数据测试" />
        </el-select>
      </el-form-item>
      <el-form-item label="任务列表">
        <pre class="task-preview">{{ JSON.stringify(form.tasks, null, 2) }}</pre>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { TaskTemplate, TaskTemplateItem } from '@shared/types'

const props = defineProps<{
  modelValue: boolean
  template: TaskTemplate | null
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const form = ref<TaskTemplate>({
  id: '',
  name: '',
  machineType: '通用',
  testCategory: '基础性能',
  tasks: [],
  isPreset: false,
  createdAt: 0,
  updatedAt: 0
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.template) {
      form.value = JSON.parse(JSON.stringify(props.template))
    } else {
      form.value = {
        id: `tpl_${Date.now()}`,
        name: '',
        machineType: '通用',
        testCategory: '基础性能',
        tasks: [],
        isPreset: false,
        createdAt: 0,
        updatedAt: 0
      }
    }
  }
})

function onSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入模版名称')
    return
  }
  if (!form.value.tasks.length) {
    ElMessage.warning('任务列表不能为空')
    return
  }
  emit('save', { ...form.value })
}
</script>

<style scoped>
.task-preview {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
