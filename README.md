# s3pm

Use S3 as a private module store for node, with limited functionality.

If you have private node modules, you can install them from git urls (for example, private github repos), but npm won't run the "prepublish" script, which precludes transpilers like ES6 or coffee-script.

This module provides an alternate way to publish and "install" packages from an AWS S3 bucket.

## Usage

There are two commands:
- `publish` to run `npm version patch && npm pack`, and upload the result to S3
- `link` to compute a signed URL for a previously published package, and run `npm install --save` to save it into your `package.json`

```sh
# publish a module to S3
$ cd mymodule
$ s3pm publish
```

```sh
# use the S3-published version of a module
$ cd myservice
$ s3pm link mymodule
```

## Caveats

This is not a true "private npm", like you can purchase from companies like NPM or NodeJitsu. It doesn't have, or follow, verison ranges, or "latest". If you want that, you need to use one of the real private module services.

Instead, when you publish "mymodule" version 1.2.3, the file `mymodule-1.2.3.tgz` is stuffed into the S3 bucket you designated. When you link "mymodule", it scans the bucket for matching filenames, chooses the most recent version, computes the signed URL, and uses that to refer directly to that version.

If 1.2.3 is the latest version when you link, and later a version 1.2.4 is posted, your project will continue to use the "old" version (1.2.3) until you relink. In this way, it's more like `npm link` than `install`.

Why does it work this way? Because you can't make a signed URL that refers to changing content. The signed URL is signing the hash of the file, so changing the content of the file invalidates the URL. (This is intentional behavior by AWS.) When you `npm install` a signed URL, you're installing a snapshot that can't change without changing the URL.

The signed URLs expire after one year. You can generate a new URL by running `s3pm link` again.

If you publish frequently, you may generate an olypmic swimming pool of old packages. You can delete old ones via the S3 web interface.
