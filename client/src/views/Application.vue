<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon><DocumentAdd /></el-icon>
        寄库申请
      </h2>
      <p class="desc">网点发起尾箱寄库申请，填写尾箱信息、封签号和重量</p>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card-box">
          <h3 style="margin-bottom:20px;">新建寄库申请</h3>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
            <el-form-item label="所属网点">
              <el-input :value="userStore.userBranch" disabled />
            </el-form-item>

            <el-form-item label="尾箱编号" prop="box_id">
              <el-select v-model="form.box_id" placeholder="请选择尾箱" style="width:100%" @change="onBoxChange">
                <el-option
                  v-for="b in availableBoxes"
                  :key="b.id"
                  :label="`${b.box_code} - ${b.box_name} (${b.weight}kg)`"
                  :value="b.id"
                >
                  <span>{{ b.box_code }} - {{ b.box_name }}</span>
                  <span style="float:right;color:#8492a6;">{{ b.weight }}kg</span>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="封签编号" prop="seal_code">
              <el-input v-model="form.seal_code" placeholder="请输入封签编号" maxlength="30" />
            </el-form-item>

            <el-form-item label="封签照片" prop="seal_photo">
              <div
                class="photo-uploader"
                :class="{ 'has-photo': form.seal_photo }"
                @click="triggerUpload"
              >
                <template v-if="form.seal_photo">
                  <div style="text-align:center;">
                    <img :src="form.seal_photo" class="photo-preview" style="max-width:240px;" />
                    <div style="margin-top:8px;color:#67c23a;">
                      <el-icon><Check /></el-icon> 已上传封签照片（点击更换）
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div style="text-align:center;color:#909399;">
                    <el-icon size="48" style="margin-bottom:8px;"><Camera /></el-icon>
                    <div>点击上传封签照片</div>
                    <div style="font-size:12px;margin-top:4px;color:#f56c6c;">* 必须上传，缺失将不能入库</div>
                  </div>
                </template>
              </div>
              <input type="file" ref="fileInputRef" accept="image/*" style="display:none;" @change="onFileChange" />
            </el-form-item>

            <el-form-item label="申报重量(kg)" prop="weight">
              <el-input-number v-model="form.weight" :precision="2" :step="0.1" :min="0" :max="500" style="width:200px;" />
            </el-form-item>

            <el-form-item label="申请人">
              <el-input :value="userStore.userName" disabled style="width:180px;" />
            </el-form-item>

            <el-form-item label="联系电话" prop="applicant_phone">
              <el-input v-model="form.applicant_phone" placeholder="请输入联系电话" maxlength="11" style="width:220px;" />
            </el-form-item>

            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选备注信息" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" :loading="submitting" @click="submitForm">
                <el-icon><DocumentChecked /></el-icon>
                <span style="margin-left:4px;">提交寄库申请</span>
              </el-button>
              <el-button size="large" @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-col>

      <el-col :span="10">
        <div class="card-box">
          <h3 style="margin-bottom:16px;">
            <el-icon><List /></el-icon>
            <span style="margin-left:6px;">近期申请记录</span>
          </h3>
          <el-table :data="myList" style="width:100%" size="small" empty-text="暂无记录">
            <el-table-column prop="application_no" label="申请单号" width="150" show-overflow-tooltip />
            <el-table-column prop="box_code" label="尾箱编号" width="120" />
            <el-table-column prop="seal_code" label="封签号" width="100" show-overflow-tooltip />
            <el-table-column prop="weight" label="重量" width="70">
              <template #default="{ row }">{{ row.weight }}kg</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <span :class="`status-tag status-${row.status}`">{{ statusMap[row.status] }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="viewDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="detailVisible" title="申请详情" width="640px">
      <template v-if="currentDetail">
        <div class="detail-row"><div class="detail-label">申请单号</div><div class="detail-value">{{ currentDetail.application_no }}</div></div>
        <div class="detail-row"><div class="detail-label">尾箱编号</div><div class="detail-value">{{ currentDetail.box_code }}</div></div>
        <div class="detail-row"><div class="detail-label">所属网点</div><div class="detail-value">{{ currentDetail.branch_name }}</div></div>
        <div class="detail-row"><div class="detail-label">封签编号</div><div class="detail-value">{{ currentDetail.seal_code }}</div></div>
        <div class="detail-row"><div class="detail-label">申报重量</div><div class="detail-value">{{ currentDetail.weight }} kg</div></div>
        <div class="detail-row"><div class="detail-label">状态</div><div class="detail-value">
          <span :class="`status-tag status-${currentDetail.status}`">{{ statusMap[currentDetail.status] }}</span>
        </div></div>
        <div v-if="currentDetail.seal_photo" class="detail-row">
          <div class="detail-label">封签照片</div>
          <div class="detail-value"><img :src="currentDetail.seal_photo" class="photo-preview" /></div>
        </div>
        <div class="detail-row"><div class="detail-label">申请人</div><div class="detail-value">{{ currentDetail.applicant_name }}</div></div>
        <div v-if="currentDetail.escort" style="margin-top:12px;padding-top:12px;border-top:1px solid #ebeef5;">
          <div style="margin-bottom:8px;font-weight:600;">
            <el-icon><Van /></el-icon> 押运交接信息
          </div>
          <div class="detail-row"><div class="detail-label">押运员</div><div class="detail-value">{{ currentDetail.escort.escort_name }}</div></div>
          <div class="detail-row"><div class="detail-label">车牌号</div><div class="detail-value">{{ currentDetail.escort.vehicle_no }}</div></div>
          <div class="detail-row"><div class="detail-label">扫码时间</div><div class="detail-value">{{ currentDetail.escort.scan_time }}</div></div>
        </div>
        <div v-if="currentDetail.checkin" style="margin-top:12px;padding-top:12px;border-top:1px solid #ebeef5;">
          <div style="margin-bottom:8px;font-weight:600;">
            <el-icon><Warehouse /></el-icon> 金库入库信息
          </div>
          <div class="detail-row"><div class="detail-label">金库员</div><div class="detail-value">{{ currentDetail.checkin.vault_user_name }}</div></div>
          <div class="detail-row"><div class="detail-label">申报/实际</div><div class="detail-value">
            {{ currentDetail.checkin.declared_weight }} / {{ currentDetail.checkin.actual_weight }} kg
            (差值 {{ currentDetail.checkin.weight_diff }} kg)
          </div></div>
          <div class="detail-row"><div class="detail-label">交接时间</div><div class="detail-value">{{ currentDetail.checkin.handover_time }}</div></div>
        </div>
        <div v-if="currentDetail.recheck" style="margin-top:12px;padding-top:12px;border-top:1px solid #ebeef5;">
          <div style="margin-bottom:8px;font-weight:600;">
            <el-icon><Refresh /></el-icon> 复点信息
          </div>
          <div class="detail-row"><div class="detail-label">复点人员</div><div class="detail-value">{{ currentDetail.recheck.recheck_user_name }}</div></div>
          <div class="detail-row"><div class="detail-label">最终重量</div><div class="detail-value">{{ currentDetail.recheck.final_weight }} kg</div></div>
          <div class="detail-row"><div class="detail-label">复点结果</div><div class="detail-value">{{ currentDetail.recheck.result }}</div></div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createApplication, getApplicationList, getCashboxList, getApplicationDetail, uploadFile } from '@/api'
