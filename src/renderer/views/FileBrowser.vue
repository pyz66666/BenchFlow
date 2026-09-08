<template>
  <div class="file-browser">
    <div class="file-toolbar">
      <el-input
        v-model="currentPath"
        placeholder="目录路径"
        style="flex: 1"
        @keyup.enter="navigate(currentPath)"
      >
        <template #prepend><el-icon><FolderOpened /></el-icon></template>
      </el-input>
      <el-button :icon="Back" @click="goUp" :disabled="!canGoUp">上级</el-button>
      <el-button :icon="Refresh" @click="navigate(currentPath)">刷新</el-button>
    </div>

    <div class="file-list">
      <div
        v-for="entry in entries"
        :key="entry.name"
        class="file-item"
        :class="{ 'is-dir': entry.isDir }"
        @click="onItemClick(entry)"
      >
        <el-icon color="#E6A23C" v-if="entry.isDir"><Folder /></el-icon>
        <el-icon color="#409EFF" v-else><Document /></el-icon>
        <span class="file-name">{{ entry.name }}</span>
        <span class="file-size" v-if="!entry.isDir">{{ formatSize(entry.size) }}</span>
      </div>
      <el-empty v-if="!entries.length" description="空目录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened, Folder, Document, Back, Refresh } from '@element-plus/icons-vue'
import type { DirEntry } from '@shared/types'

const props = defineProps<{ connectionId: string }>()

const currentPath = ref('/home')
const entries = ref<DirEntry[]>([])

onMounted(async () => {
  const config = await window.api.config.get()
  currentPath.value = config.fileBrowsePath || '/home'
  await navigate(currentPath.value)
})

const canGoUp = computed(() => currentPath.value !== '/' && currentPath.value !== '')

async function navigate(path: string) {
  if (!path) return
  try {
    entries.value = await window.api.ssh.listDir(props.connectionId, path)
    if (!path.endsWith('/')) path += '/'
  } catch (err: any) {
    ElMessage.error(`读取目录失败: ${err.message || err}`)
  }
}

function onItemClick(entry: DirEntry) {
  const newPath = currentPath.value.endsWith('/')
    ? currentPath.value + entry.name
    : currentPath.value + '/' + entry.name

  if (entry.isDir) {
    currentPath.value = newPath
    navigate(newPath)
  } else {
    ElMessage.info(`文件: ${newPath}`)
  }
}

function goUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = '/' + parts.join('/')
  if (!currentPath.value) currentPath.value = '/'
  navigate(currentPath.value)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}
</script>

<style scoped>
.file-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
}

.file-list {
  flex: 1;
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-item:hover {
  background: #f5f7fa;
}

.file-name {
  flex: 1;
  font-size: 14px;
}

.file-size {
  font-size: 12px;
  color: #909399;
}
</style>
