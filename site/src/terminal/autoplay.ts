/** Frame sequencer — loops over a scenario's frames, honouring pause and playback speed. */

import type { Frame } from "./models.js";

const MIN_FRAME_HOLD_MS = 20;

export class Autoplay {
  private frames: readonly Frame[] = [];
  private index = 0;
  private speed = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private isRunning = false;

  constructor(private readonly onFrame: (frame: Frame) => void) {}

  get isPlaying(): boolean {
    return this.isRunning;
  }

  /** Replaces the script and shows its first frame; playback state is left untouched. */
  load(frames: readonly Frame[]): void {
    this.frames = frames;
    this.index = 0;
    this.render();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.isRunning) this.render();
  }

  play(): void {
    this.isRunning = true;
    this.render();
  }

  pause(): void {
    this.isRunning = false;
    clearTimeout(this.timer);
  }

  /** Shows the current frame and, while playing, books the move to the next one. */
  private render(): void {
    clearTimeout(this.timer);
    const frame = this.frames[this.index];
    if (!frame) return;
    this.onFrame(frame);
    if (!this.isRunning) return;
    const holdMs = Math.max(MIN_FRAME_HOLD_MS, frame.holdMs / this.speed);
    this.timer = setTimeout(() => this.advance(), holdMs);
  }

  private advance(): void {
    this.index = (this.index + 1) % this.frames.length;
    this.render();
  }
}
