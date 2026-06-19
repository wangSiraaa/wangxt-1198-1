import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('vault_user') || 'null'),
    token: localStorage.getItem('vault_token') || ''
  }),
  getters: {
    isLogin: (state) => !!state.user,
    userName: (state) => state.user?.user_name || '',
    userRole: (state) => state.user?.role || '',
    userBranch: (state) => state.user?.branch_name || '',
    userBranchId: (state) => state.user?.branch_id || null
  },
  actions: {
    setUser(user) {
      this.user = user
      localStorage.setItem('vault_user', JSON.stringify(user))
      this.token = 'mock_token_' + user.id
      localStorage.setItem('vault_token', this.token)
    },
    logout() {
      this.user = null
      this.token = ''
      localStorage.removeItem('vault_user')
      localStorage.removeItem('vault_token')
    }
  }
})

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    branchList: [],
    systemParams: []
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    setBranchList(list) {
      this.branchList = list
    },
    setSystemParams(params) {
      this.systemParams = params
    },
    getParam(key) {
      const p = this.systemParams.find(x => x.param_key === key)
      return p ? p.param_value : null
    }
  }
})
