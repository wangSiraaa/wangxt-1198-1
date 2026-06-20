<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon><Clock /></el-icon>
        历史记录
      </h2>
      <p class="desc">查询寄库申请、押运、入库、复点完整流程记录</p>
    </div>

    <div class="card-box" style="margin-bottom:16px;">
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="申请单号">
          <el-input v-model="queryForm.application_no" placeholder="请输入申请单号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width:140px;">
            <el-option label="待押运交接" value="pending_escort" />
            <el-option label="待金库入库" value="pending_checkin" />
            <el-option label="待复点处理" value="pending_recheck" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="网点">
          <el-select v-model="queryForm.branch_id" placeholder="全部网点" clearable style="width:160px;">
            <el-option v-for="b in branchList" :key="b.id" :label="b.branch_name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="card-box">
      <el-table :data="list" style="width:100%" empty-text="暂无数据" @row-click="viewDetail" highlight-current-row>
        <el-table-column prop="application_no" label="申请单号" width="180" />
        <el-table-column prop="box_code" label="尾箱编号" width="130" />
        <el-table-column prop="branch_name" label="网点" width="120" />
        <el-table-column prop="seal_code" label="封签号" width="120" show-overflow-tooltip />
        <el-table-column label="重量(kg)" width="150">
          <template #default="{ row }">
            <div style="font-size:13px;">
              申报: <b>{{ row.weight }}</b>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <span :class="`status-tag status-${row.status}`">{{ statusMap[row.status] }}</span>
          </template>
        </el-table-column>
        <el-table-column label="流程进度" width="220">
          <template #default="{ row }">
            <el-steps :active="stepIndex(row.status)" size="small" finish-status="success" simple>
              <el-step title="寄库" />
              <el-step title="押运" />
              <el-step title="入库" />
            </el-steps>
          </template>
        </el-table-column>
        <el-table-column prop="applicant_name" label="申请人" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="150" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click.stop="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="流程详情" width="720px" top="5vh">
      <template v-if="currentDetail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="申请单号" :span="2">{{ currentDetail.application_no }}</el-descriptions-item>
          <el-descriptions-item label="尾箱编号">{{ currentDetail.box_code }}</el-descriptions-item>
          <el-descriptions-item label="所属网点">{{ currentDetail.branch_name }}</el-descriptions-item>
          <el-descriptions-item label="封签编号">{{ currentDetail.seal_code }}</el-descriptions-item>
          <el-descriptions-item label="申报重量">{{ currentDetail.weight }} kg</el-descriptions-item>
          <el-descriptions-item label="状态">
            <span :class="`status-tag status-${currentDetail.status}`">{{ statusMap[currentDetail.status] }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentDetail.applicant_name }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentDetail.applicant_phone }}</el-descriptions-item>
          <el-descriptions-item label="申请时间" :span="2">{{ currentDetail.created_at }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.remark" label="备注" :span="2">{{ currentDetail.remark }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.seal_photo" label="封签照片" :span="2">
            <img :src="currentDetail.seal_photo" class="photo-preview" style="max-height:200px;" />
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">
          <el-icon><Van /></el-icon> 押运交接信息
        </el-divider>
        <el-descriptions v-if="currentDetail.escort" :column="2" border size="small">
          <el-descriptions-item label="押运员">{{ currentDetail.escort.escort_name }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentDetail.escort.escort_phone }}</el-descriptions-item>
          <el-descriptions-item label="车牌号码">{{ currentDetail.escort.vehicle_no }}</el-descriptions-item>
          <el-descriptions-item label="扫码时间">{{ currentDetail.escort.scan_time }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.escort.handover_remark" label="交接备注" :span="2">{{ currentDetail.escort.handover_remark }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂未完成押运交接" :image-size="80" />

        <el-divider content-position="left">
          <el-icon><Warehouse /></el-icon> 金库入库信息
        </el-divider>
        <el-descriptions v-if="currentDetail.checkin" :column="2" border size="small">
          <el-descriptions-item label="金库员">{{ currentDetail.checkin.vault_user_name }}</el-descriptions-item>
          <el-descriptions-item label="封签核对">
            <el-tag :type="currentDetail.checkin.seal_photo_verify ? 'success' : 'danger'">
              {{ currentDetail.checkin.seal_photo_verify ? '通过' : '未通过' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申报重量">{{ currentDetail.checkin.declared_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="实际重量">{{ currentDetail.checkin.actual_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="差异值" :class="{ 'text-red': currentDetail.checkin.weight_diff > currentDetail.checkin.weight_threshold }">
            {{ currentDetail.checkin.weight_diff }} kg (阈值 {{ currentDetail.checkin.weight_threshold }}kg)
          </el-descriptions-item>
          <el-descriptions-item label="是否复点">
            <el-tag :type="currentDetail.checkin.need_recheck ? 'danger' : 'info'">
              {{ currentDetail.checkin.need_recheck ? '已复点' : '无需复点' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="交接时间">{{ currentDetail.checkin.handover_time }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <span :class="`status-tag status-${currentDetail.checkin.status}`">{{ checkinStatusMap[currentDetail.checkin.status] }}</span>
          </el-descriptions-item>
          <template v-if="currentDetail.checkin.status === 'handover_confirmed'">
            <el-descriptions-item label="锁定人员">{{ currentDetail.checkin.lock_user_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="锁定时间">{{ currentDetail.checkin.lock_time || '-' }}</el-descriptions-item>
          </template>
          <el-descriptions-item v-if="currentDetail.checkin.checkin_remark" label="核对备注" :span="2">{{ currentDetail.checkin.checkin_remark }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂未完成入库核对" :image-size="80" />

        <el-divider v-if="currentDetail.checkin?.need_recheck || currentDetail.recheck" content-position="left">
          <el-icon><Refresh /></el-icon> 复点信息
        </el-divider>
        <el-descriptions v-if="currentDetail.recheck" :column="2" border size="small">
          <el-descriptions-item label="复点人员">{{ currentDetail.recheck.recheck_user_name }}</el-descriptions-item>
          <el-descriptions-item label="复点结果">
            <el-tag :type="currentDetail.recheck.result === '通过' ? 'success' : 'warning'">{{ currentDetail.recheck.result }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申报重量">{{ currentDetail.recheck.declared_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="首次称重">{{ currentDetail.recheck.first_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="复点重量">{{ currentDetail.recheck.recheck_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="最终重量" style="font-weight:600;color:#67c23a;">{{ currentDetail.recheck.final_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="复点时间">{{ currentDetail.recheck.recheck_time }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.recheck.recheck_remark" label="复点备注" :span="2">{{ currentDetail.recheck.recheck_remark }}</el-descriptions-item>
        </el-descriptions>

        <el-divider v-if="currentDetail.transfers && currentDetail.transfers.length" content-position="left">
          <el-icon><Position /></el-icon> 押运途中交接记录
        </el-divider>
        <el-timeline v-if="currentDetail.transfers && currentDetail.transfers.length">
          <el-timeline-item
            v-for="t in currentDetail.transfers"
            :key="t.id"
            :timestamp="t.transfer_time"
            placement="top"
          >
            <p style="margin:0;">
              <el-tag size="small" :type="t.transfer_type === 'route_change' ? 'danger' : 'warning'">
                {{ t.transfer_type === 'route_change' ? '路线变更' : '中途交接' }}
              </el-tag>
              经手人：{{ t.to_user_name }}
              <span v-if="t.from_user_name" style="color:#909399;font-size:12px;">（移交人：{{ t.from_user_name }}）</span>
            </p>
            <p v-if="t.remark" style="margin:4px 0 0;font-size:12px;color:#909399;">备注：{{ t.remark }}</p>
          </el-timeline-item>
        </el-timeline>

        <el-divider v-if="currentDetail.diff_explanations && currentDetail.diff_explanations.length" content-position="left">
          <el-icon><Warning /></el-icon> 差异说明（交接已锁定）
        </el-divider>
        <el-timeline v-if="currentDetail.diff_explanations && currentDetail.diff_explanations.length">
          <el-timeline-item
            v-for="d in currentDetail.diff_explanations"
            :key="d.id"
            :timestamp="d.created_at"
            placement="top"
            type="warning"
          >
            <p style="margin:0;">{{ d.explanation_content }}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#909399;">提交人：{{ d.submit_user_name }} ｜ 申报 {{ d.declared_weight }}kg / 实际 {{ d.actual_weight }}kg / 差异 {{ d.weight_diff }}kg</p>
          </el-timeline-item>
        </el-timeline>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getApplicationList, getApplicationDetail, getBranchList } from '@/api'
import { useUserStore } from '@/store'

const userStore = useUserStore()
const queryForm = reactive({
  application_no: '',
  status: '',
  branch_id: userStore.userBranchId || '',
  dateRange: []
})
const list = ref([])
const branchList = ref([])
const detailVisible = ref(false)
const currentDetail = ref(null)

const statusMap = {
  pending_escort: '待押运',
  pending_checkin: '待入库',
  pending_recheck: '待复点',
  handover_confirmed: '已锁定',
  completed: '已完成'
}

const checkinStatusMap = {
  pending: '待处理',
  pending_recheck: '待复点',
  rechecked: '已复点',
  checked_in: '已入库',
  handover_confirmed: '已锁定'
}

const stepIndex = (status) => {
  return { pending_escort: 0, pending_checkin: 1, pending_recheck: 2, handover_confirmed: 3, completed: 3 }[status] || 0
}

const loadBranch = async () => {
  branchList.value = await getBranchList()
}

const loadList = async () => {
  const params = {
    status: queryForm.status || undefined,
    application_no: queryForm.application_no || undefined,
    branch_id: queryForm.branch_id || undefined
  }
  if (queryForm.dateRange?.length === 2) {
    params.start_date = queryForm.dateRange[0]
    params.end_date = queryForm.dateRange[1]
  }
  list.value = await getApplicationList(params)
}

const resetQuery = () => {
  queryForm.application_no = ''
  queryForm.status = ''
  queryForm.branch_id = userStore.userBranchId || ''
  queryForm.dateRange = []
  loadList()
}

const viewDetail = async (row) => {
  currentDetail.value = await getApplicationDetail(row.id)
  detailVisible.value = true
}

onMounted(() => {
  loadBranch()
  loadList()
})
</script>

<style scoped>
.text-red { color: #f56c6c; font-weight: 600; }
</style>
