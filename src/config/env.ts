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
  APPROVER_USERNAME: string;
  APPROVER_PASSWORD: string;
  APPROVER_ORG_ID: string;
  HEADLESS: boolean;
  TIMEOUT: number;
  EXTENDED_TIMEOUT: number;
  RECORD_VIDEO: boolean;
  RESOLUTION: { width: number; height: number };
  PARALLEL: number;
  RETRY: number;
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
  // For credentials, checks ENV-prefixed keys first (e.g., QA_APP_USERNAME)
  const get = (key: string, defaultVal: any = ""): any => {
    return process.env[key] ?? merged[key] ?? defaultVal;
  };

  // Helper for environment-specific credentials
  // Converts hyphens to underscores for env prefix (stage-uk -> STAGE_UK)
  // Checks: {ENV}_APP_USERNAME -> QA_APP_USERNAME (default) -> merged -> default
  const getCredential = (key: string, defaultVal: any = ""): any => {
    const envPrefix = env.toUpperCase().replace(/-/g, "_");
    const envPrefixedKey = `${envPrefix}_${key}`;
    const qaPrefixedKey = `QA_${key}`;
    return process.env[envPrefixedKey] ?? secrets[envPrefixedKey] ?? 
           process.env[qaPrefixedKey] ?? secrets[qaPrefixedKey] ??
           process.env[key] ?? merged[key] ?? defaultVal;
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

  // Parse resolution string (e.g., "1920x1080") into { width, height }
  const getResolution = (key: string, defaultVal: string = "1920x1080"): { width: number; height: number } => {
    const val = process.env[key] ?? merged[key] ?? defaultVal;
    const match = String(val).match(/^(\d+)x(\d+)$/i);
    if (match) {
      return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
    return { width: 1920, height: 1080 };
  };

  return {
    BASE_URL: get("BASE_URL"),
    API_URL: get("API_URL"),
    ORG_ID: getCredential("APP_ORG_ID"),
    USERNAME: getCredential("APP_USERNAME"),
    PASSWORD: getCredential("APP_PASSWORD"),
    APPROVER_USERNAME: getCredential("APPROVER_USERNAME"),
    APPROVER_PASSWORD: getCredential("APPROVER_PASSWORD"),
    APPROVER_ORG_ID: getCredential("APPROVER_ORG_ID"),
    HEADLESS: getBool("HEADLESS", false),
    TIMEOUT: getInt("TIMEOUT", 15000),
    EXTENDED_TIMEOUT: getInt("EXTENDED_TIMEOUT", 60000),
    RECORD_VIDEO: getBool("RECORD_VIDEO", true),
    RESOLUTION: getResolution("RESOLUTION"),
    PARALLEL: getInt("PARALLEL", 0),
    RETRY: getInt("RETRY", 0),
    VALIDATE_SESSION: getBool("VALIDATE_SESSION", true),
    DB_HOST: getCredential("DB_HOST"),
    DB_PORT: getInt("DB_PORT", 5432),
    DB_NAME: getCredential("DB_NAME"),
    DB_USER: getCredential("DB_USER"),
    DB_PASSWORD: getCredential("DB_PASSWORD"),
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
