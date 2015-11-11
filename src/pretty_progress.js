"use strict";

const antsy = require("antsy");

const COLORS = {
  BACKGROUND: "b3b",
  PARTIAL: "55f",
  COMPLETE: "green",
  TEXT: "black"
};

// 128 spaces
let SPACES = " ";
for (let i = 0; i < 7; i++) SPACES = SPACES + SPACES;

export function draw(text, partial, complete) {
  const width = process.stdout.isTTY ? Math.min(78, process.stdout.columns) : 78;

  const canvas = new antsy.Canvas(width, 1);
  canvas.fillBackground(COLORS.BACKGROUND);
  canvas.backgroundColor(COLORS.PARTIAL).at(0, 0).write(SPACES.slice(0, Math.round(partial * width)));
  canvas.backgroundColor(COLORS.COMPLETE).at(0, 0).write(SPACES.slice(0, Math.round(complete * width)));
  canvas.color(COLORS.TEXT).backgroundColor(antsy.TRANSPARENT).at(0, 0).write(text.slice(0, width));

  process.stderr.write("\r" + canvas.toStrings()[0]);
}

export function clear() {
  const width = process.stdout.isTTY ? Math.min(78, process.stdout.columns) : 78;
  process.stderr.write("\r" + SPACES.slice(0, width) + "\r");
}

// function main() {
//   let x = 0;
//   let y = 0;
//
//   function next() {
//     if (y >= 1.01) {
//       clear();
//       console.log("another-file.tgz");
//       return;
//     }
//     draw(`another-file.tgz (${Math.round(x * 100)}%)`, x, y);
//     if (x < 1.0) {
//       x = Math.min(1.0, x + 0.02);
//     } else {
//       y += 0.02;
//     }
//     setTimeout(() => next(), 100);
//   }
//   next();
// }
