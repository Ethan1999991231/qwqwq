
import fs from "node:fs";
import { spawnSync, spawn } from "node:child_process";
const root = "E:\\qwqwq-main";
const nginx = root + "\\tools\\nginx-1.30.0\\nginx.exe";
const port = 8099;
const conf = fs.readFileSync(root + "\\nginx.conf", "utf8")
  .replace(/listen\s+80;/, "listen 127.0.0.1:" + port + ";")
  .replace(/pid\s+logs\/nginx\.pid;/, "pid temp/local/nginx.pid;")
  .replace(/access_log\s+logs\/nginx-access\.log/, "access_log temp/local/access.log")
  .replace(/error_log\s+logs\/nginx-error\.log/, "error_log temp/local/error.log");
fs.mkdirSync(root + "\\temp\\local", { recursive: true });
fs.writeFileSync(root + "\\_local.conf", conf);
const t = spawnSync(nginx, ["-p", "./", "-c", "_local.conf", "-t"], { cwd: root, encoding: "utf8" });
console.log("nginx -t exit=" + t.status + " " + (t.stderr || "").trim().split("\n").slice(-1).join());
if (t.status !== 0) process.exit(1);
// 先看看是不是已经在跑
const stale = spawnSync(nginx, ["-p", "./", "-c", "_local.conf", "-s", "quit"], { cwd: root, encoding: "utf8" });
spawn(nginx, ["-p", "./", "-c", "_local.conf"], { cwd: root, stdio: "ignore", detached: true }).unref();
await new Promise(r => setTimeout(r, 1200));
for (const p of ["/index.html", "/apikey.html", "/api/v4"]) {
  const r = await fetch("http://127.0.0.1:" + port + p).then(x => x.status).catch(e => e.message);
  console.log(p + " -> " + r);
}
