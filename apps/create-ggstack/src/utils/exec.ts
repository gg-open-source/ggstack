import { execa } from "execa";
import type { ProjectCommand } from "../types.js";

export async function runCommand(command: ProjectCommand): Promise<void> {
  await execa(command.command, command.args, {
    cwd: command.cwd,
    stdio: "inherit",
  });
}

export async function runCommands(commands: ProjectCommand[]): Promise<void> {
  for (const command of commands) {
    await runCommand(command);
  }
}
