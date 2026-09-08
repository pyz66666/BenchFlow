<template>
  <div class="testsuit-manager">
    <!-- 工具栏 -->
    <div class="testsuit-toolbar">
      <el-input
        v-model="suitDirPath"
        placeholder="testsuit 目录路径"
        class="path-input"
      >
        <template #prepend><el-icon><FolderOpened /></el-icon></template>
      </el-input>
      <el-button :icon="Download" @click="loadTestSuits">加载</el-button>
      <el-button :icon="Refresh" @click="loadTestSuits" :disabled="!suits.length">刷新</el-button>
      <el-input
        v-model="searchQuery"
        placeholder="搜索"
        class="search-input"
        :prefix-icon="Search"
        clearable
      />
    </div>

    <!-- 卡片列表 -->
    <div class="suit-grid">
      <div
        v-for="suit in filteredSuits"
        :key="suit.fileName"
        class="suit-card"
        @click="selectSuit(suit)"
      >
        <div class="suit-card-header">
          <el-icon color="#409EFF" :size="20"><Document /></el-icon>
          <span class="suit-name">{{ suit.fileName }}</span>
        </div>
        <div class="suit-card-body">
          <div class="suit-field" v-for="(val, key) in getPreview(suit)" :key="key">
            <span class="suit-field-key">{{ key }}:</span>
            <span class="suit-field-val">{{ formatValue(val) }}</span>
          </div>
        </div>
        <div class="suit-card-footer">
          <el-tag size="small" type="info">{{ Object.keys(suit.data).length }} 字段</el-tag>
          <el-tag size="small" type="success">{{ suit.modified ? '已修改' : '原始' }}</el-tag>
        </div>
      </div>
      <el-empty v-if="!filteredSuits.length" description="暂无测试套件，点击加载" />
    </div>

    <!-- 详情编辑抽屉 -->
    <el-drawer
      v-model="showDetail"
      :title="selectedSuit?.fileName || '测试套件'"
      size="55%"
      direction="rtl"
    >
      <div v-if="selectedSuit" class="suit-detail">
        <div class="detail-header">
          <span class="detail-title">参数编辑</span>
          <el-button type="success" :icon="Check" @click="saveSuit">保存</el-button>
        </div>

        <el-form label-width="140px" label-position="right">
          <el-form-item
            v-for="(field, index) in selectedSuit.fields"
            :key="index"
            :label="field.key"
          >
            <div class="field-row">
              <!-- 数组 -->
              <div v-if="Array.isArray(field.value)" class="array-editor">
                <el-tag
                  v-for="(item, i) in field.value"
                  :key="i"
                  closable
                  :disable-transitions="false"
                  @close="removeArrayItem(index, i)"
                  class="item-tag"
                >
                  {{ item }}
                </el-tag>
                <el-input
                  v-if="arrayInputVisible === index"
                  v-model="arrayInputValue"
                  size="small"
                  class="array-input"
                  @keyup.enter="confirmArrayItem(index)"
                  @blur="confirmArrayItem(index)"
                />
                <el-button v-else size="small" :icon="Plus" @click="showArrayInput(index)">添加</el-button>
              </div>

              <!-- 布尔 -->
              <el-switch v-else-if="typeof field.value === 'boolean'" v-model="field.value" />

              <!-- 数字 -->
              <el-input-number
                v-else-if="typeof field.value === 'number'"
                v-model="field.value"
                controls-position="right"
                class="field-input"
              />

              <!-- 字符串 -->
              <el-input
                v-else
                v-model="field.value"
                class="field-input"
              />

              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeField(index)"
              />
            </div>
          </el-form-item>

          <el-form-item label=" ">
            <el-button :icon="Plus" @click="addField">添加字段</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened, Download, Refresh, Search, Document, Plus, Edit, Delete, Check } from '@element-plus/icons-vue'
import type { DirEntry } from '@shared/types'

interface SuitFile {
  fileName: string
  filePath: string
  data: Record<string, any>
  fields: { key: string; value: any }[]
  modified: boolean
}

const props = defineProps<{ connectionId: string }>()

const suitDirPath = ref('')
const suits = ref<SuitFile[]>([])
const searchQuery = ref('')
const showDetail = ref(false)
const selectedSuit = ref<SuitFile | null>(null)
const arrayInputVisible = ref(-1)
const arrayInputValue = ref('')

onMounted(async () => {
  const config = await window.api.config.get()
  suitDirPath.value = config.testSuitDirPath
})

