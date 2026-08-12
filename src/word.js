const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, VerticalAlign, VerticalMergeType, BorderStyle, ShadingType, HeightRule, PageOrientation } = require("docx");
const { formatChineseDate } = require("./workdays");

const PAGE_WIDTH = 11906;
const TABLE_WIDTH = 10346;
const COLS = [760, 1900, 7686];
const borders = { top:{style:BorderStyle.SINGLE,size:8,color:"666666"}, bottom:{style:BorderStyle.SINGLE,size:8,color:"666666"}, left:{style:BorderStyle.SINGLE,size:8,color:"666666"}, right:{style:BorderStyle.SINGLE,size:8,color:"666666"}, insideHorizontal:{style:BorderStyle.SINGLE,size:6,color:"888888"}, insideVertical:{style:BorderStyle.SINGLE,size:6,color:"888888"} };
function para(value,{bold=false,center=false,size=22}={}) { return new Paragraph({ alignment:center?AlignmentType.CENTER:AlignmentType.LEFT, spacing:{before:30,after:30,line:360}, children:[new TextRun({text:String(value||""),bold,font:"宋体",size})] }); }
function verticalText(value) { return new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:390},children:[new TextRun({text:value.split("").join("\n"),font:"宋体",size:22})]}); }
function cell(value,width,options={}) { return new TableCell({ width:{size:width,type:WidthType.DXA}, columnSpan:options.span, verticalMerge:options.merge, verticalAlign:VerticalAlign.CENTER, shading:options.shade?{fill:"D9D9D9",type:ShadingType.CLEAR}:undefined, margins:{top:80,bottom:80,left:120,right:120}, children:options.vertical?[verticalText(value)]:[para(value,{center:options.center,bold:options.bold,size:options.size||22})] }); }
function infoRow(label,value,index) { return new TableRow({height:{value:570,rule:HeightRule.ATLEAST},children:[cell("相关信息",COLS[0],{vertical:true,merge:index===0?VerticalMergeType.RESTART:VerticalMergeType.CONTINUE}),cell(label,COLS[1],{center:true}),cell(value,COLS[2],{center:true})]}); }
function parseRichSegments(line) {
  const segments=[]; const pattern=/\*\*(.+?)\*\*/g; let last=0; let match;
  while ((match=pattern.exec(line))) {
    if (match.index>last) segments.push({text:line.slice(last,match.index),bold:false});
    segments.push({text:match[1],bold:true}); last=pattern.lastIndex;
  }
  if (last<line.length) segments.push({text:line.slice(last),bold:false});
  if (!segments.length) segments.push({text:" ",bold:false});
  return segments;
}
function richRuns(line) { return parseRichSegments(line).map(segment=>new TextRun({text:segment.text,bold:segment.bold,font:"宋体",size:22})); }
function contentParagraphs(value) { return String(value||"").split(/\r?\n/).map(line=>new Paragraph({spacing:{before:30,after:30,line:360},children:richRuns(line)})); }
function formatDateTime(value) { if(!value)return "未填写"; const [date,time]=String(value).split("T"); return `${formatChineseDate(date)} ${time||""}`.trim(); }
function issueParagraphs(issue={}) {
  if(!issue.hasIssue)return contentParagraphs("\n**运行问题及修复记录：**\n当日未发现运行异常。");
  return contentParagraphs(`\n**运行问题及修复记录：**\n问题发生时间：${formatDateTime(issue.problemTime)}\n存在问题：${issue.problemDescription||"未填写"}\n修复时间：${formatDateTime(issue.repairTime)}\n修复情况：${issue.repairDescription||"未填写"}`);
}

async function createRecord(template,date,issue={}) {
  const c=template.content||template;
  const rows=[
    new TableRow({height:{value:650,rule:HeightRule.ATLEAST},children:[cell(`项目名称： ${c.project_name}`,TABLE_WIDTH,{span:3,shade:true,size:22})]}),
    infoRow("试运行时间",formatChineseDate(date),0), infoRow("建设单位",c.construction_unit,1), infoRow("承建单位",c.contractor_unit,2), infoRow("监理单位",c.supervision_unit,3),
    new TableRow({height:{value:5150,rule:HeightRule.ATLEAST},children:[cell("运行情况",COLS[0],{vertical:true}),new TableCell({width:{size:COLS[1]+COLS[2],type:WidthType.DXA},columnSpan:2,verticalAlign:VerticalAlign.TOP,margins:{top:260,bottom:180,left:160,right:160},children:[...contentParagraphs(c.operation_content),...issueParagraphs(issue)]})]})
  ];
  const doc=new Document({creator:"试运行记录生成系统",title:c.document_title,sections:[{properties:{page:{size:{width:PAGE_WIDTH,height:16838,orientation:PageOrientation.PORTRAIT},margin:{top:650,right:780,bottom:650,left:780}}},children:[
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:180},children:[new TextRun({text:c.document_title,bold:false,font:"宋体",size:42})]}),
    new Table({width:{size:TABLE_WIDTH,type:WidthType.DXA},columnWidths:COLS,borders,layout:"fixed",rows})
  ]}]});
  return Packer.toBuffer(doc);
}
module.exports={createRecord,parseRichSegments,formatDateTime};
