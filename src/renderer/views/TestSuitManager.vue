<template>
  <div class="testsuit-manager">
    <!-- 工具栏 -->
    <div class="testsuit-toolbar">
      <el-input
        v-model="suitDirPath"
        placeholder="test_suites 目录路径"
        class="path-input"
      >
        <template #prepend><el-icon><FolderOpened /></el-icon></template>
      </el-input>
      <el-button :icon="Download" @click="loadTestSuits">加载</el-button>
      <el-button :icon="Refresh" @click="loadTestSuits" :disabled="!suits.length">刷新</el-button>
      <el-button type="primary" :icon="Plus" @click="addSuit" :disabled="!suitDirPath">新增套件</el-button>
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
        @click="editSuit(suit)"
      >
        <div class="suit-card-header">
          <el-icon color="#409EFF" :size="18"><Document /></el-icon>
          <span class="suit-filename">{{ suit.fileName.replace('.json', '') }}</span>
        </div>
        <div class="suit-card-body">
          <div class="suit-field" v-if="suit.data.remark">
            <span class="field-label">备注</span>
            <span class="field-value">{{ suit.data.remark }}</span>
          </div>
          <template v-if="suit.data.taskcase">
            <div class="suit-field" v-if="suit.data.taskcase.name">
              <span class="field-label">名称</span>
              <span class="field-value">{{ suit.data.taskcase.name }}</span>
            </div>
            <div class="suit-field" v-if="suit.data.taskcase.desc">
              <span class="field-label">描述</span>
              <span class="field-value">{{ suit.data.taskcase.desc }}</span>
            </div>
            <div class="suit-field" v-if="suit.data.taskcase.package">
              <span class="field-label">package</span>
              <span class="field-value">{{ suit.data.taskcase.package }}</span>
            </div>
            <div class="suit-field" v-if="suit.data.taskcase.run_cmd">
              <span class="field-label">run_cmd</span>
              <span class="field-value">{{ suit.data.taskcase.run_cmd }}</span>
            </div>
          </template>
        </div>
        <div class="suit-card-footer">
          <el-tag size="small" type="info">{{ countFields(suit.data) }} 字段</el-tag>
          <el-button size="small" :icon="CopyDocument" @click.stop="copySuit(suit)">拷贝</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click.stop="deleteSuit(suit)">删除</el-button>
        </div>
      </div>
      <el-empty v-if="!filteredSuits.length" description="暂无测试套件，点击加载" />
    </div>

    <!-- 编辑抽屉 -->
    <el-drawer
      v-model="showDetail"
      :title="editingSuit?.fileName || '测试套件'"
      size="55%"
      direction="rtl"
    >
      <div v-if="editingSuit" class="suit-detail">
        <div class="detail-header">
          <el-input v-model="editingSuit.fileName" class="filename-input">
            <template #append>.json</template>
          </el-input>
          <el-button type="success" :icon="Check" @click="saveSuit">保存</el-button>
        </div>

        <el-divider content-position="left">备注</el-divider>
        <el-input v-model="editingSuit.data.remark" placeholder="备注信息" />

        <el-divider content-position="left">taskcase 配置</el-divider>
        <el-form label-width="120px" label-position="right">
          <el-form-item label="guid">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.guid" placeholder="如 TCxxxxxx" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('guid')" />
            </div>
          </el-form-item>
          <el-form-item label="name">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.name" placeholder="用例名称" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('name')" />
            </div>
          </el-form-item>
          <el-form-item label="package">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.package" placeholder="包路径" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('package')" />
            </div>
          </el-form-item>
          <el-form-item label="desc">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.desc" placeholder="描述" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('desc')" />
            </div>
          </el-form-item>
          <el-form-item label="create_by">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.create_by" placeholder="创建者" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('create_by')" />
            </div>
          </el-form-item>
          <el-form-item label="config_info">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.config_info" placeholder="配置信息" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('config_info')" />
            </div>
          </el-form-item>
          <el-form-item label="run_cmd">
            <div class="field-row">
              <el-input v-model="editingSuit.data.taskcase!.run_cmd" placeholder="执行命令" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeTaskcaseField('run_cmd')" />
            </div>
          </el-form-item>

          <!-- 额外字段 -->
          <el-form-item
            v-for="(field, index) in extraTaskcaseFields"
            :key="index"
            :label="field.key"
          >
            <div class="field-row">
              <el-input v-model="field.value" placeholder="字段值" class="field-input" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeExtraField(index)" />
            </div>
          </el-form-item>

          <el-form-item label=" ">
            <el-button :icon="Plus" @click="addExtraField">添加字段</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderOpened, Download, Refresh, Search, Document,
  Plus, Delete, Check, CopyDocument
} from '@element-plus/icons-vue'
import type { DirEntry } from '@shared/types'

interface SuitFile {
  fileName: string
  filePath: string
  data: {
    remark?: string
    taskcase?: Record<string, any>
    [key: string]: any
  }
  isNew: boolean
}

interface ExtraField {
  key: string
  value: any
}

const STANDARD_FIELDS = ['guid', 'name', 'package', 'desc', 'create_by', 'config_info', 'run_cmd']

const TEMPLATE_TASKCASE = {
  guid: 'TCxxxxxx',
  name: '',
  package: '',
  desc: '',
  create_by: '',
  config_info: '',
  run_cmd: ''
}

const props = defineProps<{ connectionId: string }>()

