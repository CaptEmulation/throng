import cluster, { Worker } from "cluster";
import os from "os";

export type Signals =
  | "SIGUSR1"
  | "SIGUSR2"
  | "SIGTERM"
  | "SIGINT"
  | "SIGPIPE"
  | "SIGHUP"
  | "SIGBREAK"
  | "SIGWINCH"
  | "SIGKILL"
  | "SIGSTOP"
  | "SIGBUS"
  | "SIGFPE"
  | "SIGSEGV"
  | "SIGILL";
export interface IOptions {
  count?: number;
  workers?: number;
  lifetime?: number;
  grace?: number;
  master?: (id?: number, disconnect?: () => void) => void | Promise<void>;
  worker: (id?: number, disconnect?: () => void) => void | Promise<void>;
  signals?: Signals[];
  debugExitTimeout: number | undefined;
}

const nCPU = os.cpus().length;

export default async function throng(options: IOptions) {
  const config: Omit<Required<IOptions>, "workers"> = {
    count: options.count ?? options.workers ?? nCPU,
    lifetime: Infinity,
    grace: 5000,
    signals: ["SIGINT", "SIGTERM"],
    master: () => {},
    ...options,
  };

  const times = new Map<number, { disconnect?: number; exit?: number }>();

  const { worker, master } = config;

  if (typeof worker !== "function") {
    throw new Error("You must provide a worker function");
  }

  if (cluster.isWorker) {
    return await worker(cluster.worker?.id, disconnect);
  }

  const reviveUntil = Date.now() + config.lifetime;
  let running = true;

  listen();
  await master();
  fork(config.count);

  function listen() {
    cluster.on("disconnect", onDisconnect);
    cluster.on("exit", onExit);
    config.signals.forEach((signal) => process.on(signal, shutdown(signal)));
  }

  function shutdown(signal: Signals) {
    return () => {
      running = false;
      setTimeout(() => forceKill(signal), config.grace).unref();

      Object.values(cluster.workers ?? {}).forEach((w) =>
        w?.process.kill(signal),
      );
    };
  }

  function onDisconnect(worker: Worker) {
    // Store the disconnect time for this worker
    if (config.debugExitTimeout) {
      if (!times.has(worker.id)) {
        times.set(worker.id, {
          disconnect: Date.now(),
        });
      } else {
        // Calculate the time difference between the disconnect and exit events, if the exit time is available
        const workerTime = times.get(worker.id);
        const now = Date.now();
        if (
          workerTime?.exit &&
          now - workerTime.exit > config.debugExitTimeout
        ) {
          const durationInSeconds = (workerTime.exit - now) / 1000;
          console.log(
            `Worker ${worker.id} was alive for ${durationInSeconds}s past disconnect`,
          );
        }
        times.delete(worker.id);
      }
    }

    if (!running) return;
    if (Date.now() >= reviveUntil) return;
    cluster.fork();
  }

  function onExit(worker: Worker) {
    // Store the exit time for this worker
    if (config.debugExitTimeout) {
      if (!times.has(worker.id)) {
        times.set(worker.id, {
          exit: Date.now(),
        });
      } else {
        // Calculate the time difference between the disconnect and exit events, if the disconnect time is available
        const workerTime = times.get(worker.id);
        const now = Date.now();
        if (
          workerTime?.disconnect &&
          now - workerTime.disconnect > config.debugExitTimeout
        ) {
          const durationInSeconds = (workerTime.disconnect - now) / 1000;
          console.log(
            `Worker ${worker.id} was alive for ${durationInSeconds}s past exit`,
          );
        }
        times.delete(worker.id);
      }
    }
  }

  function forceKill(signal: Signals) {
    Object.values(cluster.workers ?? {}).forEach((w) =>
      w?.process.kill(signal),
    );
    process.exit();
  }
}

function fork(n: number) {
  for (let i = 0; i < n; i++) {
    cluster.fork();
  }
}

// Queue the disconnect for a short time in the future.
// Node has some edge-cases with child processes that this helps with -
// Unlike main processes, child processes do not exit immediately once no async ops are pending.
// However, calling process.exit() exits immediately, even if async I/O (like console.log/stdout/piping to a file) is pending.
// Instead of using process.exit(), you can disconnect the worker, after which it will die just like a normal process.
// In practice, disconnecting directly after I/O can cause EPIPE errors (https://github.com/nodejs/node/issues/29341)
// I dislike adding arbitrary delays to the system, but 50ms here has eliminated flappy test failures.
function disconnect() {
  setTimeout(() => cluster.worker?.disconnect(), 50);
}
