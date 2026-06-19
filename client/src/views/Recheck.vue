<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon><Refresh /></el-icon>
        复点处理
      </h2>
      <p class="desc">处理重量差异超过阈值的尾箱，进行二次称重复点确认</p>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><WarningFilled /></el-icon>
            待复点列表
            <el-tag type="danger" size="small" style="margin-left:8px;">{{ pendingList.length }} 条</el-tag>
          </h3>
          <el-table :data="pendingList" style="width:100%" empty-text="暂无待复点记录">
            <el-table-column prop="application_no" label="申请单号" width="170" />
            <el-table-column prop="box_code" label="尾箱编号" width="130" />
            <el-table-column prop="branch_name" label="网点" width="110" />
            <el-table-column label="重量对比" width="180">
              <template #default="{ row }">
                <div>
                  <div style="font-size:12px;color:#606266;">申报: {{ row.declared_weight }}kg</div>
                  <div style="font-size:12px;color:#e6a23c;">首称: {{ row.actual_weight }}kg</div>
                  <div style="font-weight:600;color:#f56c6c;">
                    差异: {{ row.weight_diff }}kg > 阈值: {{ row.weight_threshold }}kg
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="vault_user_name" label="入库员" width="80" />
            <el-table-column prop="handover_time" label="入库时间" width="150" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="openRecheck(row)">
                  <el-icon><ScaleToOriginal /></el-icon>
                  复点
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
            复点完成记录
          </h3>
          <el-table :data="doneList" style="width:100%" size="small" empty-text="暂无记录">
            <el-table-column prop="application_no" label="申请单号" width="150" show-overflow-tooltip />
            <el-table-column prop="box_code" label="尾箱编号" width="100" />
            <el-table-column label="最终重量" width="90">
              <template #default="{ row }">{{ row.final_weight }}kg</template>
            </el-table-column>
            <el-table-column label="结果" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.result === '通过' ? 'success' : 'warning'">{{ row.result }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="recheck_user_name" label="复点人" width="80" />
            <el-table-column prop="recheck_time" label="时间" width="140" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="recheckVisible" title="尾箱复点处理" width="620px">
      <template v-if="currentCheckin">
        <el-alert type="error" :closable="false" style="margin-bottom:16px;">
          <template #title>
            <el-icon><WarningFilled /></el-icon>
            <span style="margin-left:4px;">重量差异超限，需要进行二次称重复点确认</span>
          </template>
        </el-alert>

        <el-row :gutter="20">
          <el-col :span="12">
            <div class="detail-row"><div class="detail-label">申请单号</div><div class="detail-value">{{ currentCheckin.application_no }}</div></div>
            <div class="detail-row"><div class="detail-label">尾箱编号</div><div class="detail-value">{{ currentCheckin.box_code }}</div></div>
            <div class="detail-row"><div class="detail-label">所属网点</div><div class="detail-value">{{ currentCheckin.branch_name }}</div></div>
            <div class="detail-row"><div class="detail-label">封签编号</div><div class="detail-value">
              <el-tag type="warning">{{ currentCheckin.seal_code }}</el-tag>
            </div></div>
          </el-col>
          <el-col :span="12">
            <div class="detail-row"><div class="detail-label">申报重量</div><div class="detail-value" style="color:#409eff;font-weight:600;">{{ currentCheckin.declared_weight }} kg</div></div>
            <div class="detail-row"><div class="detail-label">首次称重</div><div class="detail-value" style="color:#e6a23c;font-weight:600;">{{ currentCheckin.actual_weight }} kg</div></div>
            <div class="detail-row"><div class="detail-label">差异值</div><div class="detail-value" style="color:#f56c6c;font-weight:600;">
              {{ currentCheckin.weight_diff }} kg (阈值{{ currentCheckin.weight_threshold }}kg)
            </div></div>
            <div class="detail-row"><div class="detail-label">首次入库员</div><div class="detail-value">{{ currentCheckin.vault_user_name }}</div></div>
          </el-col>
        </el-row>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #ebeef5;">
          <div style="font-weight:600;margin-bottom:12px;font-size:15px;">
            <el-icon><ScaleToOriginal /></el-icon>
            复点称重信息
          </div>
          <el-form :model="recheckForm" label-width="120px">
            <el-form-item label="复点称重(kg)" required>
              <el-input-number
                v-model="recheckForm.recheck_weight"
                :precision="2"
                :step="0.01"
                :min="0"
                :max="500"
                size="large"
                style="width:260px;"
              />
              <span style="margin-left:12px;color:#909399;font-size:13px;">
                与申报差：<b :style="{color: recheckDiff > currentCheckin.weight_threshold ? '#f56c6c' : '#67c23a'}">{{ recheckDiff }} kg</b>
              </span>
            </el-form-item>
            <el-form-item label="复点人员">
              <el-input :value="userStore.userName" disabled style="width:180px;" />
            </el-form-item>
            <el-form-item label="复点结果">
              <el-radio-group v-model="recheckForm.result">
                <el-radio label="通过">
                  <span style="color:#67c23a;"><el-icon><CircleCheck /></el-icon> 复点通过，以复点重量为准</span>
                </el-radio>
                <el-radio label="异常">
                  <span style="color:#f56c6c;"><el-icon><Warning /></el-icon> 存在异常，需进一步核查</span>
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="复点备注">
              <el-input v-model="recheckForm.recheck_remark" type="textarea" :rows="3" placeholder="请填写复点情况说明..." />
            </el-form-item>
          </el-form>
        </div>
      </template>
      <template #footer>
        <el-button @click="recheckVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmRecheck">
          <el-icon><Select /></el-icon>
          <span style="margin-left:4px;">确认复点并入库</span>
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCheckinList, createRecheck, getRecheckList } from '@/api'
import { useUserStore } from '@/store'

