<template>
  <div class="image-path-config">
    <div class="config-layout">
      <!-- 左侧：OS 读取 -->
      <div class="os-panel">
        <div class="panel-header">
          <span>OS 读取</span>
          <el-select v-model="isoRoot" placeholder="选择目录" style="width: 160px" @change="loadIsoTree">
            <el-option label="/iso/" value="/iso/" />
            <el-option label="/home/iso/" value="/home/iso/" />
          </el-select>
          <el-button :icon="Refresh" size="small" @click="loadIsoTree">刷新</el-button>
        </div>

        <div class="os-tree-container">
          <el-tree
            v-show="treeData.length"
            :data="treeData"
            :props="treeProps"
            node-key="path"
            :load="loadNode"
            lazy
            :expand-on-click-node="true"
            :highlight-current="true"
            @node-click="onNodeClick"
            ref="treeRef"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <el-icon v-if="data.isDir" color="#E6A23C"><Folder /></el-icon>
                <el-icon v-else color="#409EFF"><Document /></el-icon>
                <span class="tree-label" :title="node.label">{{ node.label }}</span>
              </span>
            </template>
          </el-tree>
          <el-empty v-show="!treeData.length && !loading" description="点击刷新加载目录" :image-size="60" />
          <div v-show="loading" class="loading-tip">
            <el-icon class="is-loading"><Loading /></el-icon>
            加载中...
          </div>
        </div>
      </div>

      <!-- 右侧：OS 路径配置 -->
      <div class="config-panel">
        <div class="panel-header">
          <span>OS 路径配置 (download.txt)</span>
          <div class="config-actions">
            <el-button size="small" :icon="Download" @click="loadDownloadTxt">加载</el-button>
            <el-button size="small" type="success" :icon="Check" @click="saveDownloadTxt" :disabled="!downloadContent">保存</el-button>
          </div>
        </div>

        <div class="config-tip">
          <el-text type="info" size="small">
            左侧选中文件后点击「写入路径」可将绝对路径添加到下方配置中
          </el-text>
        </div>

        <div class="selected-file-bar" v-if="selectedFilePath">
          <el-tag type="primary" size="small">
            <el-icon><Document /></el-icon>
            {{ selectedFilePath }}
          </el-tag>
          <el-button size="small" type="primary" :icon="Plus" @click="writePathToConfig">写入路径</el-button>
        </div>

        <el-input
          v-model="downloadContent"
          type="textarea"
          :rows="20"
          placeholder="download.txt 内容"
          class="config-textarea"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Folder, Document, Refresh, Download, Check, Plus, Loading } from '@element-plus/icons-vue'
import type { DirEntry } from '@shared/types'

const props = defineProps<{ connectionId: string }>()

interface TreeNode {
  label: string
  path: string
  isDir: boolean
  isLeaf: boolean
  children?: TreeNode[]
}

const isoRoot = ref('/iso/')
const treeData = ref<TreeNode[]>([])
const treeRef = ref<any>(null)
const treeProps = { label: 'label', children: 'children', isLeaf: 'isLeaf' }
const selectedFilePath = ref('')
const downloadContent = ref('')
const downloadTxtPath = ref('/home/AutoBench/download.txt')
const loading = ref(false)

onMounted(async () => {
  try {
    const config = await window.api.config.get()
    downloadTxtPath.value = config.downloadTxtPath || '/home/AutoBench/download.txt'
  } catch {}
  await loadIsoTree()
})

async function loadIsoTree() {
  loading.value = true
  treeData.value = []
  try {
    const entries = await window.api.ssh.listDir(props.connectionId, isoRoot.value)
    treeData.value = entries.map((e: DirEntry) => ({
      label: e.name,
      path: joinPath(isoRoot.value, e.name),
      isDir: e.isDir,
      isLeaf: !e.isDir
    }))
  } catch (err: any) {
    ElMessage.error(`读取目录失败: ${err.message || err}`)
  } finally {
    loading.value = false
  }
}

async function loadNode(node: any, resolve: (data: TreeNode[]) => void) {
  const path = node.data.path
  if (!node.data.isDir) {
    resolve([])
    return
  }
  try {
    const entries = await window.api.ssh.listDir(props.connectionId, path)
    resolve(entries.map((e: DirEntry) => ({
      label: e.name,
      path: joinPath(path, e.name),
      isDir: e.isDir,
      isLeaf: !e.isDir
    })))
  } catch {
    resolve([])
  }
}

function joinPath(base: string, name: string): string {
  return base.endsWith('/') ? base + name : base + '/' + name
}

function onNodeClick(data: TreeNode) {
  if (!data.isDir) {
    selectedFilePath.value = data.path
  }
}

async function loadDownloadTxt() {
  try {
    const content = await window.api.ssh.readFile(props.connectionId, downloadTxtPath.value)
    downloadContent.value = content
    ElMessage.success('加载成功')
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

async function saveDownloadTxt() {
  try {
    await window.api.ssh.writeFile(props.connectionId, downloadTxtPath.value, downloadContent.value)
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}

function writePathToConfig() {
  if (!selectedFilePath.value) return
  if (downloadContent.value && !downloadContent.value.endsWith('\n')) {
    downloadContent.value += '\n'
  }
  downloadContent.value += selectedFilePath.value + '\n'
  ElMessage.success(`已写入路径: ${selectedFilePath.value}`)
}
</script>

<style scoped>
.image-path-config {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-layout {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.os-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.panel-header span:first-child {
  margin-right: auto;
}

.os-tree-container {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tree-label {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-actions {
  display: flex;
  gap: 6px;
}

.config-tip {
  padding: 6px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.selected-file-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ecf5ff;
  border-bottom: 1px solid #d9ecff;
  flex-shrink: 0;
}

.config-textarea {
  flex: 1;
  padding: 12px;
}

.config-textarea :deep(.el-textarea__inner) {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
}
</style>
