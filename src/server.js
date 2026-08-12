require("dotenv").config();
const express = require("express");
const path = require("path");
const archiver = require("archiver");
const db = require("./db");
const { enumerateWorkdays, parseDate } = require("./workdays");
const { createRecord } = require("./word");
const { logError } = require("./logger");

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3100);
const appName = process.env.APP_NAME || "试运行记录生成系统";
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.urlencoded({ extended:true, limit:"1mb" }));
app.use(express.json({ limit:"1mb" }));
app.use("/public", express.static(path.join(__dirname,"..","public")));

const fields = ["name","document_title","project_name","construction_unit","contractor_unit","supervision_unit","operation_content"];
const cleanContent = body => Object.fromEntries(fields.map(key => [key, String(body[key] || "").trim()]));
const safeName = value => String(value || "记录").replace(/[\\/:*?\"<>|]/g,"-").slice(0,60);
function parseIssueRecords(value, dates) {
  let source={}; try { source=JSON.parse(String(value||"{}")); } catch (_error) { throw new Error("问题记录格式无效，请重新填写。"); }
  return Object.fromEntries(dates.map(date=>{const item=source[date]||{};return [date,{hasIssue:Boolean(item.hasIssue),problemTime:String(item.problemTime||"").slice(0,16),problemDescription:String(item.problemDescription||"").trim().slice(0,1000),repairTime:String(item.repairTime||"").slice(0,16),repairDescription:String(item.repairDescription||"").trim().slice(0,1000)}];}));
}

app.get("/healthz", (_req,res) => res.json({ok:true,name:appName,db:"sqlite",time:new Date().toISOString()}));
app.get("/", (req,res,next) => { try { const templates=db.listTemplates(); const selected=db.getTemplate(req.query.template || templates[0]?.id); res.render("index",{appName,templates,selected,defaults:db.defaults}); } catch(e){next(e);} });
app.get("/history", (_req,res,next) => { try { res.render("history",{appName,logs:db.listGenerationLogs()}); } catch(e){next(e);} });
app.post("/api/workdays", (req,res,next) => { try { res.json({dates:enumerateWorkdays(req.body.start_date,req.body.end_date,req.body.excluded || [])}); } catch(e){next(e);} });
app.post("/templates", (req,res,next) => { try { const id=db.saveTemplate(cleanContent(req.body), req.body.id || null); res.redirect(`/?template=${id}&saved=1`); } catch(e){next(e);} });
app.post("/templates/:id/delete", (req,res,next) => { try { db.deleteTemplate(req.params.id); res.redirect("/"); } catch(e){next(e);} });
app.post("/generate", async (req,res,next) => {
  try {
    const rawDates = Array.isArray(req.body.dates) ? req.body.dates : req.body.dates ? [req.body.dates] : [];
    const dates = rawDates.flatMap(value => String(value).split(",")).map(value => value.trim()).filter(Boolean);
    if (!dates.length || dates.length > 267) throw new Error("请至少选择 1 个工作日，单次最多生成 267 份。");
    if (dates.some(date => !parseDate(date))) throw new Error("日期格式无效，请重新选择工作日。");
    const issueRecords=parseIssueRecords(req.body.issue_records,dates);
    const template = req.body.template_id ? db.getTemplate(req.body.template_id) : {content:cleanContent(req.body)};
    if (!template) throw new Error("所选模板不存在。");
    const base=safeName(template.content.document_title);
    if (dates.length === 1) {
      const filename=`${base}-${dates[0]}.docx`; db.addGenerationLog({templateName:template.name || template.content.name,dates,filename});
      res.attachment(filename).send(await createRecord(template,dates[0],issueRecords[dates[0]])); return;
    }
    const filename=`${base}-${dates[0]}至${dates[dates.length-1]}-${dates.length}份.zip`;
    db.addGenerationLog({templateName:template.name || template.content.name,dates,filename});
    res.attachment(filename); const zip=archiver("zip",{zlib:{level:9}}); zip.on("error",next); zip.pipe(res);
    for (const date of dates) zip.append(await createRecord(template,date,issueRecords[date]),{name:`${base}-${date}.docx`});
    await zip.finalize();
  } catch(e){next(e);}
});
app.use((error,req,res,_next) => { logError(error,{type:"express",method:req.method,path:req.originalUrl,ip:req.ip}); if(req.path.startsWith("/api/")) return res.status(400).json({error:error.message}); res.status(500).render("error",{appName,error}); });
process.on("uncaughtException",e=>{logError(e,{type:"uncaughtException"});process.exit(1);});
process.on("unhandledRejection",e=>logError(e,{type:"unhandledRejection"}));
try { db.initDb(); app.listen(port,host,()=>console.log(`${appName} listening at http://${host}:${port}`)); } catch(e){logError(e,{type:"startup"});process.exit(1);}
