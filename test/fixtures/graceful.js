const throng = require("../../lib/throng").default;

throng({
  count: 3,
  worker: (id, disconnect) => {
    let exited = false;

    console.log("worker");
    process.on("SIGTERM", exit);
    process.on("SIGINT", exit);

    async function exit() {
      if (exited) return;
      exited = true;

      await new Promise((r) => setTimeout(r, 100)); // simulate async cleanup
      console.log("exiting");
      disconnect();
    }
  },
});
