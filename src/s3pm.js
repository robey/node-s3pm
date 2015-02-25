#!/usr/bin/env node
"use strict";

const clicolor = require("clicolor");
const fs = require("fs");
const link = require("./link");
const path = require("path");
const Promise = require("bluebird");
const publish = require("./publish");
const s3 = require("s3");
const util = require("util");

require("source-map-support").install();

let USAGE = `
usage: s3pm <command>
    use Amazon S3 as a jank package store

command must be one of:

    publish [--current]
        run "npm version patch && npm pack", and publish the result to S3
        (with --current: don't bump the version number)
    link [--dev] <name>
        "npm install --save" the S3 URL for a package
        (with --dev: use "install --save-dev" instead)
    find <name>
        display the S3 URL for the latest release of a package
`;

const cli = clicolor.cli();

function main() {
  let argv = process.argv.slice(2);
  if (argv.length < 1 || argv[0] == "--help") {
    console.log(USAGE);
    process.exit(1);
  }
  let credentials = getAwsCredentials();
  if (!process.env.S3PM_BUCKET) {
    cli.displayError("Need S3PM_BUCKET environment variable.");
    process.exit(1);
  }

  let client = s3.createClient({ s3Options: credentials });

  let command = argv[0];
  if (command == "publish") {
    let bumpVersion = (argv[1] != "--current");
    publish.publish(cli, client, bumpVersion);
  } else if (command == "link") {
    let devMode = false;
    let name = argv[1];
    if (name == "--dev") {
      devMode = true;
      name = argv[2];
    }
    if (!name) {
      cli.displayError("Package name is required.");
      process.exit(1);
    }

    link.linkLatest(cli, client, name, devMode);
  } else if (command == "find") {
    let name = argv[1];
    if (!name) {
      cli.displayError("Package name is required.");
      process.exit(1);
    }

    link.findLatest(cli, client, name).then(([ tarballName, url ]) => console.log(url));
  } else {
    cli.displayError("Unknown command: " + argv.join(" "));
    console.log(USAGE);
    process.exit(1);
  }
};

function getAwsCredentials() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (fs.existsSync(path.join(home, ".aws_secret_key")) && fs.existsSync(path.join(home, ".aws_access_key"))) {
    const accessKey = fs.readFileSync(path.join(home, ".aws_access_key")).toString().trim();
    const secretKey = fs.readFileSync(path.join(home, ".aws_secret_key")).toString().trim();
    return {
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    };
  }

  if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY
    };
  }

  cli.displayError("AWS not configured (run 'aws configure')");
  process.exit(1);
}


exports.main = main;
