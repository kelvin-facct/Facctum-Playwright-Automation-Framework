/**
 * Quick script to show how config values are resolved
 * Run: npx ts-node src/scripts/show-config.ts
 */

import { EnvConfig } from "../config/env";

console.log("\n=== Current Configuration ===\n");
console.log("Environment:", process.env.ENV || "qa");
console.log("BASE_URL:", EnvConfig.BASE_URL);
console.log("\n--- Login Credentials ---");
console.log("ORG_ID:", EnvConfig.ORG_ID);
console.log("USERNAME (Email):", EnvConfig.USERNAME);
console.log("PASSWORD:", EnvConfig.PASSWORD ? "*".repeat(8) + "..." : "(not set)");
console.log("\n--- Browser Settings ---");
console.log("HEADLESS:", EnvConfig.HEADLESS);
console.log("TIMEOUT:", EnvConfig.TIMEOUT, "ms");
console.log("PARALLEL:", EnvConfig.PARALLEL, EnvConfig.PARALLEL === 0 ? "(sequential)" : "workers");
console.log("RETRY:", EnvConfig.RETRY, EnvConfig.RETRY === 0 ? "(no retries)" : "attempts");
console.log("\n--- Database Settings ---");
console.log("DB_HOST:", EnvConfig.DB_HOST);
console.log("DB_PORT:", EnvConfig.DB_PORT);
console.log("\n=== Source Priority ===");
console.log("1. process.env (terminal)");
console.log("2. .env.secrets (your local file)");
console.log("3. environments.json (shared config)");
console.log("4. _defaults (fallback)\n");
