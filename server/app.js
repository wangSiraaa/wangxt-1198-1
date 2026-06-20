require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const API_PORT = process.env.API_PORT || 19498;

const { run, get, all, initDatabase } = require('./database');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadDir = path.join(__dirname, '..', 'data', 'uploads');
if (!require('fs').existsSync(uploadDir)) {
  require('fs').mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use('/uploads', express.static(uploadDir));

function generateNo(prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${dateStr}${rand}`;
}

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/branch/list', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM branch ORDER BY id');
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/user/list', async (req, res) => {
  try {
    const { role } = req.query;
    let sql = 'SELECT * FROM system_user WHERE 1=1';
    const params = [];
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    const rows = await all(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/user/login', async (req, res) => {
  try {
    const { user_code, password } = req.body;
    const user = await get('SELECT * FROM system_user WHERE user_code = ? AND password = ?', [user_code, password || '123456']);
    if (!user) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }
    res.json({ code: 200, data: user });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/cashbox/list', async (req, res) => {
  try {
    const { branch_id, status } = req.query;
    let sql = 'SELECT * FROM cash_box WHERE 1=1';
    const params = [];
    if (branch_id) {
      sql += ' AND branch_id = ?';
      params.push(branch_id);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id DESC';
    const rows = await all(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/cashbox/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM cash_box WHERE id = ?', [req.params.id]);
    res.json({ code: 200, data: row });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/cashbox', async (req, res) => {
  try {
    const { box_code, box_name, branch_id, branch_name, weight } = req.body;
    const info = await run(`
      INSERT INTO cash_box (box_code, box_name, branch_id, branch_name, weight, status)
      VALUES (?, ?, ?, ?, ?, 'idle')
    `, [box_code, box_name, branch_id, branch_name, weight || 0]);
    res.json({ code: 200, data: { id: info.lastID } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/param/list', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM sys_param');
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/param/update', async (req, res) => {
  try {
    const { params } = req.body;
    for (const item of params) {
      await run('UPDATE sys_param SET param_value = ? WHERE param_key = ?', [item.param_value, item.param_key]);
    }
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '未上传文件' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ code: 200, data: { url, filename: req.file.filename } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/application/create', async (req, res) => {
  try {
    const {
      box_id, box_code, branch_id, branch_name,
      seal_code, seal_photo, weight,
      applicant_id, applicant_name, applicant_phone, remark
    } = req.body;

    const requireSealPhoto = await get("SELECT param_value FROM sys_param WHERE param_key = 'require_seal_photo'");
    if (requireSealPhoto && requireSealPhoto.param_value === '1' && !seal_photo) {
      return res.json({ code: 400, message: '必须上传封签照片' });
    }

    const application_no = generateNo('JK');
    const info = await run(`
      INSERT INTO vault_application (
        application_no, box_id, box_code, branch_id, branch_name,
        seal_code, seal_photo, weight,
        applicant_id, applicant_name, applicant_phone, remark, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_escort')
    `, [
      application_no, box_id, box_code, branch_id, branch_name,
      seal_code, seal_photo, weight,
      applicant_id, applicant_name, applicant_phone, remark
    ]);

    await run("UPDATE cash_box SET status = 'pending_escort', updated_at = datetime('now', 'localtime') WHERE id = ?", [box_id]);

    res.json({ code: 200, data: { id: info.lastID, application_no } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/application/list', async (req, res) => {
  try {
    const { status, branch_id, start_date, end_date } = req.query;
    let sql = 'SELECT * FROM vault_application WHERE 1=1';
    const params = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (branch_id) {
      sql += ' AND branch_id = ?';
      params.push(branch_id);
    }
    if (start_date) {
      sql += ' AND date(created_at) >= date(?)';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND date(created_at) <= date(?)';
      params.push(end_date);
    }
    sql += ' ORDER BY id DESC';
    const rows = await all(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/application/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM vault_application WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.json({ code: 404, message: '记录不存在' });
    }
    const escort = await get('SELECT * FROM escort_handover WHERE application_id = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    const checkin = await get('SELECT * FROM vault_checkin WHERE application_id = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    const recheck = checkin ? await get('SELECT * FROM recheck_record WHERE checkin_id = ? ORDER BY id DESC LIMIT 1', [checkin.id]) : null;
    res.json({ code: 200, data: { ...row, escort, checkin, recheck } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/application/no/:application_no', async (req, res) => {
  try {
    const row = await get('SELECT * FROM vault_application WHERE application_no = ?', [req.params.application_no]);
    if (!row) {
      return res.json({ code: 404, message: '申请单不存在' });
    }
    res.json({ code: 200, data: row });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/escort/handover', async (req, res) => {
  try {
    const {
      application_id, application_no, box_id, box_code,
      escort_id, escort_name, escort_phone, vehicle_no,
      branch_id, branch_name, seal_code, handover_remark
    } = req.body;

    const app = await get('SELECT * FROM vault_application WHERE id = ?', [application_id]);
    if (!app) {
      return res.json({ code: 404, message: '申请单不存在' });
    }
    if (app.status !== 'pending_escort') {
      return res.json({ code: 400, message: `当前状态[${app.status}]不能进行押运交接` });
    }

    const info = await run(`
      INSERT INTO escort_handover (
        application_id, application_no, box_id, box_code,
        escort_id, escort_name, escort_phone, vehicle_no,
        branch_id, branch_name, seal_code, scan_time, handover_remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)
    `, [
      application_id, application_no, box_id, box_code,
      escort_id, escort_name, escort_phone, vehicle_no,
      branch_id, branch_name, seal_code, handover_remark
    ]);

    await run(`
      UPDATE vault_application
      SET status = 'pending_checkin', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [application_id]);

    await run(`
      UPDATE cash_box
      SET status = 'in_transit', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [box_id]);

    res.json({ code: 200, data: { id: info.lastID } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/escort/list', async (req, res) => {
  try {
    const { escort_id, application_no } = req.query;
    let sql = 'SELECT * FROM escort_handover WHERE 1=1';
    const params = [];
    if (escort_id) {
      sql += ' AND escort_id = ?';
      params.push(escort_id);
    }
    if (application_no) {
      sql += ' AND application_no = ?';
      params.push(application_no);
    }
    sql += ' ORDER BY id DESC';
    const rows = await all(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/vault/checkin', async (req, res) => {
  try {
    const {
      application_id, application_no, box_id, box_code,
      branch_id, branch_name, seal_code, seal_photo_verify,
      declared_weight, actual_weight,
      vault_user_id, vault_user_name, checkin_remark
    } = req.body;

    const app = await get('SELECT * FROM vault_application WHERE id = ?', [application_id]);
    if (!app) {
      return res.json({ code: 404, message: '申请单不存在' });
    }
    if (app.status !== 'pending_checkin') {
      return res.json({ code: 400, message: `当前状态[${app.status}]不能进行入库核对` });
    }

    if (seal_photo_verify !== 1) {
      return res.json({ code: 400, message: '封签照片缺失或核对不通过，不能入库' });
    }

    const thresholdParam = await get("SELECT param_value FROM sys_param WHERE param_key = 'weight_threshold'");
    const weight_threshold = parseFloat(thresholdParam?.param_value || '0.5');
    const weight_diff = Math.abs(parseFloat(actual_weight) - parseFloat(declared_weight));
    const need_recheck = weight_diff > weight_threshold ? 1 : 0;

    const status = need_recheck ? 'pending_recheck' : 'checked_in';

    const info = await run(`
      INSERT INTO vault_checkin (
        application_id, application_no, box_id, box_code,
        branch_id, branch_name, seal_code, seal_photo_verify,
        declared_weight, actual_weight, weight_diff, weight_threshold,
        need_recheck, vault_user_id, vault_user_name,
        handover_time, status, checkin_remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
    `, [
      application_id, application_no, box_id, box_code,
      branch_id, branch_name, seal_code, seal_photo_verify,
      declared_weight, actual_weight, weight_diff, weight_threshold,
      need_recheck, vault_user_id, vault_user_name,
      status, checkin_remark
    ]);

    const appStatus = need_recheck ? 'pending_recheck' : 'completed';
    await run(`
      UPDATE vault_application
      SET status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [appStatus, application_id]);

    if (!need_recheck) {
      await run(`
        UPDATE cash_box
        SET status = 'in_vault', updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `, [box_id]);
    }

    res.json({
      code: 200,
      data: {
        id: info.lastID,
        need_recheck,
        weight_diff,
        weight_threshold,
        status
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/vault/checkin/list', async (req, res) => {
  try {
    const { status, application_no, branch_id } = req.query;
    let sql = 'SELECT * FROM vault_checkin WHERE 1=1';
    const params = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (application_no) {
      sql += ' AND application_no = ?';
      params.push(application_no);
    }
    if (branch_id) {
      sql += ' AND branch_id = ?';
      params.push(branch_id);
    }
    sql += ' ORDER BY id DESC';
    const rows = await all(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/vault/handover-time/lock', async (req, res) => {
  try {
    const { checkin_id, vault_user_id } = req.body;
    const checkin = await get('SELECT * FROM vault_checkin WHERE id = ?', [checkin_id]);
    if (!checkin) {
      return res.json({ code: 404, message: '入库记录不存在' });
    }
    if (checkin.status === 'pending_recheck') {
      return res.json({ code: 400, message: '待复点状态不能锁定交接时间，请先完成复点' });
    }
    if (checkin.status === 'handover_confirmed') {
      return res.json({ code: 400, message: '交接时间已锁定，不可重复锁定' });
    }
    if (checkin.status !== 'checked_in' && checkin.status !== 'rechecked') {
      return res.json({ code: 400, message: `当前状态[${checkin.status}]不能锁定交接时间` });
    }
    await run(`
      UPDATE vault_checkin
      SET status = 'handover_confirmed',
          lock_user_id = ?,
          lock_user_name = ?,
          lock_time = datetime('now', 'localtime'),
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [vault_user_id, (req.body.vault_user_name || ''), checkin_id]);
    res.json({ code: 200, message: '交接时间已锁定，后续不可修改' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.post('/api/recheck/create', async (req, res) => {
  try {
    const {
      checkin_id, application_id, application_no,
      box_id, box_code, declared_weight, first_weight,
      recheck_weight, recheck_user_id, recheck_user_name,
      result, recheck_remark
    } = req.body;

    const checkin = await get('SELECT * FROM vault_checkin WHERE id = ?', [checkin_id]);
    if (!checkin) {
      return res.json({ code: 404, message: '入库记录不存在' });
    }
    if (checkin.status !== 'pending_recheck') {
      return res.json({ code: 400, message: `当前状态[${checkin.status}]不能进行复点` });
    }

    const final_weight = parseFloat(recheck_weight);
    const info = await run(`
      INSERT INTO recheck_record (
        checkin_id, application_id, application_no,
        box_id, box_code, declared_weight, first_weight,
        recheck_weight, final_weight, recheck_user_id, recheck_user_name,
        recheck_time, result, recheck_remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
    `, [
      checkin_id, application_id, application_no,
      box_id, box_code, declared_weight, first_weight,
      recheck_weight, final_weight, recheck_user_id, recheck_user_name,
      result, recheck_remark
    ]);

    await run(`
      UPDATE vault_checkin
      SET status = 'rechecked',
          actual_weight = ?,
          weight_diff = ABS(declared_weight - ?),
          need_recheck = 0,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [final_weight, final_weight, checkin_id]);

    await run(`
      UPDATE vault_application
      SET status = 'completed', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [application_id]);

    await run(`
      UPDATE cash_box
      SET status = 'in_vault', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [box_id]);

    res.json({ code: 200, data: { id: info.lastID } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/recheck/list', async (req, res) => {
  try {
    const { status, application_no } = req.query;
    let sql = `
      SELECT r.*, c.status as checkin_status, c.branch_name
      FROM recheck_record r
      LEFT JOIN vault_checkin c ON r.checkin_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (application_no) {
      sql += ' AND r.application_no = ?';
      params.push(application_no);
    }
    sql += ' ORDER BY r.id DESC';
    const rows = await all(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

app.get('/api/statistics/summary', async (req, res) => {
  try {
    const totalApp = (await get('SELECT COUNT(*) as cnt FROM vault_application')).cnt;
    const pendingEscort = (await get("SELECT COUNT(*) as cnt FROM vault_application WHERE status = 'pending_escort'")).cnt;
    const pendingCheckin = (await get("SELECT COUNT(*) as cnt FROM vault_application WHERE status = 'pending_checkin'")).cnt;
    const pendingRecheck = (await get("SELECT COUNT(*) as cnt FROM vault_application WHERE status = 'pending_recheck'")).cnt;
    const completed = (await get("SELECT COUNT(*) as cnt FROM vault_application WHERE status = 'completed'")).cnt;
    const totalBox = (await get('SELECT COUNT(*) as cnt FROM cash_box')).cnt;
    const inVaultBox = (await get("SELECT COUNT(*) as cnt FROM cash_box WHERE status = 'in_vault'")).cnt;
    const idleBox = (await get("SELECT COUNT(*) as cnt FROM cash_box WHERE status = 'idle'")).cnt;
    res.json({
      code: 200,
      data: {
        totalApp, pendingEscort, pendingCheckin, pendingRecheck, completed,
        totalBox, inVaultBox, idleBox
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

const distPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function start() {
  await initDatabase();
  app.listen(API_PORT, '0.0.0.0', () => {
    console.log(`后端服务启动成功，端口: ${API_PORT}`);
    console.log(`API地址: http://0.0.0.0:${API_PORT}/api`);
  });
}

start().catch(err => {
  console.error('服务启动失败:', err);
  process.exit(1);
});
