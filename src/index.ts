#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { setupPlausibleCommand } from "./commands/plausible";

// Load environment variables
dotenv.config();

// Create the program
const program = new Command();
program.version("1.0.0");

// Set up commands
setupPlausibleCommand(program);

// Parse args
program.parse(process.argv);

// Display help if no args
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
