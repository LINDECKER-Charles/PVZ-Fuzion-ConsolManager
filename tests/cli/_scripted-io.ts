/** A ConsoleIO whose clack prompts read scripted keys and write to a buffer. */

import { PassThrough } from "node:stream";

import type { ConsoleIO } from "../../src/cli/output";

/* eslint-disable-next-line no-control-regex -- matching CSI sequences is the point */
const ANSI = /\u001B\[[0-9;?]*[A-Za-z]/g;

/** Key sequences clack understands. */
export const KEY = {
  down: "\u001B[B",
  enter: "\r",
  escape: "\u001B",
  ctrlC: "\u0003",
} as const;

/** Delay between two scripted key presses, in milliseconds. */
const KEY_INTERVAL_MS = 5;

export const stripAnsi = (text: string): string => text.replace(ANSI, "");

export type ScriptedIO = ConsoleIO & {
  keys(...sequence: string[]): void;
  readonly text: string;
};

export function scriptedIO(): ScriptedIO {
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks: string[] = [];
  output.on("data", (chunk) => chunks.push(String(chunk)));

  return {
    streams: { input, output },
    question: () => Promise.resolve(""),
    write: () => {},
    // Keys are queued on the next ticks: clack subscribes to `input` only once
    // the prompt is running, so writing synchronously would lose them.
    keys(...sequence: string[]) {
      sequence.forEach((key, index) => {
        setTimeout(() => input.write(key), KEY_INTERVAL_MS * (index + 1));
      });
    },
    get text() {
      return chunks.join("");
    },
  };
}
