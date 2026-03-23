import { Client, QueryResult } from "pg";
import { execSync, spawn, ChildProcess } from "child_process";
import { logger } from "../utils/logger";
import { EnvConfig } from "../config/env";

/**
 * SSM Tunnel configuration for AWS RDS access.
 */
interface TunnelConfig {
  profile: string;
  instanceId: string;
  rdsHost: string;
  rdsPort: number;
  localPort: number;
}

/**
 * Default tunnel configuration matching db-tunnel.bat
 */
const DEFAULT_TUNNEL_CONFIG: TunnelConfig = {
  profile: "FacctumSSMAccess-102212213552",
  instanceId: "i-08913ded80964ec8a",
  rdsHost: "dev-facctum-db.c9wassa8mhfh.ap-south-1.rds.amazonaws.com",
  rdsPort: 5432,
  localPort: 2345
};

/**
 * Performs AWS SSO login.
 * @param profile - AWS profile name
 * @throws Error if SSO login fails
 */
async function ssoLogin(profile: string): Promise<void> {
  logger.info(`Logging in via AWS SSO with profile: ${profile}`);
  try {
    execSync(`aws sso login --profile ${profile}`, { stdio: "inherit" });
    logger.info("SSO login successful");
  } catch (error) {
    logger.error(`SSO login failed: ${error}`);
    throw new Error(`SSO login failed: ${error}`);
  }
}

/**
 * Checks if SSO session is valid by attempting to get caller identity.
 * @param profile - AWS profile name
 * @returns true if session is valid
 */
function isSsoSessionValid(profile: string): boolean {
  try {
    execSync(`aws sts get-caller-identity --profile ${profile}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts an SSM port forwarding tunnel to RDS.
 * @param config - Tunnel configuration
 * @returns ChildProcess for the tunnel
 */
function startTunnel(config: TunnelConfig): ChildProcess {
  logger.info(`Starting SSM tunnel on local port ${config.localPort}...`);
  
  const tunnel = spawn("aws", [
    "ssm", "start-session",
    "--target", config.instanceId,
    "--document-name", "AWS-StartPortForwardingSessionToRemoteHost",
    "--parameters", `portNumber=${config.rdsPort},localPortNumber=${config.localPort},host=${config.rdsHost}`,
    "--profile", config.profile
  ], { stdio: "pipe", shell: true });

  tunnel.on("error", (err) => {
    logger.error(`Tunnel error: ${err}`);
  });

  return tunnel;
}

/**
 * Waits for the tunnel to be ready by attempting to connect.
 * @param port - Local port to check
 * @param maxAttempts - Maximum connection attempts
 * @param delayMs - Delay between attempts in milliseconds
 */
async function waitForTunnel(port: number, maxAttempts = 10, delayMs = 1000): Promise<void> {
  const net = await import("net");
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ port, host: "localhost" }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
        socket.setTimeout(1000, () => {
          socket.destroy();
          reject(new Error("Connection timeout"));
        });
      });
      logger.info("Tunnel is ready");
      return;
    } catch {
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw new Error(`Tunnel not ready after ${maxAttempts} attempts`);
}

/**
 * Executes a database query with automatic SSO authentication and tunnel management.
 * 
 * This function:
 * 1. Checks/performs SSO login
 * 2. Starts an SSM tunnel to RDS (if not using existing tunnel)
 * 3. Connects to the database
 * 4. Executes the query
 * 5. Closes the connection and tunnel
 * 
 * @param sql - SQL query to execute
 * @param params - Optional query parameters
 * @param options - Optional configuration
 * @returns Query result rows
 * 
 * @example
 * ```typescript
 * // Simple query
 * const cases = await executeQuery("SELECT * FROM cases LIMIT 10");
 * 
 * // Parameterized query
 * const user = await executeQuery(
 *   "SELECT * FROM users WHERE username = $1",
 *   ["john.doe"]
 * );
 * 
 * // Use existing tunnel (skip tunnel creation)
 * const result = await executeQuery(
 *   "SELECT NOW()",
 *   [],
 *   { useExistingTunnel: true }
 * );
 * ```
 */
export async function executeQuery<T = any>(
  sql: string,
  params?: any[],
  options?: {
    useExistingTunnel?: boolean;
    tunnelConfig?: Partial<TunnelConfig>;
  }
): Promise<T[]> {
  const config = { ...DEFAULT_TUNNEL_CONFIG, ...options?.tunnelConfig };
  let tunnel: ChildProcess | null = null;
  let client: Client | null = null;

  try {
    // Step 1: Check/perform SSO login (only if not using existing tunnel)
    if (!options?.useExistingTunnel) {
      if (!isSsoSessionValid(config.profile)) {
        await ssoLogin(config.profile);
      } else {
        logger.info("SSO session is valid");
      }

      // Step 2: Start tunnel
      tunnel = startTunnel(config);
      await waitForTunnel(config.localPort);
    }

    // Step 3: Connect to database
    client = new Client({
      host: EnvConfig.DB_HOST || "localhost",
      port: EnvConfig.DB_PORT || config.localPort,
      database: EnvConfig.DB_NAME,
      user: EnvConfig.DB_USER,
      password: EnvConfig.DB_PASSWORD
    });

    await client.connect();
    logger.info("Database connected");

    // Step 4: Execute query
    logger.info(`Executing: ${sql.substring(0, 100)}...`);
    const result: QueryResult<T> = await client.query(sql, params);
    logger.info(`Query returned ${result.rowCount} rows`);

    return result.rows;

  } finally {
    // Step 5: Cleanup
    if (client) {
      await client.end();
      logger.info("Database connection closed");
    }
    if (tunnel) {
      tunnel.kill();
      logger.info("Tunnel closed");
    }
  }
}

/**
 * Executes a query and returns the first row or null.
 * @param sql - SQL query
 * @param params - Query parameters
 * @param options - Configuration options
 */
export async function executeQueryOne<T = any>(
  sql: string,
  params?: any[],
  options?: { useExistingTunnel?: boolean }
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, params, options);
  return rows[0] || null;
}

/**
 * Convenience function for running queries when tunnel is already open.
 * Use this in test scenarios where the tunnel is managed externally.
 * 
 * @param sql - SQL query
 * @param params - Query parameters
 * @returns Query result rows
 * 
 * @example
 * ```typescript
 * // Assumes tunnel is already running (e.g., via db-tunnel.bat)
 * const cases = await queryWithExistingTunnel("SELECT * FROM cases LIMIT 5");
 * ```
 */
export async function queryWithExistingTunnel<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  return executeQuery<T>(sql, params, { useExistingTunnel: true });
}

/**
 * Convenience function for single row queries with existing tunnel.
 */
export async function queryOneWithExistingTunnel<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  return executeQueryOne<T>(sql, params, { useExistingTunnel: true });
}
