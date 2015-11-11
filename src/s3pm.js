"use strict";

import AWS from "aws-sdk";
import clicolor from "clicolor";
import fs from "fs";
import minimist from "minimist";
import path from "path";
import publish from "./publish";
import s3 from "s3";
import { findLatest, linkLatest } from "./link";

import "source-map-support/register";

const DEFAULTS = {
  region: "us-west-2",
  profile: "default"
};

const PACKAGE = require("../package.json");

const USAGE = `
usage: s3pm [options] <command>
    use Amazon S3 as a jank package store

options:
    --help
    -r, --region <region>
        select AWS region (default: ${DEFAULTS.region})
    -p, --profile <profile>
        select AWS credentials profile name (default: ${DEFAULTS.profile}, or
        guessed from the service environment)
    --no-color
        turn off cool console colors

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

const cli = clicolor();

export function main() {
  const argv = minimist(process.argv.slice(2), {
    alias: { p: "profile", r: "region" },
    boolean: [ "color", "current", "dev", "help", "version" ],
    default: { color: "default", region: DEFAULTS.region, profile: DEFAULTS.profile }
  });

  if (argv.version) {
    process.stdout.write(`s3pm ${PACKAGE.version}\n`);
    process.exit(0);
  }
  if (argv.help || argv._.length == 0) {
    process.stdout.write(USAGE + "\n");
    process.exit(0);
  }
  if (argv.color != "default") cli.useColor(argv.color);
  if (!process.env.S3PM_BUCKET) {
    cli.displayError("Need S3PM_BUCKET environment variable.");
    process.exit(1);
  }

  setAwsCredentials(argv.profile);
  const client = s3.createClient();

  const command = argv._[0];
  if (command == "publish") {
    publish(cli, client, { bumpVersion: !argv.current });
  } else if (command == "link") {
    const devMode = argv.dev;

    const name = argv._[1];
    if (!name) {
      cli.displayError("Package name is required.");
      process.exit(1);
    }

    linkLatest(cli, client, name, devMode);
  } else if (command == "find") {
    const name = argv._[1];
    if (!name) {
      cli.displayError("Package name is required.");
      process.exit(1);
    }

    findLatest(cli, client, name).then(({ url }) => console.log(url));
  } else {
    cli.displayError("Unknown command: " + argv._.join(" "));
    console.log(USAGE);
    process.exit(1);
  }
}

function setAwsCredentials(profile) {
  const home = process.env.HOME || process.env.USERPROFILE;
  const awsFolder = process.env.AWS_DIR || path.join(home, ".aws");

  const awsFiles = [ "credentials", "config" ];
  for (let i = 0; i < awsFiles.length; i++) {
    const filename = path.join(awsFolder, awsFiles[i]);
    if (fs.existsSync(filename)) {
      try {
        const config = new AWS.SharedIniFileCredentials({ filename, profile });
        if (config.accessKeyId && config.secretAccessKey) {
          AWS.config.credentials = config;
          return;
        }
      } catch (error) {
        // move on.
      }
    }
  }

  cli.displayError("AWS not configured (run 'aws configure')");
  process.exit(1);
}
