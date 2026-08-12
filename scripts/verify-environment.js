const fs = require("fs");
const net = require("net");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const results = [];

function pass(message) {
  results.push({ ok: true, message });
}

function fail(message, hint) {
  results.push({ ok: false, message, hint });
}

function exists(relativePath, required = true) {
  const full = path.join(root, relativePath);
  if (fs.existsSync(full)) {
    pass(`${relativePath} exists`);
    return true;
  }
  const message = `${relativePath} is missing`;
  if (required) fail(message, "Restore the file from the deployment bundle or rebuild the offline package.");
  else results.push({ ok: null, message });
  return false;
}

function readEnv() {
  const envPath = path.join(root, ".env");
  const fallbackPath = path.join(root, ".env.example");
  const target = fs.existsSync(envPath) ? envPath : fallbackPath;
  if (!fs.existsSync(envPath)) {
    fail(".env is missing", "Copy .env.example to .env and adjust host, port, and database settings.");
  } else {
    pass(".env exists");
  }

  if (!fs.existsSync(target)) return {};
  return fs
    .readFileSync(target, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return acc;
      const index = trimmed.indexOf("=");
      acc[trimmed.slice(0, index)] = trimmed.slice(index + 1);
      return acc;
    }, {});
}

function parseHostPort(urlText) {
  if (!urlText) return null;
  try {
    const parsed = new URL(urlText);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || (parsed.protocol === "postgres:" ? 5432 : parsed.protocol === "https:" ? 443 : 80)),
    };
  } catch (_error) {
    return null;
  }
}

function checkTcp(host, port, label) {
  return new Promise((resolve) => {
    if (!host || !port) {
      fail(`${label} is not configured`, "Check DATABASE_URL in .env.");
      resolve();
      return;
    }

    const socket = net.createConnection({ host, port, timeout: 2500 });
    socket.on("connect", () => {
      pass(`${label} ${host}:${port} is reachable`);
      socket.end();
      resolve();
    });
    socket.on("timeout", () => {
      fail(`${label} ${host}:${port} timed out`, "Start the service or check firewall and port settings.");
      socket.destroy();
      resolve();
    });
    socket.on("error", () => {
      fail(`${label} ${host}:${port} is not reachable`, "Start PostgreSQL or update DATABASE_URL.");
      resolve();
    });
  });
}

function checkUrl(urlText) {
  return new Promise((resolve) => {
    if (!urlText) {
      results.push({ ok: null, message: "VERIFY_URL is not configured; skipping HTTP health check" });
      resolve();
      return;
    }

    let parsed;
    try {
      parsed = new URL(urlText);
    } catch (_error) {
      fail("VERIFY_URL is invalid", "Use a full URL such as http://127.0.0.1:3000/healthz.");
      resolve();
      return;
    }

    const client = parsed.protocol === "https:" ? https : http;
    const request = client.get(parsed, { timeout: 3000 }, (response) => {
      response.resume();
      if (response.statusCode >= 200 && response.statusCode < 400) {
        pass(`health endpoint returned ${response.statusCode}`);
      } else {
        fail(`health endpoint returned ${response.statusCode}`, "Check application logs and /healthz route.");
      }
      resolve();
    });
    request.on("timeout", () => {
      request.destroy();
      fail("health endpoint timed out", "Start the app and verify HOST/PORT.");
      resolve();
    });
    request.on("error", () => {
      fail("health endpoint is not reachable", "Start the app before the final health verification.");
      resolve();
    });
  });
}

async function main() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 22) pass(`Node.js ${process.versions.node} is supported`);
  else fail(`Node.js ${process.versions.node} is too old`, "Install Node.js 22 or newer.");

  [
    "package.json",
    "package-lock.json",
    ".env.example",
    "离线安装部署文档.md",
    "public/favicon.ico",
    "src/logger.js",
    "scripts/start-background.bat",
    "scripts/stop-background.bat",
    "scripts/start-background.sh",
    "scripts/stop-background.sh",
  ].forEach((file) => exists(file));

  exists("node_modules");

  const env = readEnv();
  if ((env.DB_CLIENT || "sqlite") === "postgres") {
    const db = parseHostPort(env.DATABASE_URL);
    await checkTcp(db && db.host, db && db.port, "database");
  } else {
    const sqliteFile = path.resolve(root, env.SQLITE_FILE || "./data/app.db");
    fs.mkdirSync(path.dirname(sqliteFile), { recursive: true });
    pass(`SQLite directory is writable: ${path.dirname(sqliteFile)}`);
  }
  await checkUrl(env.VERIFY_URL || env.HEALTHCHECK_URL);

  for (const result of results) {
    const prefix = result.ok === true ? "[OK]" : result.ok === false ? "[FAIL]" : "[SKIP]";
    console.log(`${prefix} ${result.message}`);
    if (result.hint) console.log(`       ${result.hint}`);
  }

  const failed = results.filter((result) => result.ok === false).length;
  if (failed > 0) {
    console.error(`Verification failed: ${failed} issue(s).`);
    process.exit(1);
  }
  console.log("Verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
