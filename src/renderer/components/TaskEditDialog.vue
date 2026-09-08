<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="编辑任务"
    width="640px"
    :close-on-click-modal="false"
    append-to-body
    top="8vh"
  >
    <el-form label-width="120px" v-if="form.length > 0">
      <el-form-item
        v-for="(field, index) in form"
        :key="index"
        :label="field.key"
      >
        <div class="field-row">
          <!-- suit: 文本 -->
          <el-input
            v-if="field.key === 'suit'"
            v-model="field.value"
            placeholder="套件名称"
            class="field-input"
          />

          <!-- ips: 标签输入 -->
          <div v-else-if="field.key === 'ips'" class="ips-editor">
            <el-tag
              v-for="(ip, i) in (field.value as string[])"
              :key="i"
              closable
              :disable-transitions="false"
              @close="removeIp(index, i)"
              class="ip-tag"
            >
              {{ ip }}
            </el-tag>
            <el-input
              v-if="ipInputVisible"
              ref="ipInputRef"
              v-model="ipInputValue"
              size="small"
              class="ip-input"
              @keyup.enter="confirmIp(index)"
              @blur="confirmIp(index)"
            />
            <el-button v-else size="small" :icon="Plus" @click="showIpInput">添加 IP</el-button>
          </div>

          <!-- wait_time: 数字 -->
          <el-input-number
            v-else-if="field.key === 'wait_time'"
            v-model="field.value"
            :min="0"
            controls-position="right"
            class="field-input"
          />

          <!-- 布尔值 -->
          <el-switch
            v-else-if="typeof field.value === 'boolean'"
            v-model="field.value"
          />

          <!-- 数字 -->
          <el-input-number
            v-else-if="typeof field.value === 'number'"
            v-model="field.value"
            controls-position="right"
            class="field-input"
          />

          <!-- 数组（非 ips） -->
          <div v-else-if="Array.isArray(field.value)" class="array-editor">
            <el-tag
              v-for="(item, i) in field.value"
              :key="i"
              closable
              :disable-transitions="false"
              @close="removeArrayItem(index, i)"
              class="ip-tag"
            >
              {{ item }}
            </el-tag>
            <el-input
              v-if="arrayInputVisible === index"
              v-model="arrayInputValue"
              size="small"
              class="ip-input"
              @keyup.enter="confirmArrayItem(index)"
              @blur="confirmArrayItem(index)"
            />
            <el-button v-else size="small" :icon="Plus" @click="showArrayInput(index)">添加</el-button>
          </div>

          <!-- 字符串 -->
          <el-input
            v-else
            v-model="field.value"
            class="field-input"
          />

          <!-- 删除字段 -->
          <el-button
            type="danger"
            :icon="Delete"
            circle
            size="small"
            @click="removeField(index)"
            :disabled="field.key === 'suit'"
          />
        </div>
      </el-form-item>

      <!-- 添加新字段 -->
      <el-form-item label=" ">
        <el-button :icon="Plus" @click="addField">添加字段</el-button>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

interface FieldItem {
  key: string
  value: any
}

const props = defineProps<{
  modelValue: boolean
  task: Record<string, any> | null
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const form = ref<FieldItem[]>([])
const ipInputVisible = ref(false)
const ipInputValue = ref('')
const ipInputRef = ref<any>(null)
const arrayInputVisible = ref(-1)
const arrayInputValue = ref('')

watch(() => props.modelValue, (val) => {
  if (val && props.task) {
    form.value = Object.entries(props.task)
      .filter(([key]) => key !== 'enabled')
      .map(([key, value]) => ({ key, value: JSON.parse(JSON.stringify(value)) }))
  } else if (val && !props.task) {
    form.value = [
      { key: 'suit', value: '' },
      { key: 'ips', value: [] },
      { key: 'wait_time', value: 60 }
    ]
  }
})

function showIpInput() {
  ipInputVisible.value = true
  nextTick(() => ipInputRef.value?.input?.focus())
}

function confirmIp(fieldIndex: number) {
  const val = ipInputValue.value.trim()
  if (val) {
    const field = form.value[fieldIndex]
    if (!Array.isArray(field.value)) field.value = []
    if (!field.value.includes(val)) {
      field.value.push(val)
    }
  }
  ipInputVisible.value = false
  ipInputValue.value = ''
}

function removeIp(fieldIndex: number, ipIndex: number) {
  form.value[fieldIndex].value.splice(ipIndex, 1)
}

function showArrayInput(fieldIndex: number) {
  arrayInputVisible.value = fieldIndex
}

function confirmArrayItem(fieldIndex: number) {
  const val = arrayInputValue.value.trim()
  if (val) {
    const field = form.value[fieldIndex]
    if (!Array.isArray(field.value)) field.value = []
    field.value.push(val)
  }
  arrayInputVisible.value = -1
  arrayInputValue.value = ''
}

function removeArrayItem(fieldIndex: number, itemIndex: number) {
  form.value[fieldIndex].value.splice(itemIndex, 1)
}

function addField() {
  form.value.push({ key: 'new_field', value: '' })
}

function removeField(index: number) {
  form.value.splice(index, 1)
}

function onSave() {
  const suitField = form.value.find(f => f.key === 'suit')
  if (!suitField || !suitField.value) {
    ElMessage.warning('suit 字段不能为空')
    return
  }
  const result: Record<string, any> = {}
  for (const field of form.value) {
    result[field.key] = field.value
  }
  emit('save', result)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.field-input {
  flex: 1;
}

.ips-editor,
.array-editor {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  padding: 4px 8px;
  background: #fafafa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  min-height: 32px;
}

.ip-tag {
  margin: 0;
}

.ip-input {
  width: 140px;
}
</style>
