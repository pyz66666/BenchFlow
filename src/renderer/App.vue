<template>
  <div class="app-container">
    <AppHeader @connect="showConnect = true" @manage="showDeviceManager = true" />
    <div class="app-body">
      <ConnectionDialog
        v-model="showConnect"
        @connected="onConnected"
      />
      <DeviceManager
        v-model="showDeviceManager"
        @connect="onDeviceConnect"
      />
      <el-tabs
        v-if="tabs.length > 0"
        v-model="activeTab"
        type="card"
        closable
        @tab-remove="onTabClose"
        class="main-tabs"
      >
        <el-tab-pane
          v-for="tab in tabs"
          :key="tab.id"
          :label="tab.label"
          :name="tab.id"
        >
          <ServerWorkspace :connection-id="tab.id" :host="tab.host" />
        </el-tab-pane>
      </el-tabs>
      <div v-else class="empty-state">
        <el-empty description="暂无连接，请点击右上角新建连接">
          <el-button type="primary" @click="showConnect = true">新建连接</el-button>
          <el-button @click="showDeviceManager = true">设备管理</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppHeader from './components/AppHeader.vue'
import ConnectionDialog from './components/ConnectionDialog.vue'
import DeviceManager from './components/DeviceManager.vue'
import ServerWorkspace from './views/ServerWorkspace.vue'
import type { SavedDevice } from '@shared/types'

interface TabItem {
  id: string
  label: string
  host: string
}

const showConnect = ref(false)
const showDeviceManager = ref(false)
const tabs = ref<TabItem[]>([])
const activeTab = ref('')

async function onConnected(config: { id: string; host: string; username: string; password: string }) {
  const tab: TabItem = {
    id: config.id,
    label: `${config.username}@${config.host}`,
    host: config.host
  }
  tabs.value.push(tab)
  activeTab.value = config.id
  showConnect.value = false

  await window.api.device.save({
    id: `dev_${config.host}`,
    name: config.host,
    host: config.host,
    port: 22,
    username: config.username,
    password: config.password,
    lastConnected: Date.now()
  })
}

async function onDeviceConnect(device: SavedDevice) {
  const connId = `conn_${Date.now()}`
  try {
    await window.api.ssh.connect({
      id: connId,
      host: device.host,
      port: device.port || 22,
      username: device.username,
      password: device.password
    })
    tabs.value.push({
      id: connId,
      label: `${device.username}@${device.host}`,
      host: device.host
    })
    activeTab.value = connId

    await window.api.device.update(device.id, { lastConnected: Date.now() })
    ElMessage.success(`已连接到 ${device.name}`)
  } catch (err: any) {
    ElMessage.error(`连接失败: ${err.message || err}`)
  }
}

async function onTabClose(tabId: string) {
  await window.api.ssh.disconnect(tabId)
  tabs.value = tabs.value.filter(t => t.id !== tabId)
  if (activeTab.value === tabId && tabs.value.length > 0) {
    activeTab.value = tabs.value[0].id
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.app-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 12px;
}

.main-tabs .el-tabs__content {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
