<template>
  <div class="task-template">
    <!-- 工具栏 -->
    <div class="template-toolbar">
      <el-input
        v-model="templatePath"
        placeholder="tasks_template.json 路径"
        class="path-input"
      >
        <template #prepend><el-icon><Document /></el-icon></template>
      </el-input>
      <el-button :icon="Download" @click="loadTemplates">加载</el-button>
      <el-button :icon="Refresh" @click="loadTemplates" :disabled="!templates.length">刷新</el-button>
      <el-input
        v-model="searchQuery"
        placeholder="搜索"
        class="search-input"
        :prefix-icon="Search"
        clearable
      />
    </div>

    <!-- 模板卡片列表 -->
    <div class="template-grid">
      <div
        v-for="(tpl, index) in filteredTemplates"
        :key="index"
        class="template-card"
        @click="editTemplate(index)"
      >
        <div class="template-card-header">
          <el-tag type="primary" size="small" effect="light">
            {{ tpl.suite || tpl.suit || '未命名' }}
          </el-tag>
          <span class="template-detail" v-if="tpl.ips && Array.isArray(tpl.ips)">
            {{ tpl.ips.length }} 台机器
          </span>
          <span class="template-detail" v-if="tpl.wait_time != null">
            等待 {{ tpl.wait_time }}s
          </span>
        </div>
        <div class="template-card-body" v-if="tpl.ips && Array.isArray(tpl.ips)">
          <el-text type="info" size="small">
            {{ tpl.ips.join(', ') }}
          </el-text>
        </div>
        <div class="template-card-footer">
          <el-tag size="small" type="info">{{ Object.keys(tpl).length }} 字段</el-tag>
          <el-button size="small" :icon="DocumentCopy" @click.stop="copyTemplate(index)">复制JSON</el-button>
        </div>
      </div>
      <el-empty v-if="!filteredTemplates.length" description="暂无模板，点击加载" />
    </div>

    <!-- 编辑抽屉 -->
    <el-drawer
      v-model="showDetail"
      title="模板编辑（只读参考）"
      size="55%"
      direction="rtl"
    >
      <div v-if="editingTemplate" class="template-detail">
        <el-alert
          title="此页面为模板参考，修改不会保存到原文件"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <pre class="json-display">{{ JSON.stringify(editingTemplate, null, 2) }}</pre>
        <div class="detail-footer">
          <el-button :icon="DocumentCopy" @click="copyTemplateJson(editingTemplate)">复制完整JSON</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Download, Refresh, Search, DocumentCopy } from '@element-plus/icons-vue'

const props = defineProps<{ connectionId: string }>()

const templatePath = ref('')
const templates = ref<Record<string, any>[]>([])
const searchQuery = ref('')
const showDetail = ref(false)
const editingTemplate = ref<Record<string, any> | null>(null)

onMounted(async () => {
  const config = await window.api.config.get()
  const dir = config.taskJsonPath || ''
  templatePath.value = dir.replace('task.json', 'tasks_template.json')
})

const filteredTemplates = computed(() => {
  if (!searchQuery.value) return templates.value
  const q = searchQuery.value.toLowerCase()
  return templates.value.filter(t => {
    const suite = t.suite || t.suit || ''
    return suite.toLowerCase().includes(q) ||
      JSON.stringify(t).toLowerCase().includes(q)
  })
})

function fixJsonContent(raw: string): string {
  return raw.replace(/:\s*\[([^\]]*)\]/g, (_match, inner: string) => {
    const fixed = inner.split(',').map((item: string) => {
      const trimmed = item.trim()
      if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed) && !trimmed.startsWith('"')) {
        return `"${trimmed}"`
      }
      return trimmed
    }).join(', ')
    return `: [${fixed}]`
  })
}

async function loadTemplates() {
  if (!templatePath.value) {
    ElMessage.warning('请输入 tasks_template.json 路径')
    return
  }
  try {
    let content = await window.api.ssh.readFile(props.connectionId, templatePath.value)
    let data
    try {
      data = JSON.parse(content)
    } catch {
      content = fixJsonContent(content)
      data = JSON.parse(content)
    }
    templates.value = Array.isArray(data) ? data : (data.tasks || [])
    ElMessage.success(`加载了 ${templates.value.length} 个模板`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

function editTemplate(index: number) {
  editingTemplate.value = JSON.parse(JSON.stringify(templates.value[index]))
  showDetail.value = true
}

async function copyTemplate(index: number) {
  await copyTemplateJson(templates.value[index])
}

async function copyTemplateJson(tpl: Record<string, any>) {
  try {
    const text = JSON.stringify(tpl)
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.task-template {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.template-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.path-input {
  width: 340px;
}

.search-input {
  width: 180px;
  margin-left: auto;
}

.template-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  align-content: start;
  padding-bottom: 12px;
}

.template-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
  transform: translateY(-1px);
}

.template-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-detail {
  font-size: 13px;
  color: #606266;
}

.template-card-body {
  font-size: 12px;
}

.template-card-footer {
  display: flex;
  gap: 8px;
  align-items: center;
}

.template-detail-content {
  padding: 0 8px;
}

.json-display {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
