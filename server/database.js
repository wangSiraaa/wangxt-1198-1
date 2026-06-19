const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'vault_system.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function initDatabase() {
  try {
    await exec(`
      CREATE TABLE IF NOT EXISTS cash_box (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        box_code TEXT UNIQUE NOT NULL,
        box_name TEXT,
        branch_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        weight REAL DEFAULT 0,
        status TEXT DEFAULT 'idle',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS branch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_code TEXT UNIQUE NOT NULL,
        branch_name TEXT NOT NULL,
        branch_address TEXT,
        contact_person TEXT,
        contact_phone TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS vault_application (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_no TEXT UNIQUE NOT NULL,
        box_id INTEGER NOT NULL,
        box_code TEXT NOT NULL,
        branch_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        seal_code TEXT NOT NULL,
        seal_photo TEXT,
        weight REAL NOT NULL,
        applicant_id INTEGER,
        applicant_name TEXT NOT NULL,
        applicant_phone TEXT,
        status TEXT DEFAULT 'pending_escort',
        remark TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS escort_handover (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        application_no TEXT NOT NULL,
        box_id INTEGER NOT NULL,
        box_code TEXT NOT NULL,
        escort_id INTEGER NOT NULL,
        escort_name TEXT NOT NULL,
        escort_phone TEXT,
        vehicle_no TEXT,
        scan_time TEXT,
        branch_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        seal_code TEXT,
        handover_remark TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS vault_checkin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        application_no TEXT NOT NULL,
        box_id INTEGER NOT NULL,
        box_code TEXT NOT NULL,
        branch_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        seal_code TEXT NOT NULL,
        seal_photo_verify INTEGER DEFAULT 0,
        declared_weight REAL NOT NULL,
        actual_weight REAL NOT NULL,
        weight_diff REAL NOT NULL,
        weight_threshold REAL DEFAULT 0.5,
        need_recheck INTEGER DEFAULT 0,
        vault_user_id INTEGER,
        vault_user_name TEXT NOT NULL,
        handover_time TEXT,
        status TEXT DEFAULT 'pending',
        checkin_remark TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS recheck_record (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkin_id INTEGER NOT NULL,
        application_id INTEGER NOT NULL,
        application_no TEXT NOT NULL,
        box_id INTEGER NOT NULL,
        box_code TEXT NOT NULL,
        declared_weight REAL NOT NULL,
        first_weight REAL NOT NULL,
        recheck_weight REAL NOT NULL,
        final_weight REAL,
        recheck_user_id INTEGER,
        recheck_user_name TEXT NOT NULL,
        recheck_time TEXT,
        result TEXT,
        recheck_remark TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS system_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_code TEXT UNIQUE NOT NULL,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        branch_id INTEGER,
        branch_name TEXT,
        phone TEXT,
        password TEXT DEFAULT '123456',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS sys_param (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        param_key TEXT UNIQUE NOT NULL,
        param_value TEXT NOT NULL,
        param_desc TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    const branchCount = (await get('SELECT COUNT(*) as cnt FROM branch')).cnt;
    if (branchCount === 0) {
      await run('INSERT INTO branch (branch_code, branch_name, branch_address, contact_person, contact_phone) VALUES (?, ?, ?, ?, ?)',
        ['BR001', '朝阳支行', '北京市朝阳区建国路88号', '张经理', '13800138001']);
      await run('INSERT INTO branch (branch_code, branch_name, branch_address, contact_person, contact_phone) VALUES (?, ?, ?, ?, ?)',
        ['BR002', '海淀支行', '北京市海淀区中关村大街1号', '李经理', '13800138002']);
      await run('INSERT INTO branch (branch_code, branch_name, branch_address, contact_person, contact_phone) VALUES (?, ?, ?, ?, ?)',
        ['BR003', '西城支行', '北京市西城区金融街15号', '王经理', '13800138003']);
    }

    const userCount = (await get('SELECT COUNT(*) as cnt FROM system_user')).cnt;
    if (userCount === 0) {
      await run('INSERT INTO system_user (user_code, user_name, role, branch_id, branch_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        ['U001', '张网点', 'branch', 1, '朝阳支行', '13900139001']);
      await run('INSERT INTO system_user (user_code, user_name, role, branch_id, branch_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        ['U002', '李押运', 'escort', null, null, '13900139002']);
      await run('INSERT INTO system_user (user_code, user_name, role, branch_id, branch_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        ['U003', '王金库', 'vault', null, null, '13900139003']);
      await run('INSERT INTO system_user (user_code, user_name, role, branch_id, branch_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        ['U004', '赵复点', 'vault', null, null, '13900139004']);
    }

    const boxCount = (await get('SELECT COUNT(*) as cnt FROM cash_box')).cnt;
    if (boxCount === 0) {
      await run('INSERT INTO cash_box (box_code, box_name, branch_id, branch_name, weight, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['WX20240001', '现金尾箱A', 1, '朝阳支行', 25.5, 'idle']);
      await run('INSERT INTO cash_box (box_code, box_name, branch_id, branch_name, weight, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['WX20240002', '现金尾箱B', 1, '朝阳支行', 23.8, 'idle']);
      await run('INSERT INTO cash_box (box_code, box_name, branch_id, branch_name, weight, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['WX20240003', '现金尾箱C', 2, '海淀支行', 26.2, 'idle']);
      await run('INSERT INTO cash_box (box_code, box_name, branch_id, branch_name, weight, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['WX20240004', '现金尾箱D', 2, '海淀支行', 24.1, 'idle']);
      await run('INSERT INTO cash_box (box_code, box_name, branch_id, branch_name, weight, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['WX20240005', '现金尾箱E', 3, '西城支行', 25.0, 'idle']);
    }

    const paramCount = (await get('SELECT COUNT(*) as cnt FROM sys_param')).cnt;
    if (paramCount === 0) {
      await run('INSERT INTO sys_param (param_key, param_value, param_desc) VALUES (?, ?, ?)',
        ['weight_threshold', '0.5', '重量差异阈值(千克)']);
      await run('INSERT INTO sys_param (param_key, param_value, param_desc) VALUES (?, ?, ?)',
        ['require_seal_photo', '1', '是否必须上传封签照片(1是0否)']);
    }

    console.log('数据库初始化完成');
  } catch (err) {
    console.error('数据库初始化失败:', err);
    throw err;
  }
}

module.exports = { db, run, get, all, exec, initDatabase };
