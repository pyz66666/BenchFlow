<template>
  <div class="settings-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Setting /></el-icon>
          <span>路径配置</span>
        </div>
      </template>

      <el-form :model="config" label-width="160px" label-position="right">
        <el-form-item label="task.json 路径">
          <el-input v-model="config.taskJsonPath" placeholder="/home/AutoBench/config/task.json" />
        </el-form-item>
        <el-form-item label="测试套件目录">
          <el-input v-model="config.testSuitDirPath" placeholder="/home/AutoBench/config/testsuit" />
        </el-form-item>
        <el-form-item label="执行命令">
          <el-input v-model="config.execCommand" placeholder="cd /home/AutoBench && ./run.sh" />
        </el-form-item>
        <el-form-item label="执行目录">
          <el-input v-model="config.execWorkDir" placeholder="/home/AutoBench" />
        </el-form-item>
        <el-form-item label="文件浏览目录">
          <el-input v-model="config.fileBrowsePath" placeholder="/home/AutoBench/config" />
        </el-form-item>
      </el-form>

      <div class="settings-footer">
        <el-button @click="loadConfig">重置</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import type { AppConfig } from '@shared/types'

const config = ref<AppConfig>({
  taskJsonPath: '',
  testSuitDirPath: '',
  execCommand: '',
  execWorkDir: '',
  fileBrowsePath: ''
})

onMounted(async () => {
  await loadConfig()
})

async function loadConfig() {
  config.value = await window.api.config.get()
}

async function saveConfig() {
  await window.api.config.save(config.value)
  ElMessage.success('配置已保存')
}
</script>

<style scoped>
.settings-page {
  padding: 16px;
  max-width: 700px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
