import { appendFile, mkdir } from "node:fs/promises";
import { isAbsolute, resolve, dirname } from "node:path";

export const SMOKE_SCHEMA_VERSION = 1 as const;

export interface SmokeEvent {
  schemaVersion: typeof SMOKE_SCHEMA_VERSION;
  at: string;
  type: string;
  sessionID?: string;
  tool?: string;
  hook?: string;
  check?: string;
  outcome?: "observed" | "blocked" | "warning" | "passed" | "failed";
  detail?: string;
}

export interface SmokeRecorder {
  readonly enabled: boolean;
  record(event: Omit<SmokeEvent, "schemaVersion" | "at">): Promise<void>;
}

class DisabledSmokeRecorder implements SmokeRecorder {
  readonly enabled = false;
  async record(_event: Omit<SmokeEvent, "schemaVersion" | "at">): Promise<void> {}
}

class FileSmokeRecorder implements SmokeRecorder {
  readonly enabled = true;
  private queue = Promise.resolve();

  constructor(private readonly path: string) {}

  async record(event: Omit<SmokeEvent, "schemaVersion" | "at">): Promise<void> {
    const entry: SmokeEvent = {
      schemaVersion: SMOKE_SCHEMA_VERSION,
      at: new Date().toISOString(),
      ...event,
    };
    const line = JSON.stringify(entry) + "\n";
    this.queue = this.queue.then(async () => {
      try {
        await mkdir(dirname(this.path), { recursive: true });
        await appendFile(this.path, line, "utf8");
      } catch (error) {
        console.warn(
          "[open-discipline] smoke recorder unavailable: " +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    });
    await this.queue;
  }
}

export function createSmokeRecorder(directory: string): SmokeRecorder {
  const target = process.env.OPENDISCIPLINE_SMOKE_REPORT;
  if (!target) return new DisabledSmokeRecorder();
  const path = isAbsolute(target) ? target : resolve(directory, target);
  return new FileSmokeRecorder(path);
}
