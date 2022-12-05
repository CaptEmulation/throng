"use strict";

const throng = require("../../lib/throng").default;

throng({
  count: 3,
  worker: () => {
    console.log("worker");
    process.exit();
  },
});
