<template>
  <div class="app-header">
    <div class="header-left">
      <el-icon :size="24" color="#409EFF"><Monitor /></el-icon>
      <span class="app-title">BenchFlow</span>
      <el-divider direction="vertical" />
      <div class="ip-display">
        <el-icon :size="14" color="#909399"><Connection /></el-icon>
        <el-tag
          v-for="ip in localIPs"
          :key="ip.ip"
          :type="ipTagType(ip.category)"
          size="small"
          effect="plain"
          class="ip-tag"
        >
          {{ ip.category }}: {{ ip.ip }}
        </el-tag>
        <span v-if="!localIPs.length" class="ip-empty">无 IP</span>
      </div>
    </div>
    <div class="header-right">
      <el-button :icon="Connection" @click="$emit('tunnel')">SSH 隧道</el-button>
      <el-button :icon="SetUp" @click="$emit('manage')">设备管理</el-button>
      <el-button type="primary" :icon="Plus" @click="$emit('connect')">
        新建连接
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Monitor, SetUp, Connection } from '@element-plus/icons-vue'
import type { LocalIP } from '@shared/types'

defineEmits(['connect', 'manage', 'tunnel'])

const localIPs = ref<LocalIP[]>([])

onMounted(async () => {
  try {
    localIPs.value = await window.api.local.getIPs()
  } catch {
    localIPs.value = []
  }
})

function ipTagType(category: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  switch (category) {
    case '10': return 'success'
    case '141': return 'warning'
    case '90': return 'danger'
    default: return 'info'
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.ip-display {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ip-tag {
  margin: 0;
}

.ip-empty {
  font-size: 12px;
  color: #c0c4cc;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right .el-button + .el-button {
  margin-left: 0;
}
</style>
