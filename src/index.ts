#!/usr/bin/env node

import { Command } from "commander";
import { init } from "./commands/init.js";
import { wrap } from "./commands/wrap.js";

const program = new Command();

program
  .name("portald")
  .description("Add Portald agent authorization to your project")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Portald in your project")
  .option("-y, --yes", "Skip prompts and use defaults")
  .option("--framework <framework>", "Project framework (nextjs, express, generic)")
  .action(init);

program
  .command("wrap <function>")
  .description("Generate a Portald-wrapped version of a function")
  .option("--risk <level>", "Risk level (low, med, high)", "med")
  .option("--action-type <type>", "Action type identifier")
  .action(wrap);

program.parse();
