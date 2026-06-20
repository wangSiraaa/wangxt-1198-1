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

    <el-row :gutter="16" style="margin-top:20px;">
      <el-col :span="14">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><Position /></el-icon>
            在途尾箱 · 途中交接
          </h3>
          <el-alert
            type="warning"
            :closable="false"
            style="margin-bottom:12px;"
            title="尾箱扫码交接后处于在途状态，如遇路线变更或中途交接，请登记经手人与时间点"
          />
          <el-table :data="inTransitList" style="width:100%" empty-text="暂无在途尾箱">
            <el-table-column prop="application_no" label="申请单号" width="170" />
            <el-table-column prop="box_code" label="尾箱编号" width="130" />
            <el-table-column prop="branch_name" label="网点" width="110" />
            <el-table-column prop="seal_code" label="封签号" width="110" show-overflow-tooltip />
            <el-table-column prop="weight" label="重量" width="80">
              <template #default="{ row }">{{ row.weight }}kg</template>
            </el-table-column>
            <el-table-column label="途中交接" width="120">
              <template #default="{ row }">
                <el-tag v-if="transferCountMap[row.id]" type="warning" size="small">已交接{{ transferCountMap[row.id] }}次</el-tag>
                <el-tag v-else type="info" size="small">未交接</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button type="warning" size="small" @click="openTransfer(row)">
                  <el-icon><Switch /></el-icon>
                  途中交接
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
            今日途中交接记录
          </h3>
          <el-table :data="todayTransfers" style="width:100%" size="small" empty-text="暂无记录">
            <el-table-column prop="application_no" label="申请单号" width="150" show-overflow-tooltip />
            <el-table-column label="交接类型" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.transfer_type === 'route_change' ? 'danger' : 'warning'">
                  {{ row.transfer_type === 'route_change' ? '路线变更' : '中途交接' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="移交人" width="80">
              <template #default="{ row }">{{ row.from_user_name || '-' }}</template>
            </el-table-column>
            <el-table-column label="经手人" width="80">
              <template #default="{ row }">{{ row.to_user_name }}</template>
            </el-table-column>
            <el-table-column prop="transfer_time" label="交接时间" width="140" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="transferVisible" title="押运途中交接登记" width="520px" @close="transferVisible = false">
      <template v-if="currentTransitApp">
        <el-alert type="warning" :closable="false" style="margin-bottom:16px;">
          <template #title>
            <el-icon><Position /></el-icon>
            <span style="margin-left:4px;">登记路线变更或中途交接，系统将保留经手人与时间点</span>
          </template>
        </el-alert>
        <div class="detail-row"><div class="detail-label">申请单号</div><div class="detail-value">{{ currentTransitApp.application_no }}</div></div>
        <div class="detail-row"><div class="detail-label">尾箱编号</div><div class="detail-value">{{ currentTransitApp.box_code }}</div></div>
        <div class="detail-row"><div class="detail-label">封签编号</div><div class="detail-value">
          <el-tag type="warning">{{ currentTransitApp.seal_code }}</el-tag>
        </div></div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px dashed #ebeef5;">
          <el-form :model="transferForm" label-width="100px">
            <el-form-item label="移交人">
              <el-input :value="userStore.userName" disabled style="width:180px;" />
            </el-form-item>
            <el-form-item label="交接类型" required>
              <el-radio-group v-model="transferForm.transfer_type">
                <el-radio label="midway_handover">
                  <span style="color:#e6a23c;">中途交接</span>
                </el-radio>
                <el-radio label="route_change">
                  <span style="color:#f56c6c;">路线变更</span>
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="接收经手人" required>
              <el-select v-model="transferForm.to_user_id" placeholder="请选择接收经手人" style="width:240px;" @change="onReceiverChange">
                <el-option
                  v-for="u in escortUsers"
                  :key="u.id"
                  :label="`${u.user_name}（${u.user_code}）`"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="交接备注">
              <el-input v-model="transferForm.remark" type="textarea" :rows="2" placeholder="可填写交接情况说明" />
            </el-form-item>
          </el-form>
        </div>
      </template>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="warning" :loading="submittingTransfer" @click="confirmTransfer">
          <el-icon><Select /></el-icon>
          <span style="margin-left:4px;">确认途中交接</span>
        </el-button>
      </template>
    </el-dialog>

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
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApplicationList, getApplicationByNo, escortHandover, getEscortList, escortTransfer, getEscortTransferList, getUserList } from '@/api'
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

const inTransitList = ref([])
const allTransfers = ref([])
const escortUsers = ref([])
const transferVisible = ref(false)
const currentTransitApp = ref(null)
const submittingTransfer = ref(false)
const transferForm = reactive({
  transfer_type: 'midway_handover',
  to_user_id: null,
  to_user_name: '',
  remark: ''
})

const transferCountMap = computed(() => {
  const map = {}
  for (const t of allTransfers.value) {
    map[t.application_id] = (map[t.application_id] || 0) + 1
  }
  return map
})

const todayTransfers = computed(() => {
  const today = getLocalDateStr()
  return allTransfers.value.filter(t => t.transfer_time && t.transfer_time.startsWith(today))
})

const loadData = async () => {
  pendingList.value = await getApplicationList({ status: 'pending_escort' })
  const today = getLocalDateStr()
  const all = await getEscortList({ escort_id: userStore.user?.id })
  myHandoverList.value = all.filter(h => {
    if (!h.scan_time) return false
    return h.scan_time.startsWith(today)
  })
  inTransitList.value = await getApplicationList({ status: 'pending_checkin' })
  allTransfers.value = await getEscortTransferList({})
  escortUsers.value = await getUserList('escort')
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

const openTransfer = (row) => {
  currentTransitApp.value = row
  transferForm.transfer_type = 'midway_handover'
  transferForm.to_user_id = null
  transferForm.to_user_name = ''
  transferForm.remark = ''
  transferVisible.value = true
}

const onReceiverChange = (uid) => {
  const u = escortUsers.value.find(x => x.id === uid)
  transferForm.to_user_name = u ? u.user_name : ''
}

const confirmTransfer = async () => {
  if (!transferForm.to_user_id) {
    ElMessage.warning('请选择接收经手人')
    return
  }
  const app = currentTransitApp.value
  submittingTransfer.value = true
  try {
    await escortTransfer({
      application_id: app.id,
      application_no: app.application_no,
      box_id: app.box_id,
      box_code: app.box_code,
      transfer_type: transferForm.transfer_type,
      from_user_id: userStore.user?.id,
      from_user_name: userStore.userName,
      to_user_id: transferForm.to_user_id,
      to_user_name: transferForm.to_user_name,
      remark: transferForm.remark
    })
    ElMessage.success('途中交接已登记，经手人与时间点已保留')
    transferVisible.value = false
    await loadData()
  } catch (e) {
    ElMessage.error(e.message || '登记失败')
  } finally {
    submittingTransfer.value = false
  }
}

onMounted(loadData)
</script>
