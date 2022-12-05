const throng = require("../../lib/throng").default;

throng({ master, worker, count: 1, lifetime: 0 });

async function master() {
  await new Promise((r) => setTimeout(r, 500));
  console.log("master");
}

async function worker(id, disconnect) {
  console.log("worker");
  disconnect();
}
