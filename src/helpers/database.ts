import { Client, QueryResult } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { logger } from "../utils/logger";
import { EnvConfig } from "../config/env";

/**
 * Database configuration loaded from environment variables.
 * Supports both IAM authentication (for AWS RDS) and standard password auth.
 */
export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  region?: string;
  useIamAuth: boolean;
  password?: string;
}

/**
 * Loads database configuration from EnvConfig (environment-aware).
 */
function getDbConfig(): DbConfig {
  return {
    host: EnvConfig.DB_HOST,
    port: EnvConfig.DB_PORT,
    database: EnvConfig.DB_NAME,
    user: EnvConfig.DB_USER,
    region: EnvConfig.AWS_REGION,
    useIamAuth: EnvConfig.DB_USE_IAM_AUTH,
    password: EnvConfig.DB_PASSWORD
  };
}

/**
 * Generates an IAM authentication token for RDS connection.
 * @param config - Database configuration
 * @returns IAM auth token to use as password
 */
async function getIamAuthToken(config: DbConfig): Promise<string> {
  const signer = new Signer({
    hostname: config.host,
    port: config.port,
    username: config.user,
    region: config.region
  });

  return await signer.getAuthToken();
}

/**
 * DatabaseHelper - Provides database connectivity for test scenarios.
 * Supports AWS RDS with IAM authentication or standard password auth.
 * 
 * @example
 * ```typescript
 * const db = new DatabaseHelper();
 * await db.connect();
 * const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 * await db.disconnect();
 * ```
 */
export class DatabaseHelper {
  private client: Client | null = null;
  private config: DbConfig;

  constructor() {
    this.config = getDbConfig();
  }

  /**
   * Establishes a database connection.
   * Uses IAM auth token if DB_USE_IAM_AUTH=true, otherwise uses DB_PASSWORD.
   */
  async connect(): Promise<void> {
    if (this.client) {
      logger.warn("Database connection already exists");
      return;
    }

    if (!this.config.host || !this.config.database || !this.config.user) {
      throw new Error("Database configuration incomplete. Check DB_HOST, DB_NAME, DB_USER env vars.");
    }

    let password: string;

    if (this.config.useIamAuth) {
      logger.info("Generating IAM auth token for RDS connection...");
      password = await getIamAuthToken(this.config);
    } else {
      if (!this.config.password) {
        throw new Error("DB_PASSWORD required when not using IAM auth");
      }
      password = this.config.password;
    }

    this.client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: password,
      ssl: this.config.useIamAuth ? { rejectUnauthorized: false } : undefined
    });

    try {
      await this.client.connect();
      logger.info(`Connected to database: ${this.config.host}/${this.config.database}`);
    } catch (error) {
      this.client = null;
      logger.error(`Database connection failed: ${error}`);
      throw error;
    }
  }

  /**
   * Executes a SQL query with optional parameters.
   * @param sql - SQL query string with $1, $2, etc. placeholders
   * @param params - Array of parameter values
   * @returns Query result with rows
   */
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.client) {
      throw new Error("Database not connected. Call connect() first.");
    }

    logger.info(`Executing query: ${sql.substring(0, 100)}...`);
    const result = await this.client.query<T>(sql, params);
    logger.info(`Query returned ${result.rowCount} rows`);
    return result;
  }

  /**
   * Executes a query and returns the first row or null.
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns First row or null if no results
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Executes a query and returns all rows.
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Array of rows
   */
  async queryAll<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Closes the database connection.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      logger.info("Database connection closed");
    }
  }

  /**
   * Checks if currently connected to the database.
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}
