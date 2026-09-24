export interface OpenCodeEvent {
  type: string;
  timestamp?: number;
  sessionID?: string;
  part?: {
    type?: string;
    tool?: string;
    state?: { status?: string; input?: Record<string, unknown>; output?: string };
    text?: string;
    reason?: string;
  };
  error?: { data?: { message?: string } };
}

export interface ParsedStream {
  events: OpenCodeEvent[];
  invalidLines: number;
  toolCalls: Array<{ tool: string; input: Record<string, unknown> }>;
  text: string[];
  stepFinishes: string[];
  errors: string[];
  incompleteSteps: number;
}

export function parseOpenCodeStream(output: string): ParsedStream {
  const events: OpenCodeEvent[] = [];
  let invalidLines = 0;

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as unknown;
      if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>).type !== "string") {
        invalidLines += 1;
        continue;
      }
      events.push(value as OpenCodeEvent);
    } catch {
      invalidLines += 1;
    }
  }

  let openSteps = 0;
  const toolCalls: ParsedStream["toolCalls"] = [];
  const text: string[] = [];
  const stepFinishes: string[] = [];
  const errors: string[] = [];

  for (const event of events) {
    if (event.type === "step_start") openSteps += 1;
    if (event.type === "tool_use" && event.part?.tool) {
      toolCalls.push({
        tool: event.part.tool,
        input: event.part.state?.input ?? {},
      });
    }
    if (event.type === "text" && event.part?.text) text.push(event.part.text);
    if (event.type === "step_finish") {
      openSteps = Math.max(0, openSteps - 1);
      if (event.part?.reason) stepFinishes.push(event.part.reason);
    }
    if (event.type === "error") {
      const message = event.error?.data?.message;
      if (message) errors.push(message);
    }
  }

  return {
    events,
    invalidLines,
    toolCalls,
    text,
    stepFinishes,
    errors,
    incompleteSteps: openSteps,
  };
}
