<template>
  <div class="file-browser">
    <div class="browser-layout">
      <!-- 左侧文件列表 -->
      <div class="file-list-panel">
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
            :class="{ 'is-dir': entry.isDir, 'is-selected': selectedFile?.name === entry.name }"
            @click="onItemClick(entry)"
          >
            <el-icon color="#E6A23C" v-if="entry.isDir"><Folder /></el-icon>
            <el-icon color="#409EFF" v-else><Document /></el-icon>
            <span class="file-name">{{ entry.name }}</span>
            <span class="file-size" v-if="!entry.isDir">{{ formatSize(entry.size) }}</span>
          </div>
          <el-empty v-if="!entries.length" description="空目录" :image-size="60" />
        </div>
      </div>

      <!-- 右侧预览面板 -->
      <div class="preview-panel" v-if="showPreview">
        <div class="preview-header">
          <div class="preview-title">
            <el-icon color="#409EFF"><Document /></el-icon>
            <span class="preview-filename">{{ selectedFile?.name }}</span>
          </div>
          <div class="preview-actions">
            <el-button size="small" :icon="Download" @click="downloadFile">下载</el-button>
            <el-button size="small" :icon="Close" @click="closePreview">关闭</el-button>
          </div>
        </div>
        <div class="preview-content">
          <pre v-if="previewContent !== null" class="preview-text">{{ previewContent }}</pre>
          <el-skeleton v-else :rows="6" animated style="padding: 16px" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened, Folder, Document, Back, Refresh, Download, Close } from '@element-plus/icons-vue'
import type { DirEntry } from '@shared/types'

const props = defineProps<{ connectionId: string }>()

const currentPath = ref('/home')
const entries = ref<DirEntry[]>([])
const selectedFile = ref<DirEntry | null>(null)
const previewContent = ref<string | null>(null)
const showPreview = ref(false)

const canGoUp = computed(() => currentPath.value !== '/' && currentPath.value !== '')

onMounted(async () => {
  const config = await window.api.config.get()
  currentPath.value = config.fileBrowsePath || '/home'
  await navigate(currentPath.value)
})

async function navigate(path: string) {
  if (!path) return
  try {
    entries.value = await window.api.ssh.listDir(props.connectionId, path)
    if (!path.endsWith('/')) currentPath.value = path + '/'
  } catch (err: any) {
    ElMessage.error(`读取目录失败: ${err.message || err}`)
  }
}

async function onItemClick(entry: DirEntry) {
  const newPath = currentPath.value.endsWith('/')
    ? currentPath.value + entry.name
    : currentPath.value + '/' + entry.name

  if (entry.isDir) {
    currentPath.value = newPath
    await navigate(newPath)
  } else {
    selectedFile.value = entry
    showPreview.value = true
    previewContent.value = null
    try {
      const content = await window.api.ssh.readFile(props.connectionId, newPath)
      previewContent.value = content
    } catch (err: any) {
      previewContent.value = `[无法预览此文件] ${err.message || err}`
    }
  }
}

function closePreview() {
  showPreview.value = false
  selectedFile.value = null
  previewContent.value = null
}

function downloadFile() {
  ElMessage.info('下载功能开发中')
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
  overflow: hidden;
}

.browser-layout {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.file-list-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.file-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
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

.file-item.is-selected {
  background: #ecf5ff;
}

.file-name {
  flex: 1;
  font-size: 14px;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.preview-panel {
  width: 480px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-filename {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.preview-actions {
  display: flex;
  gap: 6px;
}

.preview-content {
  flex: 1;
  overflow: auto;
}

.preview-text {
  margin: 0;
  padding: 12px;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  background: #fafafa;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
