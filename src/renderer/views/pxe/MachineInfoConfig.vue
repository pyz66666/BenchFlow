<template>
  <div class="machine-config">
    <div class="config-layout">
      <!-- 左侧：机器模板 -->
      <div class="template-panel">
        <div class="panel-header">
          <span>机器模板</span>
          <div class="header-actions">
            <el-button size="small" :icon="Download" @click="loadTemplate">加载</el-button>
            <el-button size="small" :icon="Refresh" @click="loadTemplate">刷新</el-button>
          </div>
        </div>
        <div class="panel-path">
          <el-input v-model="templatePath" size="small" class="path-input">
            <template #prepend>template</template>
          </el-input>
        </div>

        <el-table
          v-if="templateRows.length"
          :data="templateRows"
          stripe
          border
          :row-style="{ height: '40px' }"
          :cell-style="{ padding: '4px 4px', fontSize: '12px' }"
          :header-cell-style="{ padding: '4px 4px', fontSize: '12px' }"
          @current-change="onTemplateRowChange"
          highlight-current-row
          class="csv-table"
        >
          <el-table-column prop="arch" label="arch" min-width="70" />
          <el-table-column prop="mac" label="mac" min-width="150" show-overflow-tooltip />
          <el-table-column prop="ip" label="ip" min-width="110" />
          <el-table-column prop="by_id" label="by_id" min-width="90" show-overflow-tooltip />
          <el-table-column prop="root_mb" label="root_mb" min-width="80" />
          <el-table-column prop="ks_file" label="ks_file" min-width="120" show-overflow-tooltip />
        </el-table>
        <el-empty v-else description="点击加载 server_template.csv" :image-size="60" />
      </div>

      <!-- 中间：操作按钮 -->
      <div class="middle-actions">
        <el-button type="primary" :icon="Right" :disabled="!selectedTemplateRow" @click="copyToTarget">
          拷贝
        </el-button>
      </div>

      <!-- 右侧：目标机器信息 -->
      <div class="target-panel">
        <div class="panel-header">
          <span>目标机器信息</span>
          <div class="header-actions">
            <el-button size="small" type="success" :icon="Check" @click="saveTarget" :disabled="!targetRows.length">保存</el-button>
            <el-button size="small" type="primary" :icon="Plus" @click="addTargetRow">添加行</el-button>
          </div>
        </div>
        <div class="panel-path">
          <el-input v-model="targetPath" size="small" class="path-input">
            <template #prepend>target</template>
          </el-input>
        </div>

        <el-table
          v-if="targetRows.length"
          :data="targetRows"
          stripe
          border
          :row-style="{ height: '40px' }"
          :cell-style="{ padding: '4px 4px' }"
          class="csv-table"
        >
          <el-table-column label="arch" min-width="80">
            <template #default="{ row }">
              <el-input v-model="row.arch" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="mac" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.mac" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="ip" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.ip" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="by_id" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.by_id" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="root_mb" min-width="90">
            <template #default="{ row }">
              <el-input v-model="row.root_mb" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="ks_file" min-width="130">
            <template #default="{ row }">
              <el-input v-model="row.ks_file" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" fixed="right">
            <template #default="{ $index }">
              <el-button size="small" type="danger" :icon="Delete" circle @click="removeTargetRow($index)" />
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="从左侧拷贝或点击添加行" :image-size="60" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Refresh, Check, Plus, Delete, Right } from '@element-plus/icons-vue'

const props = defineProps<{ connectionId: string }>()

interface CsvRow {
  arch: string
  mac: string
  ip: string
  by_id: string
  root_mb: string
  ks_file: string
}

const CSV_HEADERS = ['arch', 'mac', 'ip', 'by_id', 'root_mb', 'ks_file']
const templatePath = ref('/home/AutoBench/config/server_template.csv')
const targetPath = ref('/home/AutoBench/config/server.csv')

const templateRows = ref<CsvRow[]>([])
const targetRows = ref<CsvRow[]>([])
const selectedTemplateRow = ref<CsvRow | null>(null)

onMounted(() => {
  loadTemplate()
})

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  // 跳过表头行
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(',')
    rows.push({
      arch: parts[0]?.trim() || '',
      mac: parts[1]?.trim() || '',
      ip: parts[2]?.trim() || '',
      by_id: parts[3]?.trim() || '',
      root_mb: parts[4]?.trim() || '',
      ks_file: parts[5]?.trim() || ''
    })
  }
  return rows
}

function toCsv(rows: CsvRow[]): string {
  const lines = [CSV_HEADERS.join(',')]
  for (const row of rows) {
    lines.push([row.arch, row.mac, row.ip, row.by_id, row.root_mb, row.ks_file].join(','))
  }
  return lines.join('\n') + '\n'
}

async function loadTemplate() {
  try {
    const content = await window.api.ssh.readFile(props.connectionId, templatePath.value)
    templateRows.value = parseCsv(content)
    ElMessage.success(`加载了 ${templateRows.value.length} 行`)
  } catch (err: any) {
    ElMessage.error(`加载失败: ${err.message || err}`)
  }
}

function onTemplateRowChange(row: CsvRow | null) {
  selectedTemplateRow.value = row
}

async function copyToTarget() {
  if (!selectedTemplateRow.value) return
  try {
    await ElMessageBox.confirm('确认将此行拷贝到右侧目标机器?', '提示', { type: 'info' })
  } catch {
    return
  }
  targetRows.value.push({ ...selectedTemplateRow.value })
  ElMessage.success('已拷贝')
}

function addTargetRow() {
  targetRows.value.push({
    arch: '', mac: '', ip: '', by_id: '', root_mb: '', ks_file: ''
  })
}

async function removeTargetRow(index: number) {
  try {
    await ElMessageBox.confirm('确认删除此行?', '提示', { type: 'warning' })
  } catch {
    return
  }
  targetRows.value.splice(index, 1)
}

async function saveTarget() {
  try {
    await ElMessageBox.confirm('确认保存目标机器信息到服务器?', '保存确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    const content = toCsv(targetRows.value)
    await window.api.ssh.writeFile(props.connectionId, targetPath.value, content)
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(`保存失败: ${err.message || err}`)
  }
}
</script>

<style scoped>
.machine-config {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-layout {
  flex: 1;
  display: flex;
  gap: 8px;
  overflow: hidden;
}

.template-panel,
.target-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.panel-path {
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.panel-path .path-input {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.csv-table {
  flex: 1;
  overflow: auto;
}

.middle-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 70px;
}
</style>
