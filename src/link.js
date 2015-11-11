"use strict";

import exec from "./exec";
// let Promise = require("bluebird");

// is there a better guess here?
// better than 15 minutes, but may be a rude surprise when the link stops working in a year.
const YEAR = 60 * 60 * 24 * 366;

export function linkLatest(cli, client, packageName, devMode) {
  return findLatest(cli, client, packageName).then(({ filename, url }) => {
    cli.display(filename);

    const saveOption = devMode ? "--save-dev" : "--save";
    exec(cli, "npm", "install", url, saveOption).then(() => {
      process.exit(0);
    }).catch(error => {
      cli.displayError(error);
      process.exit(1);
    });
  });
}

// return the { filename, url } of the latest version of this package.
export function findLatest(cli, client, packageName) {
  return listPackages(client, packageName).then(packageNames => {
    if (packageNames.length == 0) {
      cli.displayError("No packages matching: " + packageName);
      process.exit(1);
    }
    const sortedPackageNames = sortByVersion(packageNames);
    const latest = sortedPackageNames[sortedPackageNames.length - 1];

    const params = {
      Bucket: process.env.S3PM_BUCKET,
      Key: latest,
      Expires: YEAR
    };
    return { filename: latest, url: client.s3.getSignedUrl("getObject", params) };
  });
}

// return list of tarballs that match "(packageName)-"
function listPackages(client, packageName) {
  const s3Params = {
    Bucket: process.env.S3PM_BUCKET,
    Prefix: packageName + "-"
  };
  const filenames = [];
  const matcher = new RegExp(packageName + "-([\\d\\.]+)\\.tgz");

  return new Promise((resolve, reject) => {
    const lister = client.listObjects({ s3Params: s3Params });
    lister.on("error", error => {
      reject(error);

      // console.log("Unable to list objects in " + BUCKET + ": ", error.stack);
      // process.exit(1);
    });
    // progress? do we care?
    lister.on("data", result => {
      result.Contents.forEach(entry => {
        if (entry.Key.match(matcher)) {
          filenames.push(entry.Key);
        }
      });
    });
    lister.on("end", () => {
      resolve(filenames);
    });
  });
}

// given an array of package tarball filenames, sort them in version order.
// (ignores snapshots and other non-numeric version strings)
function sortByVersion(packageNames) {
  const sortOrder = filename => {
    const m = filename.match(/\-([\d\.]+)/);
    if (!m) return 0;
    let total = 0;
    const segments = m[1].split(".").slice(0, 3);
    if (segments[segments.length - 1] == "") segments.pop();
    while (segments.length < 3) segments.push("0");
    for (const i in segments) {
      total = total * 1000 + parseInt(segments[i]);
    }
    return total;
  };
  return packageNames.sort((a, b) => sortOrder(a) - sortOrder(b));
}
