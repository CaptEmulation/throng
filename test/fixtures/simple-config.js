const throng = require("../../lib/throng").default;

throng({ worker, count: 4, lifetime: 0 });

function worker(id, disconnect) {
  console.log("worker");
  disconnect();
}
