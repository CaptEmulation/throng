"use strict";

const throng = require("../../lib/throng").default;

throng({
  lifetime: 0,
  start: () => {
    console.log("worker");
    process.exit();
  },
});
