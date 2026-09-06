<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="设备管理"
    width="900px"
    :close-on-click-modal="false"
    top="6vh"
  >
    <div class="device-manager">
      <div class="device-toolbar">
        <el-button type="primary" :icon="Plus" @click="onAdd">添加设备</el-button>
        <el-input
          v-model="searchQuery"
          placeholder="搜索设备名称/IP"
          style="width: 260px; margin-left: auto"
          :prefix-icon="Search"
          clearable
        />
      </div>

      <el-table :data="filteredDevices" stripe style="width: 100%" min-height="300">
        <el-table-column label="名称" min-width="160">
          <template #default="{ row }">
            <el-tooltip
              :content="row.name"
              placement="top"
              :disabled="row.name.length <= 20"
            >
              <span class="cell-ellipsis">{{ row.name }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="host" label="IP 地址" min-width="160" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="username" label="用户名" width="100" />
        <el-table-column label="上次连接" width="170">
          <template #default="{ row }">
            {{ row.lastConnected ? formatTime(row.lastConnected) : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" :icon="Link" @click="onConnect(row)">连接</el-button>
            <el-button size="small" :icon="Edit" @click="onEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" :icon="Delete" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <DeviceEditDialog
      v-model="showEdit"
      :device="editingDevice"
      @save="onDeviceSave"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Edit, Delete, Link } from '@element-plus/icons-vue'
import DeviceEditDialog from './DeviceEditDialog.vue'
import type { SavedDevice } from '@shared/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'connect'])

const devices = ref<SavedDevice[]>([])
const searchQuery = ref('')
const showEdit = ref(false)
const editingDevice = ref<SavedDevice | null>(null)

const filteredDevices = computed(() => {
  if (!searchQuery.value) return devices.value
  const q = searchQuery.value.toLowerCase()
  return devices.value.filter(
    d => d.name.toLowerCase().includes(q) || d.host.includes(q)
  )
})

onMounted(async () => {
  await loadDevices()
})

async function loadDevices() {
  devices.value = await window.api.device.getAll()
}

function onAdd() {
  editingDevice.value = null
  showEdit.value = true
}

function onEdit(device: SavedDevice) {
  editingDevice.value = { ...device }
  showEdit.value = true
}

async function onDeviceSave(device: SavedDevice) {
  devices.value = await window.api.device.save(device)
  showEdit.value = false
  ElMessage.success('保存成功')
}

async function onRemove(device: SavedDevice) {
  try {
    await ElMessageBox.confirm(`确认删除设备 "${device.name}"?`, '提示', { type: 'warning' })
    devices.value = await window.api.device.remove(device.id)
    ElMessage.success('已删除')
  } catch {}
}

async function onConnect(device: SavedDevice) {
  emit('connect', device)
  emit('update:modelValue', false)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.device-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cell-ellipsis {
  display: inline-block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
