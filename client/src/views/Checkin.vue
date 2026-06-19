<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon><Warehouse /></el-icon>
        金库入库
      </h2>
      <p class="desc">核对封签照片和重量，重量差异超阈值进入复点流程</p>
    </div>

    <div class="card-box" style="margin-bottom:20px;padding:24px;">
      <el-row :gutter="20">
        <el-col :span="12">
          <div style="display:flex;align-items:center;gap:12px;">
            <el-input
              v-model="scanNo"
              placeholder="扫描或输入申请单号"
              size="large"
              @keyup.enter="searchApp"
              clearable
            />
            <el-button type="primary" size="large" @click="searchApp">
              <el-icon><Search /></el-icon>
              查询核对
            </el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <div v-if="checkingApp" class="card-box" style="margin-bottom:20px;">
      <el-row :gutter="24">
        <el-col :span="12">
          <h3 style="margin-bottom:16px;">
            <el-icon><Document /></el-icon>
            申请信息
          </h3>
          <div class="detail-row"><div class="detail-label">申请单号</div><div class="detail-value" style="font-weight:600;">{{ checkingApp.application_no }}</div></div>
          <div class="detail-row"><div class="detail-label">尾箱编号</div><div class="detail-value">{{ checkingApp.box_code }}</div></div>
          <div class="detail-row"><div class="detail-label">所属网点</div><div class="detail-value">{{ checkingApp.branch_name }}</div></div>
          <div class="detail-row"><div class="detail-label">封签编号</div><div class="detail-value">
            <el-tag type="warning" size="large">{{ checkingApp.seal_code }}</el-tag>
          </div></div>
          <div class="detail-row"><div class="detail-label">申报重量</div><div class="detail-value" style="font-size:18px;color:#409EFF;font-weight:600;">
            {{ checkingApp.weight }} kg
          </div></div>
          <div class="detail-row"><div class="detail-label">押运员</div><div class="detail-value">{{ checkingApp.escort?.escort_name || '-' }}</div></div>
          <div class="detail-row"><div class="detail-label">押运车牌</div><div class="detail-value">{{ checkingApp.escort?.vehicle_no || '-' }}</div></div>
        </el-col>

        <el-col :span="12">
          <h3 style="margin-bottom:16px;">
            <el-icon><Picture /></el-icon>
            封签照片核对
          </h3>
          <div v-if="checkingApp.seal_photo" style="text-align:center;background:#f5f7fa;padding:16px;border-radius:6px;">
            <img :src="checkingApp.seal_photo" style="max-width:100%;max-height:280px;border-radius:4px;" />
          </div>
          <el-form label-width="110px" style="margin-top:16px;">
            <el-form-item label="封签照片核对">
              <el-radio-group v-model="checkinForm.seal_photo_verify">
                <el-radio :label="1">
                  <span style="color:#67c23a;"><el-icon><Select /></el-icon> 照片完整，封签一致</span>
                </el-radio>
                <el-radio :label="0">
                  <span style="color:#f56c6c;"><el-icon><Close /></el-icon> 照片缺失/不一致</span>
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="实际测量重量(kg)">
              <el-input-number
                v-model="checkinForm.actual_weight"
                :precision="2"
                :step="0.01"
                :min="0"
                :max="500"
                size="large"
                style="width:240px;"
                @change="calcWeightDiff"
              />
            </el-form-item>
            <el-form-item label="金库员">
              <el-input :value="userStore.userName" disabled style="width:180px;" />
            </el-form-item>
            <el-form-item label="核对备注">
              <el-input v-model="checkinForm.checkin_remark" type="textarea" :rows="2" placeholder="可填写核对情况" />
            </el-form-item>
          </el-form>
          <div v-if="calcResult.show" :class="calcResult.needRecheck ? 'weight-warning' : 'weight-ok'">
            <div style="font-weight:600;">
              <el-icon v-if="calcResult.needRecheck"><Warning /></el-icon>
              <el-icon v-else><CircleCheck /></el-icon>
              {{ calcResult.text }}
            </div>
            <div style="margin-top:6px;font-size:13px;opacity:0.85;">
              差异值：<b>{{ weightDiffValue }} kg</b> ｜ 允许阈值：<b>{{ weightThreshold }} kg</b>
            </div>
          </div>
          <div style="margin-top:16px;">
            <el-button type="primary" size="large" :loading="checking" @click="doCheckin" :disabled="checkinForm.seal_photo_verify === 0">
              <el-icon><CircleCheckFilled /></el-icon>
              <span style="margin-left:4px;">确认入库核对</span>
            </el-button>
            <el-button size="large" @click="cancelCheck">取消</el-button>
            <div v-if="checkinForm.seal_photo_verify === 0" style="color:#f56c6c;margin-top:8px;font-size:13px;">
              <el-icon><InfoFilled /></el-icon> 封签照片缺失或不一致，根据规定不能入库
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><Tickets /></el-icon>
            待入库列表
          </h3>
          <el-table :data="pendingList" style="width:100%" empty-text="暂无待入库申请">
            <el-table-column prop="application_no" label="申请单号" width="170" />
            <el-table-column prop="box_code" label="尾箱编号" width="130" />
            <el-table-column prop="branch_name" label="网点" width="110" />
            <el-table-column prop="seal_code" label="封签号" width="110" show-overflow-tooltip />
            <el-table-column prop="weight" label="申报重量" width="90">
              <template #default="{ row }">{{ row.weight }}kg</template>
            </el-table-column>
            <el-table-column label="封签照片" width="90">
              <template #default="{ row }">
                <el-tag v-if="row.seal_photo" type="success" size="small">已上传</el-tag>
                <el-tag v-else type="danger" size="small">缺失</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="loadAppDetail(row)">核对入库</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><CircleCheckFilled /></el-icon>
            今日入库记录
          </h3>
          <el-table :data="todayCheckin" style="width:100%" size="small" empty-text="暂无记录">
            <el-table-column prop="application_no" label="申请单号" width="140" show-overflow-tooltip />
            <el-table-column prop="box_code" label="尾箱编号" width="100" />
            <el-table-column label="重量(申报/实际)" width="110">
              <template #default="{ row }">{{ row.declared_weight }}/{{ row.actual_weight }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'handover_confirmed' ? 'success' : (row.need_recheck ? 'danger' : 'warning')">
                  {{ row.status === 'handover_confirmed' ? '已锁定' : (row.need_recheck ? '待复点' : '已入库') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button
                  v-if="row.status !== 'handover_confirmed' && !row.need_recheck"
                  size="small" type="success" link
                  @click="lockHandover(row)"
                >
                  锁定交接
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getApplicationList, getApplicationByNo, getApplicationDetail,
  vaultCheckin, getCheckinList, lockHandoverTime, getParamList
} from '@/api'
import { useUserStore, useAppStore } from '@/store'

const userStore = useUserStore()
const appStore = useAppStore()
const scanNo = ref('')
const pendingList = ref([])
const todayCheckin = ref([])
const checkingApp = ref(null)
const checking = ref(false)
const weightThreshold = ref(0.5)

const checkinForm = reactive({
  seal_photo_verify: 0,
  actual_weight: 0,
  checkin_remark: ''
})

const weightDiffValue = computed(() => {
  if (!checkingApp.value) return 0
  return Math.abs(parseFloat(checkinForm.actual_weight || 0) - parseFloat(checkingApp.value.weight || 0)).toFixed(2)
})

const calcResult = computed(() => {
  if (!checkingApp.value || !checkinForm.actual_weight) return { show: false }
  const diff = parseFloat(weightDiffValue.value)
  const needRecheck = diff > weightThreshold.value
  return {
    show: true,
    needRecheck,
    text: needRecheck
      ? `重量差异超过阈值（${weightThreshold.value}kg），将进入复点流程`
      : `重量核对通过，差异在允许范围内`
  }
})

const loadData = async () => {
  pendingList.value = await getApplicationList({ status: 'pending_checkin' })
  const params = await getParamList()
  appStore.setSystemParams(params)
  const t = params.find(p => p.param_key === 'weight_threshold')
  if (t) weightThreshold.value = parseFloat(t.param_value)

  const all = await getCheckinList({})
  const today = new Date().toISOString().split('T')[0]
  todayCheckin.value = all.filter(c => {
    if (!c.created_at) return false
    return c.created_at.startsWith(today)
  }).slice(0, 10)
}

const searchApp = async () => {
  if (!scanNo.value.trim()) {
    ElMessage.warning('请输入申请单号')
    return
  }
  try {
    const app = await getApplicationByNo(scanNo.value.trim())
    if (app && app.status === 'pending_checkin') {
      loadAppDetail(app)
    } else if (app) {
      ElMessage.warning(`当前申请状态[${app.status}]，不允许入库核对`)
    } else {
      ElMessage.error('未找到申请记录')
    }
  } catch {
    ElMessage.error('查询失败')
  }
}

const loadAppDetail = async (row) => {
  checkingApp.value = await getApplicationDetail(row.id)
  checkinForm.seal_photo_verify = checkingApp.value.seal_photo ? 1 : 0
  checkinForm.actual_weight = parseFloat(checkingApp.value.weight || 0)
  checkinForm.checkin_remark = ''
}

const calcWeightDiff = () => {}

const cancelCheck = () => {
  checkingApp.value = null
  scanNo.value = ''
}

const doCheckin = async () => {
  if (checkinForm.seal_photo_verify !== 1) {
    ElMessage.error('封签照片缺失或不一致，不能入库')
    return
  }
  if (!checkinForm.actual_weight || checkinForm.actual_weight <= 0) {
    ElMessage.warning('请输入实际测量重量')
    return
  }
  const msg = calcResult.value.needRecheck
    ? `重量差异${weightDiffValue.value}kg超过阈值，确认进入复点流程？`
    : '确认完成入库核对？'
  await ElMessageBox.confirm(msg, '确认', { type: 'warning' })

  checking.value = true
  try {
    const res = await vaultCheckin({
      application_id: checkingApp.value.id,
      application_no: checkingApp.value.application_no,
      box_id: checkingApp.value.box_id,
      box_code: checkingApp.value.box_code,
      branch_id: checkingApp.value.branch_id,
      branch_name: checkingApp.value.branch_name,
      seal_code: checkingApp.value.seal_code,
      seal_photo_verify: checkinForm.seal_photo_verify,
      declared_weight: checkingApp.value.weight,
      actual_weight: checkinForm.actual_weight,
      vault_user_id: userStore.user.id,
      vault_user_name: userStore.userName,
      checkin_remark: checkinForm.checkin_remark
    })
    if (res.need_recheck) {
      ElMessage.warning(`入库完成，差异值${res.weight_diff}kg超过阈值，已进入复点流程`)
    } else {
      ElMessage.success('入库核对完成！')
    }
    checkingApp.value = null
    scanNo.value = ''
    loadData()
  } finally {
    checking.value = false
  }
}

const lockHandover = async (row) => {
  await ElMessageBox.confirm('确认锁定交接时间？锁定后将不可修改交接时间。', '确认锁定', {
    type: 'warning',
    confirmButtonText: '确认锁定'
  })
  await lockHandoverTime({ checkin_id: row.id, vault_user_id: userStore.user.id })
  ElMessage.success('交接时间已锁定，后续不可修改')
  loadData()
}

onMounted(loadData)
</script>
