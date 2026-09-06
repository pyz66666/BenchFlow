<template>
  <div class="app-header">
    <div class="header-left">
      <el-icon :size="24" color="#409EFF"><Monitor /></el-icon>
      <span class="app-title">BenchFlow</span>
    </div>
    <div class="header-right">
      <el-button :icon="SetUp" @click="$emit('manage')">设备管理</el-button>
      <el-button type="primary" :icon="Plus" @click="$emit('connect')">
        新建连接
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Monitor, SetUp } from '@element-plus/icons-vue'

defineEmits(['connect', 'manage'])
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right .el-button + .el-button {
  margin-left: 0;
}
</style>
