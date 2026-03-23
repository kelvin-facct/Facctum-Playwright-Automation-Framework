#!/usr/bin/env npx ts-node
/**
 * Lists all available environments and their configuration.
 * Usage: npx ts-node src/scripts/list-envs.ts [env-name]
 */

import * as fs from "fs";
import * as path from "path";

const configPath = path.resolve(__dirname, "../config/environments.json");

try {
  const content = fs.readFileSync(configPath, "utf-8");
  const envJson = JSON.parse(content);
  const envArg = process.argv[2];

  if (envArg) {
    // Show specific environment
    if (!envJson[envArg]) {
      console.error(`Environment "${envArg}" not found.`);
      process.exit(1);
    }
    console.log(`\n${envArg.toUpperCase()} Configuration:`);
    console.log("─".repeat(40));
    const merged = { ...envJson._defaults, ...envJson[envArg] };
    Object.entries(merged).forEach(([key, value]) => {
      const isOverride = envJson[envArg][key] !== undefined;
      console.log(`  ${key}: ${value}${isOverride ? " (override)" : ""}`);
    });
  } else {
    // List all environments
    const envs = Object.keys(envJson).filter(k => k !== "_defaults");
    console.log("\nAvailable Environments:");
    console.log("─".repeat(40));
    envs.forEach(env => {
      const config = envJson[env];
      console.log(`  ${env.padEnd(12)} → ${config.BASE_URL || "(no BASE_URL)"}`);
    });
    console.log(`\nUsage: npm run env:list [env-name]`);
    console.log(`       ENV=stage npm test`);
  }
} catch (error) {
  console.error("Failed to load environments.json:", error);
  process.exit(1);
}
