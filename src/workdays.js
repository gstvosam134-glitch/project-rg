function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  return date.toISOString().slice(0, 10) === value ? date : null;
}
function enumerateWorkdays(start, end, excluded = []) {
  const from = parseDate(start); const to = parseDate(end);
  if (!from || !to || from > to) throw new Error("请选择有效的开始和结束日期。");
  if ((to - from) / 86400000 > 366) throw new Error("单次日期范围不能超过 366 天。");
  const skip = new Set(excluded); const dates = [];
  for (let date = new Date(from); date <= to; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.getUTCDay(); const value = date.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !skip.has(value)) dates.push(value);
  }
  return dates;
}
function formatChineseDate(value) {
  const date = parseDate(value);
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}
module.exports = { parseDate, enumerateWorkdays, formatChineseDate };
