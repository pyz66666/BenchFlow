<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="device ? '编辑设备' : '添加设备'"
    width="460px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="如：测试服务器" />
      </el-form-item>
      <el-form-item label="IP 地址">
        <el-input v-model="form.host" placeholder="如 192.168.64.3" />
      </el-form-item>
      <el-form-item label="端口">
        <el-input v-model.number="form.port" type="number" placeholder="默认 22" />
      </el-form-item>
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="如 root" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="密码" />
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
import type { SavedDevice } from '@shared/types'

const props = defineProps<{
  modelValue: boolean
  device: SavedDevice | null
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const form = ref<SavedDevice>({
  id: '',
  name: '',
  host: '',
  port: 22,
  username: 'root',
  password: '',
  lastConnected: 0
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.device) {
      form.value = { ...props.device }
    } else {
      form.value = {
        id: `dev_${Date.now()}`,
        name: '',
        host: '',
        port: 22,
        username: 'root',
        password: '',
        lastConnected: 0
      }
    }
  }
})

function onSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入设备名称')
    return
  }
  if (!form.value.host) {
    ElMessage.warning('请输入 IP 地址')
    return
  }
  emit('save', { ...form.value })
}
</script>
