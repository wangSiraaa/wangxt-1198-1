import request from '@/utils/request'

export const healthCheck = () => request.get('/health')

export const getBranchList = () => request.get('/branch/list')

export const getUserList = (role) => request.get('/user/list', { params: { role } })

export const userLogin = (data) => request.post('/user/login', data)

export const getCashboxList = (params) => request.get('/cashbox/list', { params })

export const getCashboxDetail = (id) => request.get(`/cashbox/${id}`)

export const createCashbox = (data) => request.post('/cashbox', data)

export const getParamList = () => request.get('/param/list')

export const updateParam = (params) => request.post('/param/update', { params })

export const uploadFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const createApplication = (data) => request.post('/application/create', data)

export const getApplicationList = (params) => request.get('/application/list', { params })

export const getApplicationDetail = (id) => request.get(`/application/${id}`)

export const getApplicationByNo = (no) => request.get(`/application/no/${no}`)

export const escortHandover = (data) => request.post('/escort/handover', data)

export const getEscortList = (params) => request.get('/escort/list', { params })

export const vaultCheckin = (data) => request.post('/vault/checkin', data)

export const getCheckinList = (params) => request.get('/vault/checkin/list', { params })

export const lockHandoverTime = (data) => request.post('/vault/handover-time/lock', data)

export const createRecheck = (data) => request.post('/recheck/create', data)

export const getRecheckList = (params) => request.get('/recheck/list', { params })

export const getStatistics = () => request.get('/statistics/summary')