import { useUserStore } from '@/store'

const userStore = useUserStore()
const formRef = ref(null)
const fileInputRef = ref(null)
const submitting = ref(false)
const availableBoxes = ref([])
const myList = ref([])
const detailVisible = ref(false)
const currentDetail = ref(null)

const statusMap = {
  pending_escort: '待押运',
  pending_checkin: '待入库',
  pending_recheck: '待复点',
  completed: '已完成'
}

const form = reactive({
  box_id: null,
  box_code: '',
  branch_id: userStore.userBranchId,
  branch_name: userStore.userBranch,
  seal_code: '',
  seal_photo: '',
  weight: 0,
  applicant_id: userStore.user?.id,
  applicant_name: userStore.userName,
  applicant_phone: userStore.user?.phone || '',
  remark: ''
})

const rules = {
  box_id: [{ required: true, message: '请选择尾箱', trigger: 'change' }],
  seal_code: [{ required: true, message: '请输入封签编号', trigger: 'blur' }],
  seal_photo: [{ required: true, message: '请上传封签照片', trigger: 'change' }],
  weight: [{ required: true, type: 'number', min: 0.1, message: '请输入重量', trigger: 'change' }]
}

const triggerUpload = () => fileInputRef.value?.click()

const onFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }
  try {
    const res = await uploadFile(file)
    form.seal_photo = res.url
  } finally {
    e.target.value = ''
  }
}

const onBoxChange = (id) => {
  const box = availableBoxes.value.find(b => b.id === id)
  if (box) {
    form.box_code = box.box_code
    if (!form.weight || form.weight === 0) {
      form.weight = box.weight
    }
  }
}

const loadData = async () => {
  availableBoxes.value = await getCashboxList({ branch_id: userStore.userBranchId, status: 'idle' })
  myList.value = await getApplicationList({ branch_id: userStore.userBranchId })
  myList.value = myList.value.slice(0, 8)
}

const resetForm = () => {
  formRef.value?.resetFields()
  form.box_id = null
  form.box_code = ''
  form.seal_code = ''
  form.seal_photo = ''
  form.weight = 0
  form.remark = ''
}

const submitForm = async () => {
  await formRef.value.validate()
  await ElMessageBox.confirm('确认提交寄库申请？提交后等待押运员交接。', '确认', { type: 'warning' })
  submitting.value = true
  try {
    await createApplication({ ...form })
    ElMessage.success('寄库申请提交成功！请等待押运员交接。')
    resetForm()
    loadData()
  } finally {
    submitting.value = false
  }
}

const viewDetail = async (row) => {
  currentDetail.value = await getApplicationDetail(row.id)
  detailVisible.value = true
}

onMounted(loadData)
</script>
