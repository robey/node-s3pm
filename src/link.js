let exec = require("./exec");
let Promise = require("bluebird");
let util = require("util");

// is there a better guess here?
// better than 15 minutes, but may be a rude surprise when the link stops working in a year.
let YEAR = 60 * 60 * 24 * 366;

function linkLatest(cli, client, packageName, devMode) {
  listPackages(client, packageName).then((packageNames) => {
    if (packageNames.length == 0) {
      cli.displayError("No packages matching: " + packageName);
      process.exit(1);
    }
    let sortedPackageNames = sortByVersion(packageNames);
    let latest = sortedPackageNames[sortedPackageNames.length - 1];
    cli.display(latest);

    let params = {
      Bucket: process.env.S3PM_BUCKET,
      Key: latest,
      Expires: YEAR
    };
    let url = client.s3.getSignedUrl("getObject", params);

    let saveOption = devMode ? "--save-dev" : "--save";
    exec.exec(cli, "npm", "install", url, saveOption).then(() => {
      process.exit(0);
    }).catch((error) => {
      cli.displayError(error);
      process.exit(1);
    });
  });
}

// return list of tarballs that match "(packageName)-"
function listPackages(client, packageName) {
  let deferred = Promise.defer();

  let s3Params = {
    Bucket: process.env.S3PM_BUCKET,
    Prefix: packageName + "-"
  };
  let filenames = [];
  let matcher = new RegExp(packageName + "-([\\d\\.]+)\\.tgz");

  let lister = client.listObjects({ s3Params: s3Params });
  lister.on("error", (error) => {
    deferred.reject(error);

    // console.log("Unable to list objects in " + BUCKET + ": ", error.stack);
    // process.exit(1);
  });
  // progress? do we care?
  lister.on("data", (result) => {
    result.Contents.forEach((entry) => {
      if (entry.Key.match(matcher)) {
        filenames.push(entry.Key);
      }
    });
  })
  lister.on("end", () => {
    deferred.resolve(filenames);
  });
  return deferred.promise;
};

// given an array of package tarball filenames, sort them in version order.
// (ignores snapshots and other non-numeric version strings)
function sortByVersion(packageNames) {
  let sortOrder = (filename) => {
    let m = filename.match(/\-([\d\.]+)/);
    if (!m) return 0;
    let total = 0;
    let segments = m[1].split(".").slice(0, 3);
    if (segments[segments.length - 1] == "") segments.pop();
    while (segments.length < 3) segments.push("0");
    for (let i in segments) {
      total = total * 1000 + parseInt(segments[i]);
    }
    return total;
  }
  return packageNames.sort((a, b) => sortOrder(a) - sortOrder(b));
}

exports.linkLatest = linkLatest;
