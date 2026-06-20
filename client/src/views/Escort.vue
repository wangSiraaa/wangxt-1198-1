<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon><Van /></el-icon>
        押运交接
      </h2>
      <p class="desc">扫描申请单号或尾箱编号，确认交接并登记押运信息</p>
    </div>

    <div class="scan-section" style="margin-bottom:20px;">
      <h3 style="margin:0 0 12px;color:#fff;">
        <el-icon><Camera /></el-icon>
        扫码交接
      </h3>
      <div style="display:flex;gap:12px;justify-content:center;">
        <el-input
          v-model="scanNo"
          placeholder="请输入或扫描申请单号 / 尾箱编号"
          size="large"
          style="max-width:420px;"
          @keyup.enter="handleScan"
          clearable
        />
        <el-button type="warning" size="large" @click="handleScan">
          <el-icon><Search /></el-icon>
          查询并交接
        </el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><List /></el-icon>
            待交接申请列表
          </h3>
          <el-table :data="pendingList" style="width:100%" empty-text="暂无待交接申请">
            <el-table-column prop="application_no" label="申请单号" width="170" />
            <el-table-column prop="box_code" label="尾箱编号" width="130" />
            <el-table-column prop="branch_name" label="网点" width="120" />
            <el-table-column prop="seal_code" label="封签号" width="120" show-overflow-tooltip />
            <el-table-column prop="weight" label="重量" width="80">
              <template #default="{ row }">{{ row.weight }}kg</template>
            </el-table-column>
            <el-table-column prop="applicant_name" label="申请人" width="80" />
            <el-table-column prop="created_at" label="申请时间" width="150" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="openHandover(row)">
                  交接
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>

      <el-col :span="10">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><Finished /></el-icon>
            今日交接记录
          </h3>
          <el-table :data="myHandoverList" style="width:100%" size="small" empty-text="暂无记录">
            <el-table-column prop="application_no" label="申请单号" width="150" show-overflow-tooltip />
            <el-table-column prop="box_code" label="尾箱编号" width="110" />
            <el-table-column prop="branch_name" label="网点" width="100" />
            <el-table-column prop="scan_time" label="交接时间" width="140" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="handoverVisible" title="押运交接确认" width="560px" @close="handoverVisible = false">
      <template v-if="currentApp">
        <el-alert title="请确认以下尾箱信息并完成交接" type="info" :closable="false" style="margin-bottom:16px;" />
        <div class="detail-row"><div class="detail-label">申请单号</div><div class="detail-value">{{ currentApp.application_no }}</div></div>
        <div class="detail-row"><div class="detail-label">尾箱编号</div><div class="detail-value">{{ currentApp.box_code }}</div></div>
        <div class="detail-row"><div class="detail-label">所属网点</div><div class="detail-value">{{ currentApp.branch_name }}</div></div>
        <div class="detail-row"><div class="detail-label">封签编号</div><div class="detail-value">
          <el-tag type="warning">{{ currentApp.seal_code }}</el-tag>
        </div></div>
        <div class="detail-row"><div class="detail-label">申报重量</div><div class="detail-value">{{ currentApp.weight }} kg</div></div>
        <div class="detail-row"><div class="detail-label">申请人</div><div class="detail-value">{{ currentApp.applicant_name }}</div></div>
        <div v-if="currentApp.seal_photo" class="detail-row">
          <div class="detail-label">封签照片</div>
          <div class="detail-value"><img :src="currentApp.seal_photo" class="photo-preview" /></div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px dashed #ebeef5;">
          <div style="font-weight:600;margin-bottom:12px;">押运信息登记</div>
          <el-form :model="handoverForm" label-width="90px">
            <el-form-item label="押运员">
              <el-input :value="userStore.userName" disabled style="width:180px;" />
            </el-form-item>
            <el-form-item label="车牌号码">
              <el-input v-model="handoverForm.vehicle_no" placeholder="请输入车牌号" maxlength="10" style="width:200px;" />
            </el-form-item>
            <el-form-item label="交接备注">
              <el-input v-model="handoverForm.handover_remark" type="textarea" :rows="2" placeholder="可选" />
            </el-form-item>
          </el-form>
        </div>
      </template>
      <template #footer>
        <el-button @click="handoverVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmHandover">
          <el-icon><Select /></el-icon>
          <span style="margin-left:4px;">确认交接</span>
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApplicationList, getApplicationByNo, escortHandover, getEscortList } from '@/api'
import { useUserStore } from '@/store'
import { getLocalDateStr } from '@/utils/date'

const userStore = useUserStore()
const scanNo = ref('')
const pendingList = ref([])
const myHandoverList = ref([])
const handoverVisible = ref(false)
const currentApp = ref(null)
const submitting = ref(false)
const handoverForm = reactive({
  vehicle_no: '',
  handover_remark: ''
})

const loadData = async () => {
  pendingList.value = await getApplicationList({ status: 'pending_escort' })
  const today = getLocalDateStr()
  const all = await getEscortList({ escort_id: userStore.user?.id })
  myHandoverList.value = all.filter(h => {
    if (!h.scan_time) return false
    return h.scan_time.startsWith(today)
  })
}

const handleScan = async () => {
  if (!scanNo.value.trim()) {
    ElMessage.warning('请输入申请单号或尾箱编号')
    return
  }
  const no = scanNo.value.trim()
  try {
    const app = await getApplicationByNo(no)
    if (app) {
      if (app.status === 'pending_escort') {
        openHandover(app)
        return
      } else {
        ElMessage.warning(`当前状态[${app.status}]不允许交接`)
        return
      }
    }
  } catch (e) {}
  const found = pendingList.value.find(a => a.box_code === no)
  if (found) {
    openHandover(found)
  } else {
    ElMessage.error('未找到对应的待交接申请')
  }
}

const openHandover = (row) => {
  currentApp.value = { ...row }
  handoverForm.vehicle_no = ''
  handoverForm.handover_remark = ''
  handoverVisible.value = true
}

const confirmHandover = async () => {
  await ElMessageBox.confirm('确认完成押运交接？交接后状态将变为待金库入库。', '确认交接', { type: 'warning' })
  submitting.value = true
  try {
    await escortHandover({
      application_id: currentApp.value.id,
      application_no: currentApp.value.application_no,
      box_id: currentApp.value.box_id,
      box_code: currentApp.value.box_code,
      escort_id: userStore.user.id,
      escort_name: userStore.userName,
      escort_phone: userStore.user?.phone,
      vehicle_no: handoverForm.vehicle_no,
      branch_id: currentApp.value.branch_id,
      branch_name: currentApp.value.branch_name,
      seal_code: currentApp.value.seal_code,
      handover_remark: handoverForm.handover_remark
    })
    ElMessage.success('押运交接成功！')
    handoverVisible.value = false
    scanNo.value = ''
    loadData()
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>
