const test=require("node:test");const assert=require("node:assert/strict");const {enumerateWorkdays,formatChineseDate}=require("../src/workdays");
test("工作日范围自动排除周末",()=>assert.deepEqual(enumerateWorkdays("2026-08-10","2026-08-16"),["2026-08-10","2026-08-11","2026-08-12","2026-08-13","2026-08-14"]));
test("可排除指定日期",()=>assert.deepEqual(enumerateWorkdays("2026-08-10","2026-08-12",["2026-08-11"]),["2026-08-10","2026-08-12"]));
test("中文日期格式",()=>assert.equal(formatChineseDate("2026-08-12"),"2026年8月12日"));
test("拒绝倒置范围",()=>assert.throws(()=>enumerateWorkdays("2026-08-12","2026-08-10")));
test("Word 富文本加粗标记被拆分为加粗文本片段",()=>{const {parseRichSegments}=require("../src/word");assert.deepEqual(parseRichSegments("普通 **重点** 内容"),[{text:"普通 ",bold:false},{text:"重点",bold:true},{text:" 内容",bold:false}]);});
test("问题时间格式化为中文日期时间",()=>{const {formatDateTime}=require("../src/word");assert.equal(formatDateTime("2026-08-12T09:30"),"2026年8月12日 09:30");});
