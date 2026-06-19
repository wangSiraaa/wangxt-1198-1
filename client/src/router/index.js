import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'application',
        name: 'Application',
        component: () => import('@/views/Application.vue'),
        meta: { title: '寄库申请', icon: 'DocumentAdd', role: ['branch'] }
      },
      {
        path: 'escort',
        name: 'Escort',
        component: () => import('@/views/Escort.vue'),
        meta: { title: '押运交接', icon: 'Van', role: ['escort'] }
      },
      {
        path: 'checkin',
        name: 'Checkin',
        component: () => import('@/views/Checkin.vue'),
        meta: { title: '金库入库', icon: 'Warehouse', role: ['vault'] }
      },
      {
        path: 'recheck',
        name: 'Recheck',
        component: () => import('@/views/Recheck.vue'),
        meta: { title: '复点处理', icon: 'Refresh', role: ['vault'] }
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('@/views/History.vue'),
        meta: { title: '历史记录', icon: 'Clock' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', icon: 'Setting' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  document.title = to.meta.title ? `${to.meta.title} - 金库尾箱寄库系统` : '金库尾箱寄库系统'

  if (to.meta.public) {
    if (userStore.isLogin && to.path === '/login') {
      return next('/')
    }
    return next()
  }

  if (!userStore.isLogin) {
    return next('/login')
  }

  if (to.meta.role && to.meta.role.length > 0) {
    if (!to.meta.role.includes(userStore.userRole)) {
      return next('/')
    }
  }

  next()
})

export default router
