<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="新建 SSH 连接"
    width="440px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="80px" @submit.prevent="onConnect">
      <el-form-item label="IP 地址">
        <el-input v-model="form.host" placeholder="如 192.168.64.3" />
      </el-form-item>
      <el-form-item label="端口">
        <el-input v-model.number="form.port" placeholder="默认 22" type="number" />
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
      <el-button type="primary" :loading="loading" @click="onConnect">连接</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'connected'])

const loading = ref(false)
const form = reactive({
  host: '',
  port: 22,
  username: 'root',
  password: ''
})

async function onConnect() {
  if (!form.host || !form.username || !form.password) {
    ElMessage.warning('请填写完整连接信息')
    return
  }

  loading.value = true
  const id = `conn_${Date.now()}`

  try {
    await window.api.ssh.connect({
      id,
      host: form.host,
      port: form.port || 22,
      username: form.username,
      password: form.password
    })
    ElMessage.success('连接成功')
    emit('connected', { id, host: form.host, username: form.username, password: form.password })
    emit('update:modelValue', false)
    form.password = ''
  } catch (err: any) {
    ElMessage.error(`连接失败: ${err.message || err}`)
  } finally {
    loading.value = false
  }
}
</script>
