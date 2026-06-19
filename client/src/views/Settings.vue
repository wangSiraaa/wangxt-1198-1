<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon><Setting /></el-icon>
        系统设置
      </h2>
      <p class="desc">配置系统参数、尾箱档案和网点信息</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="系统参数" name="param">
        <el-form label-width="200px" style="max-width:600px;">
          <el-form-item label="重量差异阈值(千克)">
            <el-input-number v-model="paramForm.weight_threshold" :precision="2" :step="0.1" :min="0.01" />
            <div style="color:#909399;font-size:12px;margin-top:4px;">
              实际重量与申报重量差异超过此值时，自动进入复点流程
            </div>
          </el-form-item>
          <el-form-item label="强制封签照片">
            <el-switch v-model="paramForm.require_seal_photo_bool" />
            <div style="color:#909399;font-size:12px;margin-top:4px;">
              开启后，寄库申请必须上传封签照片，缺失时不允许入库
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveParams">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="尾箱档案" name="box">
        <div style="margin-bottom:12px;">
          <el-button type="primary" @click="boxDialogVisible = true">
            <el-icon><Plus /></el-icon> 新增尾箱
          </el-button>
        </div>
        <el-table :data="boxList" style="width:100%;" empty-text="暂无尾箱档案">
          <el-table-column prop="box_code" label="尾箱编号" width="160" />
          <el-table-column prop="box_name" label="名称" />
          <el-table-column prop="branch_name" label="所属网点" width="140" />
          <el-table-column prop="weight" label="标准重量(kg)" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="boxStatusType[row.status]" size="small">{{ boxStatusMap[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="160" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="网点信息" name="branch">
        <el-table :data="branchList" style="width:100%;">
          <el-table-column prop="branch_code" label="网点编号" width="140" />
          <el-table-column prop="branch_name" label="网点名称" />
          <el-table-column prop="branch_address" label="地址" />
          <el-table-column prop="contact_person" label="联系人" width="100" />
          <el-table-column prop="contact_phone" label="联系电话" width="140" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="用户信息" name="user">
        <el-table :data="userList" style="width:100%;">
          <el-table-column prop="user_code" label="用户编号" width="120" />
          <el-table-column prop="user_name" label="姓名" width="120" />
          <el-table-column label="角色" width="100">
            <template #default="{ row }">
              <el-tag :type="roleTagType[row.role]">{{ roleMap[row.role] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="branch_name" label="所属网点" />
          <el-table-column prop="phone" label="联系电话" width="140" />
          <el-table-column prop="created_at" label="创建时间" width="160" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="boxDialogVisible" title="新增尾箱档案" width="500px">
      <el-form :model="newBox" label-width="100px" ref="boxFormRef" :rules="boxRules">
        <el-form-item label="尾箱编号" prop="box_code">
          <el-input v-model="newBox.box_code" placeholder="如: WX20240006" />
        </el-form-item>
        <el-form-item label="尾箱名称" prop="box_name">
          <el-input v-model="newBox.box_name" placeholder="如: 现金尾箱F" />
        </el-form-item>
        <el-form-item label="所属网点" prop="branch_id">
          <el-select v-model="newBox.branch_id" placeholder="请选择网点" style="width:100%;" @change="onBranchChange">
            <el-option v-for="b in branchList" :key="b.id" :label="b.branch_name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标准重量(kg)" prop="weight">
          <el-input-number v-model="newBox.weight" :precision="2" :step="0.1" :min="0" :max="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="boxDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addBox">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getParamList, updateParam, getCashboxList, getBranchList, getUserList, createCashbox } from '@/api'

const activeTab = ref('param')
const saving = ref(false)
const params = ref([])

const paramForm = reactive({
  weight_threshold: 0.5,
  require_seal_photo_bool: true
})

const boxList = ref([])
const branchList = ref([])
const userList = ref([])

const boxDialogVisible = ref(false)
const boxFormRef = ref(null)
const newBox = reactive({
  box_code: '',
  box_name: '',
  branch_id: null,
  branch_name: '',
  weight: 25
})

const boxRules = {
  box_code: [{ required: true, message: '请输入尾箱编号', trigger: 'blur' }],
  box_name: [{ required: true, message: '请输入尾箱名称', trigger: 'blur' }],
  branch_id: [{ required: true, message: '请选择所属网点', trigger: 'change' }]
}

const boxStatusMap = {
  idle: '空闲',
  pending_escort: '待押运',
  in_transit: '运输中',
  in_vault: '在库',
  pending_checkin: '待入库',
  pending_recheck: '待复点'
}

const boxStatusType = {
  idle: 'success',
  pending_escort: 'warning',
  in_transit: 'primary',
  in_vault: 'success',
  pending_checkin: 'info',
  pending_recheck: 'danger'
}

const roleMap = { branch: '网点', escort: '押运', vault: '金库' }
const roleTagType = { branch: 'primary', escort: 'warning', vault: 'success' }

watch(params, (val) => {
  if (!val.length) return
  const t = val.find(p => p.param_key === 'weight_threshold')
  if (t) paramForm.weight_threshold = parseFloat(t.param_value)
  const p = val.find(p => p.param_key === 'require_seal_photo')
  if (p) paramForm.require_seal_photo_bool = p.param_value === '1'
}, { deep: true })

const saveParams = async () => {
  saving.value = true
  try {
    await updateParam([
      { param_key: 'weight_threshold', param_value: String(paramForm.weight_threshold) },
      { param_key: 'require_seal_photo', param_value: paramForm.require_seal_photo_bool ? '1' : '0' }
    ])
    ElMessage.success('系统设置保存成功')
    params.value = await getParamList()
  } finally {
    saving.value = false
  }
}

const onBranchChange = (id) => {
  const b = branchList.value.find(x => x.id === id)
  if (b) newBox.branch_name = b.branch_name
}

const addBox = async () => {
  await boxFormRef.value.validate()
  await createCashbox({ ...newBox })
  ElMessage.success('尾箱档案添加成功')
  boxDialogVisible.value = false
  newBox.box_code = ''
  newBox.box_name = ''
  newBox.branch_id = null
  newBox.branch_name = ''
  newBox.weight = 25
  boxList.value = await getCashboxList()
}

const loadAll = async () => {
  params.value = await getParamList()
  boxList.value = await getCashboxList()
  branchList.value = await getBranchList()
  userList.value = await getUserList()
}

onMounted(loadAll)
</script>
