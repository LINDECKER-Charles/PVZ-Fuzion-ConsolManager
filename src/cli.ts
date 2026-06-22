/** Executable entry point. The shebang is injected by the tsup bundler. */

import { main } from "./cli/app";

main()
  .then(({ exitCode }) => {
    process.exitCode = exitCode;
  })
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
