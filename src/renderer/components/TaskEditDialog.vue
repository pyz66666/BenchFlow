<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="task ? '编辑任务' : '添加任务'"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="任务名称">
        <el-input v-model="form.name" placeholder="输入任务名称" />
      </el-form-item>
      <el-form-item label="任务类型">
        <el-radio-group v-model="form.type">
          <el-radio value="perAuto">perAuto 上传</el-radio>
          <el-radio value="testResult">服务器测试结果</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-form-item label="配置 (JSON)">
        <el-input
          v-model="configText"
          type="textarea"
          :rows="8"
          placeholder='{"key": "value"}'
        />
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
import type { TaskItem } from '@shared/types'

const props = defineProps<{
  modelValue: boolean
  task: TaskItem | null
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const form = ref<TaskItem>({
  id: '',
  name: '',
  type: 'perAuto',
  config: {},
  enabled: true
})

const configText = ref('{}')

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.task) {
      form.value = { ...props.task }
      configText.value = JSON.stringify(props.task.config, null, 2)
    } else {
      form.value = {
        id: `task_${Date.now()}`,
        name: '',
        type: 'perAuto',
        config: {},
        enabled: true
      }
      configText.value = '{}'
    }
  }
})

function onSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入任务名称')
    return
  }
  try {
    form.value.config = JSON.parse(configText.value || '{}')
  } catch {
    ElMessage.error('配置 JSON 格式错误')
    return
  }
  emit('save', { ...form.value })
}
</script>
