<template>
  <div>
    <div class="page-header">
      <h2>数据概览</h2>
      <p class="desc">银行金库尾箱寄库交接系统 - 实时数据看板</p>
    </div>

    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6" v-for="(item, i) in statCards" :key="i">
        <div class="stat-card" :style="{ borderTop: `3px solid ${item.color}` }">
          <div class="stat-value" :style="{ color: item.color }">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><List /></el-icon>
            <span style="margin-left:6px;">待办事项</span>
          </h3>
          <el-table :data="todoList" style="width: 100%" empty-text="暂无待办事项">
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.tagType" size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="application_no" label="申请单号" width="180" />
            <el-table-column prop="box_code" label="尾箱编号" width="140" />
            <el-table-column prop="branch_name" label="网点" />
            <el-table-column prop="created_at" label="创建时间" width="160" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="goTodo(row)">
                  {{ row.btnText }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><DataLine /></el-icon>
            <span style="margin-left:6px;">流程状态分布</span>
          </h3>
          <div ref="chartRef" style="width:100%;height:300px;"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:20px;">
      <el-col :span="24">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><Timer /></el-icon>
            <span style="margin-left:6px;">最近流程时间线</span>
          </h3>
          <el-table :data="recentList" style="width: 100%" empty-text="暂无记录">
            <el-table-column prop="application_no" label="申请单号" width="180" />
            <el-table-column prop="box_code" label="尾箱编号" width="140" />
            <el-table-column prop="branch_name" label="网点" width="140" />
            <el-table-column label="流程状态" width="300">
              <template #default="{ row }">
                <div style="display:flex;align-items:center;gap:8px;">
                  <el-steps :active="row.stepIndex" size="small" finish-status="success">
                    <el-step title="寄库申请" />
                    <el-step title="押运交接" />
                    <el-step title="金库入库" />
                  </el-steps>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="status_label" label="当前状态">
              <template #default="{ row }">
                <span :class="`status-tag status-${row.status}`">{{ row.status_label }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="160" />
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getStatistics, getApplicationList } from '@/api'
import { useUserStore } from '@/store'

const router = useRouter()
const userStore = useUserStore()
const chartRef = ref(null)
let chartInstance = null

const stats = ref({})
const todoList = ref([])
const recentList = ref([])

const statusMap = {
  pending_escort: '待押运交接',
  pending_checkin: '待金库入库',
  pending_recheck: '待复点处理',
  completed: '已完成'
}

const statCards = computed(() => [
  { label: '寄库申请总数', value: stats.value.totalApp || 0, color: '#409EFF' },
  { label: '待押运交接', value: stats.value.pendingEscort || 0, color: '#E6A23C' },
  { label: '待金库入库', value: stats.value.pendingCheckin || 0, color: '#909399' },
  { label: '已完成', value: stats.value.completed || 0, color: '#67C23A' }
])

const initChart = () => {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: {
        label: { show: true, fontSize: 18, fontWeight: 'bold' }
      },
      data: [
        { value: stats.value.pendingEscort || 0, name: '待押运', itemStyle: { color: '#E6A23C' } },
        { value: stats.value.pendingCheckin || 0, name: '待入库', itemStyle: { color: '#909399' } },
        { value: stats.value.pendingRecheck || 0, name: '待复点', itemStyle: { color: '#F56C6C' } },
        { value: stats.value.completed || 0, name: '已完成', itemStyle: { color: '#67C23A' } }
      ]
    }]
  }
  chartInstance.setOption(option)
}

const goTodo = (row) => {
  if (row.page === 'application') router.push('/application')
  else if (row.page === 'escort') router.push('/escort')
  else if (row.page === 'checkin') router.push('/checkin')
  else if (row.page === 'recheck') router.push('/recheck')
}

const loadData = async () => {
  stats.value = await getStatistics()
  const allList = await getApplicationList({})

  todoList.value = allList
    .filter(a => {
      if (userStore.userRole === 'branch') return a.status === 'pending_escort'
      if (userStore.userRole === 'escort') return a.status === 'pending_escort'
      if (userStore.userRole === 'vault') return a.status === 'pending_checkin' || a.status === 'pending_recheck'
      return false
    })
    .map(a => {
      if (a.status === 'pending_escort') {
        if (userStore.userRole === 'branch') return { ...a, type: '寄库', tagType: '', btnText: '查看', page: 'application' }
        if (userStore.userRole === 'escort') return { ...a, type: '押运', tagType: 'warning', btnText: '去交接', page: 'escort' }
      }
      if (a.status === 'pending_checkin') return { ...a, type: '入库', tagType: 'info', btnText: '去核对', page: 'checkin' }
      if (a.status === 'pending_recheck') return { ...a, type: '复点', tagType: 'danger', btnText: '去复点', page: 'recheck' }
      return { ...a, type: '其他', tagType: '', btnText: '查看', page: 'history' }
    })
    .slice(0, 6)

  recentList.value = allList.slice(0, 8).map(a => {
    const stepIndex = {
      pending_escort: 0,
      pending_checkin: 1,
      pending_recheck: 2,
      completed: 3
    }[a.status] || 0
    return {
      ...a,
      stepIndex,
      status_label: statusMap[a.status] || a.status
    }
  })

  nextTick(() => {
    initChart()
  })
}

watch(() => stats.value, () => {
  nextTick(() => {
    if (chartInstance) initChart()
  })
}, { deep: true })

onMounted(() => {
  loadData()
  window.addEventListener('resize', () => chartInstance?.resize())
})
</script>
