"use strict";

const throng = require("../../lib/throng").default;

throng({
  lifetime: 0,
  workers: 2,
  master: () => {
    console.log("master");
  },
  start: () => {
    console.log("worker");
    process.exit();
  },
});
