let exec = require("./exec");
let pretty_progress = require("./pretty_progress");
let Promise = require("bluebird");
let util = require("util");

let COLORS = {
  COMMAND: "d0d"
};

function publish(cli, client, bumpVersion) {
  (bumpVersion ? exec.exec(cli, "npm", "version", "patch") : Promise.resolve()).then(() => {
    return exec.exec(cli, "npm", "pack");
  }).catch((error) => {
    cli.displayError(error.message);
    process.exit(1);
  }).then((stdout) => {
    let lines = stdout.split("\n");
    let filename = lines[lines.length - 2];
    let remoteFilename = filename;
    process.stdout.write("\n");
    cli.display(cli.color(COLORS.COMMAND, ">>> upload to s3 " + process.env.S3PM_BUCKET));
    return upload(cli, client, filename, remoteFilename);
  }).catch((error) => {
    cli.displayError("Unable to upload to S3: ", error.message);
    process.exit(1);
  });
};

function upload(cli, client, filename, remoteFilename) {
  let deferred = Promise.defer();

  let params = {
    localFile: filename,
    s3Params: {
      Bucket: process.env.S3PM_BUCKET,
      Key: remoteFilename
    }
  };

  let uploader = client.uploadFile(params);
  uploader.on("error", (error) => {
    pretty_progress.clear();
    deferred.reject(error);
  });
  uploader.on("progress", () => {
    let partial = uploader.progressAmount / uploader.progressTotal;
    let message = `${remoteFilename} (${Math.round(100 * partial)}%)`;
    pretty_progress.draw(message, partial);
  });
  uploader.on("end", () => {
    setTimeout(() => {
      pretty_progress.clear();
      cli.displayNotice(remoteFilename);
      deferred.resolve();
    }, 10);
  });
  return deferred.promise;
};

exports.publish = publish;
