<template>
  <el-container class="layout-container" style="height: 100%">
    <el-aside :width="sidebarWidth" class="layout-aside">
      <div class="logo">
        <el-icon size="28" style="color:#fff;margin-right:8px;"><Lock /></el-icon>
        <span v-show="!sidebarCollapsed" class="logo-text">金库尾箱系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#1f2d3d"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        :collapse="sidebarCollapsed"
      >
        <el-menu-item v-for="item in menuList" :key="item.path" :index="item.path">
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="toggle-btn" @click="toggleSidebar" :size="20">
            <Fold v-if="!sidebarCollapsed" /><Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta.title">{{ currentRoute.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" style="background:#409EFF;">
                {{ userStore.userName?.charAt(0) }}
              </el-avatar>
              <span class="user-name">{{ userStore.userName }}</span>
              <el-tag size="small" :type="roleTagType" style="margin-left:8px;">
                {{ roleLabel }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                <el-icon><User /></el-icon>
                <span style="margin-left:6px;">{{ userStore.userName }}</span>
              </el-dropdown-item>
                <el-dropdown-item disabled>
                  <el-icon><OfficeBuilding /></el-icon>
                  <span style="margin-left:6px;">{{ userStore.userBranch || '系统用户' }}</span>
                </el-dropdown-item>
                <el-dropdown-item divided @click="logout">
                  <el-icon><SwitchButton /></el-icon>
                  <span style="margin-left:6px;">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore, useAppStore } from '@/store'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const sidebarWidth = computed(() => sidebarCollapsed.value ? '64px' : '220px')
const activeMenu = computed(() => route.path)
const currentRoute = computed(() => route)

const menuList = computed(() => {
  const all = [
    { path: '/dashboard', title: '首页', icon: 'HomeFilled', roles: ['branch', 'escort', 'vault'] },
    { path: '/application', title: '寄库申请', icon: 'DocumentAdd', roles: ['branch'] },
    { path: '/escort', title: '押运交接', icon: 'Van', roles: ['escort'] },
    { path: '/checkin', title: '金库入库', icon: 'Warehouse', roles: ['vault'] },
    { path: '/recheck', title: '复点处理', icon: 'Refresh', roles: ['vault'] },
    { path: '/history', title: '历史记录', icon: 'Clock', roles: ['branch', 'escort', 'vault'] },
    { path: '/settings', title: '系统设置', icon: 'Setting', roles: ['branch', 'escort', 'vault'] }
  ]
  return all.filter(m => m.roles.includes(userStore.userRole))
})

const roleLabel = computed(() => {
  const map = { branch: '网点', escort: '押运', vault: '金库' }
  return map[userStore.userRole] || '未知'
})

const roleTagType = computed(() => {
  const map = { branch: 'primary', escort: 'warning', vault: 'success' }
  return map[userStore.userRole] || 'info'
})

const toggleSidebar = () => appStore.toggleSidebar()

const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container { background: #f0f2f5; }
.layout-aside {
  background: #1f2d3d;
  transition: width 0.3s;
  overflow: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  background: #1f2d3d;
  border-bottom: 1px solid #2d3e53;
  padding: 0 16px;
}
.logo-text { white-space: nowrap; overflow: hidden; }
:deep(.el-menu) { border-right: none; }
.layout-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  padding: 0 20px;
  height: 60px;
}
.header-left { display: flex; align-items: center; }
.toggle-btn { cursor: pointer; margin-right: 20px; color: #606266; }
.header-right { display: flex; align-items: center; }
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 10px;
}
.user-name {
  margin: 0 4px;
  color: #303133;
}
.layout-main {
  padding: 20px;
  overflow-y: auto;
}
</style>
