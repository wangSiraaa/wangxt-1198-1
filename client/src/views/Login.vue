<template>
  <div class="login-container">
    <div class="login-bg">
      <div class="bg-pattern"></div>
    </div>
    <div class="login-box">
      <div class="login-header">
        <el-icon size="40" style="color:#409EFF;margin-bottom:12px;"><Lock /></el-icon>
        <h1>银行金库尾箱寄库交接系统</h1>
        <p>网点 · 押运 · 金库 三方流程化管理</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="用户编号" prop="user_code">
          <el-input v-model="form.user_code" placeholder="请输入用户编号" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%;" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>
      <div class="login-tips">
        <div class="tip-title">测试账号：</div>
        <el-tag style="margin:4px;">U001 张网点（网点）</el-tag>
        <el-tag type="warning" style="margin:4px;">U002 李押运（押运）</el-tag>
        <el-tag type="success" style="margin:4px;">U003 王金库（金库）</el-tag>
        <div class="tip-pwd">默认密码：123456</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { userLogin } from '@/api'
import { useUserStore } from '@/store'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  user_code: '',
  password: '123456'
})

const rules = {
  user_code: [{ required: true, message: '请输入用户编号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const data = await userLogin(form)
    userStore.setUser(data)
    ElMessage.success(`欢迎回来，${data.user_name}`)
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #1a3a5c 0%, #2c5282 50%, #2d3748 100%);
}
.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.bg-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(64, 158, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(103, 194, 58, 0.12) 0%, transparent 50%);
}
.login-box {
  width: 420px;
  background: rgba(255, 255, 255, 0.98);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10;
}
.login-header {
  text-align: center;
  margin-bottom: 30px;
}
.login-header h1 {
  font-size: 22px;
  color: #303133;
  margin-bottom: 8px;
}
.login-header p {
  color: #909399;
  font-size: 13px;
  margin: 0;
}
.login-tips {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed #ebeef5;
  font-size: 12px;
}
.tip-title {
  color: #606266;
  margin-bottom: 8px;
}
.tip-pwd {
  margin-top: 10px;
  color: #909399;
  text-align: center;
}
</style>
