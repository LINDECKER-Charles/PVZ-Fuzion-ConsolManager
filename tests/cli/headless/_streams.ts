/** Capture what the program writes on stdout / stderr during a test. */

import { type MockInstance, vi } from "vitest";

export interface CapturedStreams {
  stdout(): string;
  stderr(): string;
  /** The single JSON document a `--json` run printed on stdout. */
  json(): Record<string, any>;
  restore(): void;
}

function joined(spy: MockInstance): string {
  return spy.mock.calls.map((call) => String(call[0])).join("");
}

export function captureStreams(): CapturedStreams {
  const outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  const errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  return {
    stdout: () => joined(outSpy),
    stderr: () => joined(errSpy),
    json: () => JSON.parse(joined(outSpy)),
    restore: () => {
      outSpy.mockRestore();
      errSpy.mockRestore();
    },
  };
}
