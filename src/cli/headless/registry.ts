/** Every headless command, in help order. Adding a command = one entry here. */

import type { HeadlessCommand } from "./command";
import { DIFF_COMMAND } from "./commands/diff";
import { DUPLICATES_COMMAND } from "./commands/duplicates";
import { MIGRATION_COMMANDS } from "./commands/migrate";
import { PR_RESUME_COMMAND } from "./commands/pr-resume";
import { TRELLO_COMMAND } from "./commands/trello";

export const HEADLESS_COMMANDS: readonly HeadlessCommand[] = [
  DIFF_COMMAND,
  DUPLICATES_COMMAND,
  TRELLO_COMMAND,
  ...MIGRATION_COMMANDS,
  PR_RESUME_COMMAND,
];