const suitDirPath = ref('')
const suits = ref<SuitFile[]>([])
const searchQuery = ref('')
const showDetail = ref(false)
const editingSuit = ref<SuitFile | null>(null)
const extraTaskcaseFields = ref<ExtraField[]>([])

onMounted(async () => {
  const config = await window.api.config.get()
  suitDirPath.value = config.testSuitDirPath
  await loadTestSuits()
})

const filteredSuits = computed(() => {
  if (!searchQuery.value) return suits.value
  const q = searchQuery.value.toLowerCase()
  return suits.value.filter(s =>
    s.fileName.toLowerCase().includes(q) ||
    (s.data.remark || '').toLowerCase().includes(q) ||
    (s.data.taskcase?.name || '').toLowerCase().includes(q)
  )
})

async function loadTestSuits() {
  if (!suitDirPath.value) {
    ElMessage.warning('请输入 test_suites 目录路径')
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
          isNew: false
        })
      } catch {}
    }
    ElMessage.success(`加载了 ${suits.value.length} 个测试套件`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

function editSuit(suit: SuitFile) {
  const copy = JSON.parse(JSON.stringify(suit))
  if (!copy.data.taskcase) {
    copy.data.taskcase = {}
  }
  editingSuit.value = copy

  // 收集非标准字段
  const tc = copy.data.taskcase
  extraTaskcaseFields.value = []
  for (const [key, value] of Object.entries(tc)) {
    if (!STANDARD_FIELDS.includes(key)) {
      extraTaskcaseFields.value.push({ key, value })
    }
  }

  showDetail.value = true
}

function removeTaskcaseField(key: string) {
  if (editingSuit.value?.data.taskcase) {
    delete editingSuit.value.data.taskcase[key]
  }
}

function addExtraField() {
  extraTaskcaseFields.value.push({ key: 'new_field', value: '' })
}

function removeExtraField(index: number) {
  extraTaskcaseFields.value.splice(index, 1)
}

function addSuit() {
  editingSuit.value = {
    fileName: 'new_suite',
    filePath: `${suitDirPath.value.replace(/\/$/, '')}/new_suite.json`,
    data: {
      remark: '',
      taskcase: { ...TEMPLATE_TASKCASE }
    },
    isNew: true
  }
  extraTaskcaseFields.value = []
  showDetail.value = true
}

async function copySuit(suit: SuitFile) {
  const newName = suit.fileName.replace('.json', '') + '_副本'
  const copy: SuitFile = {
    fileName: newName + '.json',
    filePath: `${suitDirPath.value.replace(/\/$/, '')}/${newName}.json`,
    data: JSON.parse(JSON.stringify(suit.data)),
    isNew: true
  }
  suits.value.push(copy)
  editSuit(copy)
  ElMessage.success(`已拷贝为 ${newName}`)
}

async function deleteSuit(suit: SuitFile) {
  try {
    await ElMessageBox.confirm(
      `确认删除测试套件 "${suit.fileName.replace('.json', '')}"?\n该操作不可恢复！`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  if (!suit.isNew) {
    try {
      await window.api.ssh.exec(props.connectionId, `rm -f "${suit.filePath}"`)
    } catch (err: any) {
      ElMessage.error(`删除文件失败: ${err.message || err}`)
      return
    }
  }

  suits.value = suits.value.filter(s => s.fileName !== suit.fileName)
  ElMessage.success(`已删除 ${suit.fileName}`)
}

async function saveSuit() {
  if (!editingSuit.value) return

  const fileName = editingSuit.value.fileName.replace('.json', '') + '.json'
  const filePath = `${suitDirPath.value.replace(/\/$/, '')}/${fileName}`

  // 合并标准字段和额外字段
  const taskcase: Record<string, any> = {}
  for (const key of STANDARD_FIELDS) {
    if (editingSuit.value.data.taskcase && editingSuit.value.data.taskcase[key] !== undefined) {
      taskcase[key] = editingSuit.value.data.taskcase[key]
    }
  }
  for (const field of extraTaskcaseFields.value) {
    taskcase[field.key] = field.value
  }

  const data = {
    remark: editingSuit.value.data.remark || '',
    taskcase
  }

  try {
    await window.api.ssh.writeFile(
      props.connectionId,
      filePath,
      JSON.stringify(data, null, 2)
    )

    const idx = suits.value.findIndex(s => s.fileName === editingSuit.value!.fileName)
    if (idx >= 0) {
      suits.value[idx] = { fileName, filePath, data, isNew: false }
    } else {
      suits.value.push({ fileName, filePath, data, isNew: false })
    }

    editingSuit.value.fileName = fileName
    editingSuit.value.filePath = filePath
    editingSuit.value.data = data

    ElMessage.success('保存成功')
    showDetail.value = false
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}

function countFields(data: any): number {
  let count = Object.keys(data).length
  if (data.taskcase) count += Object.keys(data.taskcase).length
  return count
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
  width: 320px;
}

.search-input {
  width: 180px;
  margin-left: auto;
}

.suit-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
  display: flex;
  flex-direction: column;
  gap: 10px;
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
}

.suit-filename {
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
  flex: 1;
}

.suit-field {
  display: flex;
  gap: 6px;
  font-size: 13px;
  align-items: baseline;
}

.field-label {
  color: #909399;
  flex-shrink: 0;
  min-width: 60px;
}

.field-value {
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suit-card-footer {
  display: flex;
  gap: 8px;
  align-items: center;
}

.suit-detail {
  padding: 0 8px;
}

.detail-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.filename-input {
  flex: 1;
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
</style>
