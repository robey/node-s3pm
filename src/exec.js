let child_process = require("child_process");
let Promise = require("bluebird");
let util = require("util");

let COLORS = {
  COMMAND: "d0d",
  STDOUT: "777",
  STDERR: "666"
};

// run a command, dumping stdout/stderr in dark gray for debugging.
// returns a promise with the collected stdout string (or an error).
function exec(cli, ...command) {
  cli.display(cli.color(COLORS.COMMAND, ">>> " + command.join(" ")));
  let deferred = Promise.defer();
  let collectedStdout = "";

  let child = child_process.spawn(command[0], command.slice(1), { stdio: [ "ignore", "pipe", "pipe" ]});
  child.stdout.on("data", (data) => {
    collectedStdout += data.toString();
    process.stdout.write(cli.color(COLORS.STDOUT, data.toString()).toString());
  });
  child.stderr.on("data", (data) => {
    process.stderr.write(cli.color(COLORS.STDERR, data.toString()).toString());
  });
  child.on("error", (error) => {
    deferred.reject(error);
  });
  child.on("exit", (code, signal) => {
    if (code == null) {
      deferred.reject(new Error("process terminated with signal " + signal));
    } else if (code != 0) {
      deferred.reject(new Error("process terminated with exit code " + code));
    } else {
      deferred.resolve(collectedStdout);
    }
  });
  return deferred.promise;
}

exports.exec = exec;
