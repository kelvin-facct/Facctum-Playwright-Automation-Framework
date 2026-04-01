/**
 * Quick script to show how config values are resolved
 * Run: npx ts-node src/scripts/show-config.ts
 */

import { EnvConfig } from "../config/env";

const env = process.env.ENV || "qa";
const envUpper = env.toUpperCase().replace(/-/g, "_");

console.log("\n=== Current Configuration ===\n");
console.log("Environment:", env);
console.log("BASE_URL:", EnvConfig.BASE_URL);
console.log("\n--- Login Credentials ---");
console.log("ORG_ID:", EnvConfig.ORG_ID);
console.log("USERNAME (Email):", EnvConfig.USERNAME);
console.log("PASSWORD:", EnvConfig.PASSWORD ? "*".repeat(8) + "..." : "(not set)");
console.log("\n--- Browser Settings ---");
console.log("HEADLESS:", EnvConfig.HEADLESS);
console.log("RESOLUTION:", `${EnvConfig.RESOLUTION.width}x${EnvConfig.RESOLUTION.height}`);
console.log("TIMEOUT:", EnvConfig.TIMEOUT, "ms");
console.log("PARALLEL:", EnvConfig.PARALLEL, EnvConfig.PARALLEL === 0 ? "(sequential)" : "workers");
console.log("RETRY:", EnvConfig.RETRY, EnvConfig.RETRY === 0 ? "(no retries)" : "attempts");
console.log("\n--- Database Settings ---");
console.log("DB_HOST:", EnvConfig.DB_HOST);
console.log("DB_PORT:", EnvConfig.DB_PORT);
console.log("DB_NAME:", EnvConfig.DB_NAME);
console.log("DB_USER:", EnvConfig.DB_USER);
console.log("DB_PASSWORD:", EnvConfig.DB_PASSWORD ? "*".repeat(8) + "..." : "(not set)");
console.log("\n=== Credential Resolution Priority ===");
console.log(`For credentials (APP_*, DB_*), lookup order is:`);
console.log(`1. ${envUpper}_APP_USERNAME in process.env`);
console.log(`2. ${envUpper}_APP_USERNAME in .env.secrets`);
console.log(`3. QA_APP_USERNAME (fallback)`);
console.log(`4. APP_USERNAME (legacy fallback)`);
console.log(`5. environments.json value`);
console.log("\n=== General Source Priority ===");
console.log("1. process.env (terminal)");
console.log("2. .env.secrets (your local file)");
console.log("3. environments.json (shared config)");
console.log("4. _defaults (fallback)\n");
