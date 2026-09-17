<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="tunnel ? '编辑隧道' : '添加隧道'"
    width="500px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="如：转发到测试机" />
      </el-form-item>
      <el-form-item label="绑定地址">
        <el-select v-model="form.bindAddress" placeholder="选择本机 IP" style="width: 100%">
          <el-option label="0.0.0.0 (所有网卡)" value="0.0.0.0" />
          <el-option label="127.0.0.1 (仅本机)" value="127.0.0.1" />
          <el-option
            v-for="ip in localIPs"
            :key="ip.ip"
            :label="`${ip.ip} (${ip.category})`"
            :value="ip.ip"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="本地端口">
        <el-input-number v-model="form.localPort" :min="1" :max="65535" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-form-item label="目标地址">
        <el-input v-model="form.remoteHost" placeholder="如 192.168.64.3" />
      </el-form-item>
      <el-form-item label="目标端口">
        <el-input-number v-model="form.remotePort" :min="1" :max="65535" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-divider content-position="left">SSH 服务器</el-divider>
      <el-form-item label="SSH 地址">
        <el-input v-model="form.sshHost" placeholder="SSH 服务器 IP" />
      </el-form-item>
      <el-form-item label="SSH 端口">
        <el-input-number v-model="form.sshPort" :min="1" :max="65535" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-form-item label="SSH 用户">
        <el-input v-model="form.sshUser" placeholder="如 root" />
      </el-form-item>
      <el-form-item label="SSH 密码">
        <el-input v-model="form.sshPassword" type="password" show-password placeholder="密码" />
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
import type { TunnelConfig, LocalIP } from '@shared/types'

const props = defineProps<{
  modelValue: boolean
  tunnel: TunnelConfig | null
  localIPs: LocalIP[]
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const form = ref<TunnelConfig>({
  id: '',
  name: '',
  localPort: 8080,
  remoteHost: '',
  remotePort: 80,
  sshHost: '',
  sshPort: 22,
  sshUser: 'root',
  sshPassword: '',
  bindAddress: '0.0.0.0'
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.tunnel) {
      form.value = { ...props.tunnel }
    } else {
      form.value = {
        id: `tunnel_${Date.now()}`,
        name: '',
        localPort: 8888,
        remoteHost: '',
        remotePort: 8888,
        sshHost: '',
        sshPort: 22,
        sshUser: 'root',
        sshPassword: '',
        bindAddress: '0.0.0.0'
      }
    }
  }
})

function onSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入名称')
    return
  }
  if (!form.value.remoteHost) {
    ElMessage.warning('请输入目标地址')
    return
  }
  if (!form.value.sshHost) {
    ElMessage.warning('请输入 SSH 服务器地址')
    return
  }
  emit('save', { ...form.value })
}
</script>
