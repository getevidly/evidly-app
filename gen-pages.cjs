const fs = require("fs");
const path = require("path");
const base = "C:/Users/newpa/Downloads/evidly-demo-final/evidly-app-main/apps/web-vendor/src/pages/marketing";
fs.mkdirSync(base, { recursive: true });
function w(n, c) { fs.writeFileSync(path.join(base, n), c); console.log("Created:", n, c.length, "chars"); }

// File contents stored as JSON strings for safe handling
const files = JSON.parse(fs.readFileSync("C:/Users/newpa/Downloads/evidly-demo-final/evidly-app-main/page-contents.json", "utf8"));
for (const [name, content] of Object.entries(files)) { w(name, content); }
console.log("All files written!");