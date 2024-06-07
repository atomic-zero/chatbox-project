const { spawn } = require("child_process");
const path = require('path');
const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

function start() {
  const main = spawn("node", [SCRIPT_PATH], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  main.on("close", (exitCode) => {
    if (exitCode === 0) {
      console.log("[0] - Process Existed!");
    } else if (exitCode === 1) {
      console.log("[1] - System Rebooting!....");
      start();
    } else {
      console.error(`[${exitCode}] - Process Existed!`);
    }
  });
}

start();