const userStore = useUserStore()
const pendingList = ref([])
const doneList = ref([])
const recheckVisible = ref(false)
const currentCheckin = ref(null)
const submitting = ref(false)

const recheckForm = reactive({
  recheck_weight: 0,
  result: '通过',
  recheck_remark: ''
})

const recheckDiff = computed(() => {
  if (!currentCheckin.value) return 0
  return Math.abs(parseFloat(recheckForm.recheck_weight || 0) - parseFloat(currentCheckin.value.declared_weight || 0)).toFixed(2)
})

const loadData = async () => {
  pendingList.value = await getCheckinList({ status: 'pending_recheck' })
  const all = await getRecheckList({})
  doneList.value = all.slice(0, 10)
}

const openRecheck = (row) => {
  currentCheckin.value = { ...row }
  recheckForm.recheck_weight = parseFloat(row.actual_weight || 0)
  recheckForm.result = '通过'
  recheckForm.recheck_remark = ''
  recheckVisible.value = true
}

const confirmRecheck = async () => {
  if (!recheckForm.recheck_weight || recheckForm.recheck_weight <= 0) {
    ElMessage.warning('请输入复点称重重量')
    return
  }
  await ElMessageBox.confirm(
    `确认完成复点？最终重量为 ${recheckForm.recheck_weight}kg，结果：${recheckForm.result}。确认后将正式入库。`,
    '确认复点',
    { type: 'warning', confirmButtonText: '确认完成' }
  )
  submitting.value = true
  try {
    await createRecheck({
      checkin_id: currentCheckin.value.id,
      application_id: currentCheckin.value.application_id,
      application_no: currentCheckin.value.application_no,
      box_id: currentCheckin.value.box_id,
      box_code: currentCheckin.value.box_code,
      declared_weight: currentCheckin.value.declared_weight,
      first_weight: currentCheckin.value.actual_weight,
      recheck_weight: recheckForm.recheck_weight,
      recheck_user_id: userStore.user.id,
      recheck_user_name: userStore.userName,
      result: recheckForm.result,
      recheck_remark: recheckForm.recheck_remark
    })
    ElMessage.success('复点完成，尾箱已正式入库！')
    recheckVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>
