#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_js_1 = require("./commands/init.js");
const wrap_js_1 = require("./commands/wrap.js");
const program = new commander_1.Command();
program
    .name("portald")
    .description("Add Portald agent authorization to your project")
    .version("0.1.0");
program
    .command("init")
    .description("Initialize Portald in your project")
    .option("-y, --yes", "Skip prompts and use defaults")
    .option("--framework <framework>", "Project framework (nextjs, express, generic)")
    .action(init_js_1.init);
program
    .command("wrap <function>")
    .description("Generate a Portald-wrapped version of a function")
    .option("--risk <level>", "Risk level (low, med, high)", "med")
    .option("--action-type <type>", "Action type identifier")
    .action(wrap_js_1.wrap);
program.parse();
