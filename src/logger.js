const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "..", "logs");
const errorLog = path.join(logDir, "error.log");

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    };
  }
  return { message: String(error) };
}

function logError(error, context = {}) {
  const payload = {
    time: new Date().toISOString(),
    context,
    error: serializeError(error),
  };
  const line = `${JSON.stringify(payload)}\n`;

  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(errorLog, line, "utf8");
  } catch (logWriteError) {
    console.error("Failed to write error log", logWriteError);
  }

  console.error(payload);
}

module.exports = { logError };
