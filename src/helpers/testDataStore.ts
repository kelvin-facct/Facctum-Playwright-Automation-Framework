import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "reports");
const DATA_FILE = path.join(DATA_DIR, "test-data.json");
const LOCK_FILE = path.join(DATA_DIR, "test-data.lock");
const LOCK_TIMEOUT = 5000; // 5 seconds max wait
const LOCK_RETRY_INTERVAL = 50; // ms between retries

/**
 * TestDataStore - Persists data across scenarios via JSON file.
 * Thread-safe for parallel execution using file locking.
 * Cleared in AfterAll hook.
 */
export class TestDataStore {
  
  private static async acquireLock(): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < LOCK_TIMEOUT) {
      try {
        // O_EXCL flag fails if file exists - atomic lock acquisition
        fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: "wx" });
        return;
      } catch (err: any) {
        if (err.code === "EEXIST") {
          // Lock exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL));
        } else {
          throw err;
        }
      }
    }
    
    // Timeout - force acquire (stale lock)
    fs.writeFileSync(LOCK_FILE, process.pid.toString());
  }

  private static releaseLock(): void {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {
      // Lock already released
    }
  }

  private static getData(): Record<string, any> {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }

  private static saveData(data: Record<string, any>): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Store a value by key. Thread-safe.
   * Use namespaced keys to avoid conflicts: "feature.keyName"
   */
  static async set(key: string, value: any): Promise<void> {
    await this.acquireLock();
    try {
      const data = this.getData();
      data[key] = value;
      this.saveData(data);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Synchronous set - use when async isn't possible.
   * Less safe in parallel but works for sequential execution.
   */
  static setSync(key: string, value: any): void {
    const data = this.getData();
    data[key] = value;
    this.saveData(data);
  }

  /**
   * Retrieve a value by key.
   * Note: Uses synchronous read. For consistency during parallel writes,
   * consider using getAsync() or ensure writes are complete before reading.
   */
  static get<T>(key: string): T | undefined {
    return this.getData()[key];
  }

  /**
   * Retrieve a value by key with lock (thread-safe).
   * Use this when reading during active parallel writes.
   */
  static async getAsync<T>(key: string): Promise<T | undefined> {
    await this.acquireLock();
    try {
      return this.getData()[key];
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Check if a key exists.
   */
  static has(key: string): boolean {
    return key in this.getData();
  }

  /**
   * Remove a specific key.
   */
  static async remove(key: string): Promise<void> {
    await this.acquireLock();
    try {
      const data = this.getData();
      delete data[key];
      this.saveData(data);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Clear all stored data.
   */
  static clear(): void {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  }
}
