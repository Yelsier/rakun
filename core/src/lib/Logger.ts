import { AsyncLocalStorage } from "async_hooks";
import fs from "fs";
import { inspect } from "util";

export const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const COLORS = {
  trace: "\x1b[90m", // gris
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // verde
  warn: "\x1b[33m", // amarillo
  error: "\x1b[31m", // rojo
  fatal: "\x1b[35m", // magenta
  label: "\x1b[34m",
  value: "\x1b[36m",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bright: "\x1b[1m",
};

export type LEVEL_KEY = keyof typeof LEVELS;

type LogEntry = {
  t: number;
  lvl: LEVEL_KEY;
  pid: number;
  [key: string]: unknown;
};

type TraceStep = {
  t: number;
  msg: string;
  data?: unknown;
};

export function createLogger({
  level = "info",
  file = null,
  maxQueue = 50_000,
  batchSize = 200,
  flushIntervalMs = 0,
  prettify = false,
  maxTraceEntries = 200,
  verbose = false,
}: {
  level?: LEVEL_KEY;
  file?: string | null;
  maxQueue?: number;
  batchSize?: number;
  flushIntervalMs?: number;
  prettify?: boolean;
  maxTraceEntries?: number;
  verbose?: boolean;
} = {}) {
  const minLevel = LEVELS[level] ?? LEVELS.info;
  const traceStorage = new AsyncLocalStorage<{ steps: TraceStep[] }>();
  let globalTraceSteps: TraceStep[] = [];

  const stream = file
    ? fs.createWriteStream(file, { flags: "a", highWaterMark: 1 << 20 }) // 1MB buffer
    : process.stdout;

  let queue: string[] = [];
  let scheduled = false;
  let dropped = 0;
  let timer: NodeJS.Timeout | null = null;

  function shouldLog(lvl: LEVEL_KEY) {
    return (LEVELS[lvl] ?? 999) >= minLevel;
  }

  function safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function trimTraceSteps(steps: TraceStep[]) {
    if (steps.length <= maxTraceEntries) return;
    steps.splice(0, steps.length - maxTraceEntries);
  }

  function getCurrentTraceSteps(): TraceStep[] {
    return traceStorage.getStore()?.steps ?? globalTraceSteps;
  }

  function formatTraceStack(steps: TraceStep[]): string {
    return steps
      .map((step, index) => {
        const timestamp = new Date(step.t).toISOString();
        const data =
          step.data !== undefined ? ` ${safeStringify(step.data)}` : "";
        return `${index + 1}. ${timestamp} ${step.msg}${data}`;
      })
      .join("\n");
  }

  function isTraceStep(value: unknown): value is TraceStep {
    if (!value || typeof value !== "object") return false;
    const step = value as Record<string, unknown>;
    return typeof step.t === "number" && typeof step.msg === "string";
  }

  function isTraceSteps(value: unknown): value is TraceStep[] {
    return Array.isArray(value) && value.every(isTraceStep);
  }

  function formatTraceStepTimestamp(t: number): string {
    return new Date(t)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
  }

  function formatTraceStepsPretty(steps: TraceStep[], color: string): string[] {
    if (steps.length === 0) {
      return [
        `${color}│${COLORS.reset}     ${COLORS.dim}(sin pasos)${COLORS.reset}`,
      ];
    }

    return steps.flatMap((step, index) => {
      const last = index === steps.length - 1;
      const branch = last ? "└─" : "├─";
      const child = last ? "  " : "│ ";
      const previous = steps[index - 1];
      const delta = previous ? `+${step.t - previous.t}ms` : "+0ms";
      const header =
        `${COLORS.dim}${branch}${COLORS.reset} ` +
        `${COLORS.bright}#${index + 1}${COLORS.reset} ` +
        `${COLORS.value}${delta}${COLORS.reset} ` +
        `${COLORS.bright}${step.msg}${COLORS.reset} ` +
        `${COLORS.dim}${formatTraceStepTimestamp(step.t)}${COLORS.reset}`;
      const lines = [`${color}│${COLORS.reset}     ${header}`];

      if (step.data !== undefined) {
        lines.push(
          `${color}│${COLORS.reset}     ${COLORS.dim}${child}${COLORS.reset}${COLORS.label}data${COLORS.reset}:`,
        );

        const rendered = inspect(step.data, {
          depth: 8,
          colors: true,
          compact: false,
          breakLength: 100,
          sorted: true,
        });

        for (const line of rendered.split("\n")) {
          lines.push(
            `${color}│${COLORS.reset}     ${COLORS.dim}${child}  ${COLORS.reset}${line}`,
          );
        }
      }

      return lines;
    });
  }

  function formatPretty(entry: LogEntry): string {
    const color = COLORS[entry.lvl as LEVEL_KEY] || COLORS.reset;
    const timestamp = new Date(entry.t)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    const lines: string[] = [];
    lines.push(`${color}┌${COLORS.reset}`);
    lines.push(
      `${color}│${COLORS.reset} ${COLORS.bright}${entry.lvl.toUpperCase()}${COLORS.reset} ${color}${timestamp}${COLORS.reset} ${COLORS.dim}pid:${entry.pid}${COLORS.reset}`,
    );

    for (const [key, value] of Object.entries(entry)) {
      if (key === "t" || key === "lvl" || key === "pid") continue;

      if (key === "steps" && isTraceSteps(value)) {
        lines.push(`${color}│${COLORS.reset}   ${color}${key}${COLORS.reset}:`);
        lines.push(...formatTraceStepsPretty(value, color));
        continue;
      }

      if (key === "stack" && typeof value === "string") {
        lines.push(`${color}│${COLORS.reset}   ${color}${key}${COLORS.reset}:`);
        const stackLines = value.split("\n");
        for (const stackLine of stackLines) {
          if (stackLine.trim()) {
            lines.push(
              `${color}│${COLORS.reset}     ${COLORS.dim}${stackLine.trim()}${COLORS.reset}`,
            );
          }
        }
        continue;
      }

      if (value && typeof value === "object") {
        lines.push(`${color}│${COLORS.reset}   ${color}${key}${COLORS.reset}:`);
        const rendered = inspect(value, {
          depth: 8,
          colors: false,
          compact: false,
          breakLength: 100,
          sorted: true,
        });
        for (const line of rendered.split("\n")) {
          lines.push(
            `${color}│${COLORS.reset}     ${COLORS.dim}${line}${COLORS.reset}`,
          );
        }
        continue;
      }

      lines.push(
        `${color}│${COLORS.reset}   ${color}${key}${COLORS.reset}: ${String(value)}`,
      );
    }

    lines.push(`${color}└${COLORS.reset}`);
    return lines.join("\n");
  }

  function enqueue(line: string) {
    if (queue.length >= maxQueue) {
      dropped++;
      return;
    }
    queue.push(line);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (!scheduled) {
      scheduled = true;
      setImmediate(flush);
    }
  }

  function flush() {
    scheduled = false;
    if (queue.length === 0) return;

    const n = Math.min(batchSize, queue.length);
    const chunk = queue.slice(0, n).join("\n") + "\n";
    queue = queue.slice(n);

    const ok = stream.write(chunk);
    if (!ok) {
      stream.once("drain", () => scheduleFlush());
      return;
    }

    if (queue.length > 0) scheduleFlush();
  }

  function log(lvl: LEVEL_KEY, msg: string, extra?: string | object) {
    if (!shouldLog(lvl)) return;

    const entry: LogEntry = {
      t: Date.now(),
      lvl,
      pid: process.pid,
      msg,
      ...(typeof extra === "object" && extra ? extra : null),
      ...(typeof extra === "string" ? { extra: extra } : null),
    };

    if (lvl === "error" || lvl === "fatal") {
      if (extra instanceof Error) {
        entry.cause = extra.message;
      } else if (typeof extra === "string") {
        entry.cause = extra;
      }
    }

    if (lvl === "trace" || lvl === "error" || lvl === "fatal") {
      const steps = getCurrentTraceSteps();
      if (steps.length > 0) {
        entry.stack = formatTraceStack(steps);
      }
    }

    if (dropped) {
      entry.dropped = dropped;
      dropped = 0;
    }

    enqueue(prettify ? formatPretty(entry) : JSON.stringify(entry));
  }

  const api = {
    withTraceScope: <T>(fn: () => T): T => traceStorage.run({ steps: [] }, fn),
    addTrace: (msg: string, data?: unknown) => {
      const steps = getCurrentTraceSteps();
      steps.push({ t: Date.now(), msg, data });
      trimTraceSteps(steps);
    },
    clearTrace: () => {
      const store = traceStorage.getStore();
      if (store) {
        store.steps = [];
        return;
      }
      globalTraceSteps = [];
    },
    getTrace: () => [...getCurrentTraceSteps()],
    isVerbose: () => verbose,
    trace: (a: string, b?: string | object) => log("trace", a, b),
    debug: (a: string, b?: string | object) => log("debug", a, b),
    info: (a: string, b?: string | object) => log("info", a, b),
    warn: (a: string, b?: string | object) => log("warn", a, b),
    error: (a: string, b?: string | object) => log("error", a, b),
    fatal: (a: string, b?: string | object) => log("fatal", a, b),
    flush: () =>
      new Promise<void>((res) => {
        if (queue.length === 0) return res();
        // fuerza flush completo
        const drainAll = () => {
          if (queue.length === 0) return res();
          scheduled = true;
          flush();
          if (queue.length === 0) return res();
          // si hay backpressure, resuelve en drain
          stream.once("drain", drainAll);
        };
        drainAll();
      }),
    close: async () => {
      await api.flush();
      if (stream !== process.stdout) stream.end();
    },
  };

  if (flushIntervalMs > 0) {
    timer = setInterval(() => scheduleFlush(), flushIntervalMs);
    timer.unref?.();
  }

  // Buen cierre
  process.on("beforeExit", () => api.flush());
  process.on("SIGTERM", async () => {
    await api.close();
    process.exit(0);
  });
  process.on("SIGINT", async () => {
    await api.close();
    process.exit(0);
  });

  _logger = api;

  return api;
}

let _logger: ReturnType<typeof createLogger>;

export { _logger as Logger };
