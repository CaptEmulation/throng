const throng = require("../../lib/throng").default;

throng({
  count: 3,
  signals: ["SIGUSR2"],
  worker: (id, disconnect) => {
    let exited = false;

    console.log("worker");
    process.on("SIGUSR2", exit);

    function exit() {
      if (exited) return;
      exited = true;
      console.log(`exiting`);
      disconnect();
    }
  },
});
