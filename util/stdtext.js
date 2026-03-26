/*
accept two args: "os" and "file"

read the file, accepting either lf or crlf terminators

and rewrite it with the platform's convention

if the first arg is "windows" use crlf, otherwise use lf
*/
const fs = require("fs");

const os = process.argv[2];
const file = process.argv[3];

if (!os || !file) {
  console.error("Usage: stdtext.js <os> <file>");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8");
const lines = content.split(/\r?\n/);
const eol = os === "windows" ? "\r\n" : "\n";
fs.writeFileSync(file, lines.join(eol));