import * as fs from "fs";
import * as path from "path";

/**
 * Environment configuration loader.
 * 
 * Loads configuration from environments.json with:
 * 1. Default values from "_defaults" section
 * 2. Environment-specific overrides
 * 3. Process.env overrides (highest priority)
 * 
 * Sensitive values (credentials) should be passed via environment variables
 * or a separate .env.local file that's gitignored.
 */

interface EnvironmentConfig {
  BASE_URL: string;
  API_URL: string;
  ORG_ID: string;
  USERNAME: string;
  PASSWORD: string;
  HEADLESS: boolean;
  TIMEOUT: number;
  EXTENDED_TIMEOUT: number;
  RECORD_VIDEO: boolean;
  PARALLEL: number;
  RETRY: number;
  STEP_RETRY: number;
  STEP_RETRY_DELAY: number;
  VALIDATE_SESSION: boolean;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  AWS_REGION: string;
  DB_USE_IAM_AUTH: boolean;
}

type EnvJson = {
  _defaults: Record<string, any>;
  [env: string]: Record<string, any>;
};

/**
 * Loads and merges environment configuration.
 */
function loadConfig(): EnvironmentConfig {
  const env = process.env.ENV || "qa";
  const configPath = path.resolve(__dirname, "environments.json");

  // Load JSON config
  let envJson: EnvJson = { _defaults: {} };
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    envJson = JSON.parse(content);
  } catch (error) {
    console.warn(`Could not load environments.json: ${error}`);
  }

  // Load local secrets file if exists (gitignored)
  const secretsPath = path.resolve(__dirname, ".env.secrets");
  let secrets: Record<string, string> = {};
  try {
    if (fs.existsSync(secretsPath)) {
      const content = fs.readFileSync(secretsPath, "utf-8");
      content.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length && !key.trim().startsWith("#")) {
          secrets[key.trim()] = valueParts.join("=").trim();
        }
      });
    }
  } catch {
    // Secrets file is optional
  }

  const defaults = envJson._defaults || {};
  const envConfig = envJson[env] || {};

  if (!envJson[env]) {
    console.warn(`Environment "${env}" not found in environments.json, using defaults only`);
  }

  // Merge: defaults < env-specific < secrets < process.env
  const merged = { ...defaults, ...envConfig, ...secrets };

  // Helper to get value with process.env override
  const get = (key: string, defaultVal: any = ""): any => {
    return process.env[key] ?? merged[key] ?? defaultVal;
  };

  const getBool = (key: string, defaultVal: boolean = false): boolean => {
    const val = process.env[key] ?? merged[key];
    if (val === undefined) return defaultVal;
    return val === true || val === "true";
  };

  const getInt = (key: string, defaultVal: number): number => {
    const val = process.env[key] ?? merged[key];
    if (val === undefined) return defaultVal;
    return parseInt(String(val), 10);
  };

  return {
    BASE_URL: get("BASE_URL"),
    API_URL: get("API_URL"),
    ORG_ID: get("APP_ORG_ID"),
    USERNAME: get("APP_USERNAME"),
    PASSWORD: get("APP_PASSWORD"),
    HEADLESS: getBool("HEADLESS", false),
    TIMEOUT: getInt("TIMEOUT", 15000),
    EXTENDED_TIMEOUT: getInt("EXTENDED_TIMEOUT", 60000),
    RECORD_VIDEO: getBool("RECORD_VIDEO", true),
    PARALLEL: getInt("PARALLEL", 0),
    RETRY: getInt("RETRY", 0),
    STEP_RETRY: getInt("STEP_RETRY", 2),
    STEP_RETRY_DELAY: getInt("STEP_RETRY_DELAY", 1000),
    VALIDATE_SESSION: getBool("VALIDATE_SESSION", true),
    DB_HOST: get("DB_HOST"),
    DB_PORT: getInt("DB_PORT", 5432),
    DB_NAME: get("DB_NAME"),
    DB_USER: get("DB_USER"),
    DB_PASSWORD: get("DB_PASSWORD"),
    AWS_REGION: get("AWS_REGION", "us-east-1"),
    DB_USE_IAM_AUTH: getBool("DB_USE_IAM_AUTH", false)
  };
}

/**
 * EnvConfig - Centralized configuration object.
 * 
 * Priority (highest to lowest):
 * 1. Process environment variables
 * 2. .env.secrets file (gitignored, for local credentials)
 * 3. Environment-specific config from environments.json
 * 4. Default values from environments.json._defaults
 */
export const EnvConfig = loadConfig();