const filteredSuits = computed(() => {
  if (!searchQuery.value) return suits.value
  const q = searchQuery.value.toLowerCase()
  return suits.value.filter(s => s.fileName.toLowerCase().includes(q))
})

const previewKeys = ['name', 'suit', 'type', 'description', 'mode']

function getPreview(suit: SuitFile): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of previewKeys) {
    if (suit.data[key] !== undefined) {
      result[key] = suit.data[key]
    }
  }
  if (Object.keys(result).length === 0 && suit.fields.length > 0) {
    result[suit.fields[0].key] = suit.fields[0].value
  }
  return result
}

async function loadTestSuits() {
  if (!suitDirPath.value) {
    ElMessage.warning('请输入 testsuit 目录路径')
    return
  }
  try {
    const entries = await window.api.ssh.listDir(props.connectionId, suitDirPath.value)
    const jsonFiles = entries.filter((e: DirEntry) => !e.isDir && e.name.endsWith('.json'))

    suits.value = []
    for (const file of jsonFiles) {
      try {
        const filePath = `${suitDirPath.value.replace(/\/$/, '')}/${file.name}`
        const content = await window.api.ssh.readFile(props.connectionId, filePath)
        const data = JSON.parse(content)
        suits.value.push({
          fileName: file.name,
          filePath,
          data,
          fields: Object.entries(data).map(([key, value]) => ({ key, value: JSON.parse(JSON.stringify(value)) })),
          modified: false
        })
      } catch {}
    }
    ElMessage.success(`加载了 ${suits.value.length} 个测试套件`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

function selectSuit(suit: SuitFile) {
  selectedSuit.value = {
    ...suit,
    fields: suit.fields.map((f: { key: string; value: any }) => ({ ...f, value: JSON.parse(JSON.stringify(f.value)) }))
  }
  showDetail.value = true
}

function showArrayInput(index: number) {
  arrayInputVisible.value = index
  arrayInputValue.value = ''
}

function confirmArrayItem(index: number) {
  const val = arrayInputValue.value.trim()
  if (val && selectedSuit.value) {
    const field = selectedSuit.value.fields[index]
    if (!Array.isArray(field.value)) field.value = []
    field.value.push(val)
  }
  arrayInputVisible.value = -1
  arrayInputValue.value = ''
}

function removeArrayItem(fieldIndex: number, itemIndex: number) {
  if (selectedSuit.value) {
    selectedSuit.value.fields[fieldIndex].value.splice(itemIndex, 1)
  }
}

function addField() {
  if (selectedSuit.value) {
    selectedSuit.value.fields.push({ key: 'new_field', value: '' })
  }
}

function removeField(index: number) {
  if (selectedSuit.value) {
    selectedSuit.value.fields.splice(index, 1)
  }
}

async function saveSuit() {
  if (!selectedSuit.value) return
  const data: Record<string, any> = {}
  for (const field of selectedSuit.value.fields) {
    data[field.key] = field.value
  }
  try {
    await window.api.ssh.writeFile(
      props.connectionId,
      selectedSuit.value.filePath,
      JSON.stringify(data, null, 2)
    )
    const idx = suits.value.findIndex(s => s.fileName === selectedSuit.value!.fileName)
    if (idx >= 0) {
      suits.value[idx].data = data
      suits.value[idx].fields = selectedSuit.value.fields
      suits.value[idx].modified = true
    }
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}

function formatValue(val: any): string {
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'boolean') return val ? '是' : '否'
  return String(val)
}
</script>

<style scoped>
.testsuit-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.testsuit-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.path-input {
  width: 360px;
}

.search-input {
  width: 200px;
  margin-left: auto;
}

.suit-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  align-content: start;
  padding-bottom: 12px;
}

.suit-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
  transform: translateY(-1px);
}

.suit-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.suit-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suit-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.suit-field {
  display: flex;
  gap: 4px;
  font-size: 13px;
}

.suit-field-key {
  color: #909399;
  flex-shrink: 0;
}

.suit-field-val {
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suit-card-footer {
  display: flex;
  gap: 6px;
}

.suit-detail {
  padding: 0 8px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-title {
  font-weight: 600;
  font-size: 16px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.field-input {
  flex: 1;
}

.array-editor {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  padding: 6px 8px;
  background: #fafafa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  min-height: 34px;
}

.item-tag {
  margin: 0;
}

.array-input {
  width: 140px;
}
</style>
