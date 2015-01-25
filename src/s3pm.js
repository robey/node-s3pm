#!/usr/bin/env node
"use strict";

let clicolor = require("clicolor");
let link = require("./link");
let Promise = require("bluebird");
let publish = require("./publish");
let s3 = require("s3");
let util = require("util");

require("source-map-support").install();

let USAGE = `
usage: s3pm <command>
    use Amazon S3 as a jank package store

command must be one of:

    publish
        run "npm pack" and publish the result to S3
    link [--dev] <name>
        "npm install --save" the S3 URL for a package
`;

function main() {
  let argv = process.argv.slice(2);
  if (argv.length < 1 || argv[0] == "--help") {
    console.log(USAGE);
    process.exit(1);
  }
  let cli = clicolor.cli();
  if (! (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY)) {
    cli.displayError("Need both AWS_ACCESS_KEY and AWS_SECRET_KEY environment variables.");
    process.exit(1);
  }
  if (!process.env.S3PM_BUCKET) {
    cli.displayError("Need S3PM_BUCKET environment variable.");
    process.exit(1);
  }

  let client = s3.createClient({
    s3Options: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY
    }
  });

  let command = argv[0];
  if (command == "publish") {
    publish.publish(cli, client);
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
  } else {
    cli.displayError("Unknown command: " + argv.join(" "));
    console.log(USAGE);
    process.exit(1);
  }
};

exports.main = main;
