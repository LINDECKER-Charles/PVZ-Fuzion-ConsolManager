/**
 * Sink for diagnostics raised deep in the parsing layer.
 *
 * A parser that hits an unreadable file has something to say but no channel to
 * say it on: it cannot write to stdout (the TUI owns the terminal and a raw
 * write breaks clack's gutter) and it cannot fail (a malformed locale file must
 * not take the whole scan down). It reports here instead, and the CLI redirects
 * the sink into its own UI at startup — the default keeps diagnostics on stderr
 * so headless runs stay machine-readable on stdout.
 */

export type NoticeSink = (message: string) => void;

const stderrSink: NoticeSink = (message) => process.stderr.write(`${message}\n`);

let currentSink: NoticeSink = stderrSink;

/** Route subsequent notices somewhere else — the TUI, or a test spy. */
export function setNoticeSink(sink: NoticeSink): void {
  currentSink = sink;
}

/** Restore the default stderr sink. */
export function resetNoticeSink(): void {
  currentSink = stderrSink;
}

export function reportNotice(message: string): void {
  currentSink(message);
}
