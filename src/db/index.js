const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

let db;
const defaults = {
  name: "默认试运行记录模板",
  document_title: "试运行情况记录表",
  project_name: "如皋市新时代技防城项目综合应用平台--交互平台",
  construction_unit: "如皋市公安局",
  contractor_unit: "江苏移动信息系统集成有限公司",
  supervision_unit: "苏州市软件评测中心有限公司",
  operation_content: "**图像网：**\n1、平台视频预览、视频回放随机选择10个不同组织目录点位播放，播放取流正常\n2、平台人脸、人体、车辆数据查询正常，数据量正常；\n3、人脸搜图服务运行正常，上传图片检索结果正常展示；\n4、大数据后端服务运行正常，无停止或异常显示。\n\n**公安网：**\n1、平台视频预览、视频回放随机选择10个不同组织目录点位播放，播放取流正常\n2、平台智能搜索查询数据正常，数据量正常\n3、查询历史布控任务，能够产生预警数据\n4、查询人员档案、全息档案，测试两个人员数据，能够正常展示\n5、查询关系图谱，能否正常展示两个人的关系信息\n6、查询数据建模平台，历史建模任务能够正常运行\n\n**服务器：**\n1、图像网通用服务器运行正常，云存储服务器运行正常，解析服务器运行正常，大户数据服务器运行正常；\n2、公安网通用服务器运行正常，大数据服务器运行正常\n\n**运维治理：**\n1、治理任务完成50+治理任务"
};

function initDb() {
  const file = path.resolve(process.env.SQLITE_FILE || "./data/app.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists templates (
      id integer primary key autoincrement, name text not null, content_json text not null,
      created_at text not null default current_timestamp, updated_at text not null default current_timestamp
    );
    create table if not exists generation_logs (
      id integer primary key autoincrement, template_name text not null, date_count integer not null,
      dates_json text not null, filename text not null, created_at text not null default current_timestamp
    );
  `);
  if (!db.prepare("select 1 from templates limit 1").get()) saveTemplate(defaults);
}

function listTemplates() {
  return db.prepare("select * from templates order by updated_at desc, id desc").all().map(row => ({ ...row, content: JSON.parse(row.content_json) }));
}
function getTemplate(id) {
  const row = id ? db.prepare("select * from templates where id = ?").get(id) : db.prepare("select * from templates order by id limit 1").get();
  return row ? { ...row, content: JSON.parse(row.content_json) } : null;
}
function saveTemplate(content, id) {
  const clean = { ...defaults, ...content };
  const name = String(clean.name || defaults.name).trim();
  if (id) {
    db.prepare("update templates set name=?, content_json=?, updated_at=current_timestamp where id=?").run(name, JSON.stringify(clean), id);
    return Number(id);
  }
  return Number(db.prepare("insert into templates(name, content_json) values(?,?)").run(name, JSON.stringify(clean)).lastInsertRowid);
}
function deleteTemplate(id) {
  if (db.prepare("select count(*) count from templates").get().count <= 1) throw new Error("至少需要保留一个模板。");
  db.prepare("delete from templates where id=?").run(id);
}
function addGenerationLog(item) {
  db.prepare("insert into generation_logs(template_name,date_count,dates_json,filename) values(?,?,?,?)")
    .run(item.templateName, item.dates.length, JSON.stringify(item.dates), item.filename);
}
function listGenerationLogs() { return db.prepare("select * from generation_logs order by id desc limit 100").all(); }

module.exports = { initDb, listTemplates, getTemplate, saveTemplate, deleteTemplate, addGenerationLog, listGenerationLogs, defaults };
