<template>
  <div class="testsuit-manager">
    <div class="testsuit-toolbar">
      <el-input
        v-model="suitDirPath"
        placeholder="testsuit 目录路径"
        style="width: 360px"
      >
        <template #prepend><el-icon><FolderOpened /></el-icon></template>
      </el-input>
      <el-button :icon="Download" @click="loadTestSuits">加载</el-button>
      <el-input
        v-model="searchQuery"
        placeholder="搜索测试套件"
        style="width: 200px; margin-left: auto"
        :icon="Search"
        clearable
      />
    </div>

    <div class="testsuit-content">
      <div class="suit-card-list">
        <div
          v-for="suit in filteredSuits"
          :key="suit.id"
          class="suit-card"
          @click="selectSuit(suit)"
        >
          <div class="suit-card-header">
            <el-icon color="#409EFF"><Document /></el-icon>
            <span class="suit-name">{{ suit.name }}</span>
          </div>
          <div class="suit-card-desc">{{ suit.description || '无描述' }}</div>
          <div class="suit-card-footer">
            <el-tag size="small">{{ suit.cases.length }} 个用例</el-tag>
            <el-tag size="small" type="success">
              {{ suit.cases.filter(c => c.enabled).length }} 启用
            </el-tag>
          </div>
        </div>
        <el-empty v-if="!filteredSuits.length" description="暂无测试套件" />
      </div>

      <el-drawer
        v-model="showDetail"
        :title="selectedSuit?.name || '测试套件'"
        size="50%"
        direction="rtl"
      >
        <div v-if="selectedSuit" class="suit-detail">
          <el-form label-width="80px">
            <el-form-item label="名称">
              <el-input v-model="selectedSuit.name" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="selectedSuit.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>

          <div class="case-section">
            <div class="case-header">
              <span>测试用例</span>
              <el-button size="small" :icon="Plus">添加用例</el-button>
            </div>
            <div class="case-list">
              <div v-for="tc in selectedSuit.cases" :key="tc.id" class="case-item">
                <el-switch v-model="tc.enabled" size="small" />
                <span class="case-name">{{ tc.name }}</span>
                <el-button size="small" :icon="Edit" @click="editCase(tc)" />
                <el-button size="small" type="danger" :icon="Delete" @click="removeCase(tc)" />
              </div>
            </div>
          </div>

          <div class="detail-footer">
            <el-button type="success" @click="saveSuit">保存</el-button>
          </div>
        </div>
      </el-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  FolderOpened, Download, Search, Document,
  Plus, Edit, Delete
} from '@element-plus/icons-vue'
import type { TestSuite, DirEntry } from '@shared/types'

const props = defineProps<{ connectionId: string }>()

const suitDirPath = ref('')
const suits = ref<TestSuite[]>([])
const searchQuery = ref('')
const showDetail = ref(false)
const selectedSuit = ref<TestSuite | null>(null)

const filteredSuits = computed(() => {
  if (!searchQuery.value) return suits.value
  return suits.value.filter(s =>
    s.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

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
        suits.value.push(normalizeSuit(data, file.name))
      } catch {}
    }
    ElMessage.success(`加载了 ${suits.value.length} 个测试套件`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

function normalizeSuit(data: any, fileName: string): TestSuite {
  return {
    id: data.id || fileName,
    name: data.name || fileName.replace('.json', ''),
    description: data.description || '',
    cases: (data.cases || []).map((c: any, i: number) => ({
      id: c.id || `case_${i}`,
      name: c.name || `case_${i}`,
      enabled: c.enabled !== false,
      params: c.params || {}
    }))
  }
}

function selectSuit(suit: TestSuite) {
  selectedSuit.value = JSON.parse(JSON.stringify(suit))
  showDetail.value = true
}

function editCase(tc: any) {
  ElMessage.info('用例编辑功能待完善')
}

function removeCase(tc: any) {
  if (selectedSuit.value) {
    selectedSuit.value.cases = selectedSuit.value.cases.filter(c => c.id !== tc.id)
  }
}

async function saveSuit() {
  if (!selectedSuit.value) return
  const idx = suits.value.findIndex(s => s.id === selectedSuit.value!.id)
  if (idx >= 0) {
    suits.value[idx] = { ...selectedSuit.value }
  }
  const filePath = `${suitDirPath.value.replace(/\/$/, '')}/${selectedSuit.value.id}`
  try {
    await window.api.ssh.writeFile(
      props.connectionId,
      filePath,
      JSON.stringify(selectedSuit.value, null, 2)
    )
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}
</script>

<style scoped>
.testsuit-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.testsuit-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
}

.testsuit-content {
  flex: 1;
  overflow: auto;
}

.suit-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.suit-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.suit-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #409EFF;
}

.suit-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.suit-name {
  font-weight: 600;
  font-size: 15px;
}

.suit-card-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
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

.case-section {
  margin-top: 16px;
}

.case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.case-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.case-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.case-name {
  flex: 1;
  font-size: 14px;
}

.detail-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
