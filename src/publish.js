"use strict";

import exec from "./exec";
import Promise from "bluebird";
import * as progress from "./pretty_progress";

const COLORS = {
  COMMAND: "d0d"
};

export default function publish(cli, client, options = {}) {
  return pack(cli, options).then(stdout => {
    const lines = stdout.split("\n");
    // FIXME: this seems fragile:
    const filename = lines[lines.length - 2];
    const remoteFilename = filename;
    process.stdout.write("\n");
    cli.display(cli.color(COLORS.COMMAND, ">>> upload to s3 " + process.env.S3PM_BUCKET));
    return upload(cli, client, filename, remoteFilename);
  }).catch(error => {
    cli.displayError("Unable to upload to S3: ", error.message);
    process.exit(1);
  });
}

function pack(cli, options = {}) {
  return (options.bumpVersion ? exec(cli, "npm", "version", "patch") : Promise.resolve()).then(() => {
    return exec(cli, "npm", "pack");
  }).catch(error => {
    cli.displayError(error.message);
    process.exit(1);
  });
}

function upload(cli, client, filename, remoteFilename) {
  return new Promise((resolve, reject) => {
    const params = {
      localFile: filename,
      s3Params: {
        Bucket: process.env.S3PM_BUCKET,
        Key: remoteFilename
      }
    };

    const uploader = client.uploadFile(params);
    uploader.on("error", error => {
      progress.clear();
      reject(error);
    });
    uploader.on("progress", () => {
      const partial = uploader.progressAmount / uploader.progressTotal;
      const message = `${remoteFilename} (${Math.round(100 * partial)}%)`;
      progress.draw(message, partial);
    });
    uploader.on("end", () => {
      setTimeout(() => {
        progress.clear();
        cli.display(remoteFilename);
        resolve();
      }, 10);
    });
  });
}
