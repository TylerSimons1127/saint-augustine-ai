import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter((match) => !/\bsrc\s*=/.test(match[1]));
const errors = [];
scripts.forEach((match, index) => {
  try { new vm.Script(match[2], { filename: `index.html:inline-script-${index + 1}` }); }
  catch (error) { errors.push(`${error.message} (${error.stack?.split("\n")[0] || "inline script"})`); }
});
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`PASS: ${scripts.length} inline scripts parse.`);
