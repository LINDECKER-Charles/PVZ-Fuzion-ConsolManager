/** The `--out` option shared by every command that writes under a root folder. */

import type { CommandInput, OptionSpec } from "../command";

const OUT_OPTION_NAME = "--out";

/** `--out DIR`, documented with the folder it replaces. */
export function outOption(defaultRoot: string): OptionSpec {
  return {
    name: OUT_OPTION_NAME,
    value: "DIR",
    description: `Root folder of the generated files (default: ${defaultRoot}/).`,
  };
}

/** The `--out` value, or `fallback` when the option is absent. */
export function outRoot(input: CommandInput, fallback: string): string {
  return input.values.get(OUT_OPTION_NAME) ?? fallback;
}
