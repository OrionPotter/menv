#!/usr/bin/env node
import { handleCliError, runCli } from "./cli";

void runCli(process.argv.slice(2)).catch(handleCliError);
