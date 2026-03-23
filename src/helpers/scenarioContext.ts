/**
 * ScenarioContext - A key-value store for sharing data between steps within a scenario.
 * 
 * Use this class to pass data between step definitions without using global variables.
 * Each scenario gets its own ScenarioContext instance, ensuring test isolation.
 * 
 * @example
 * ```typescript
 * // In a Given step
 * this.scenarioContext.set('userId', '12345');
 * 
 * // In a Then step
 * const userId = this.scenarioContext.get('userId');
 * ```
 */
export class ScenarioContext {
  /** Internal storage for context data */
  private contextData: Map<string, any> = new Map();

  /**
   * Stores a value in the context.
   * @param key - The key to store the value under
   * @param value - The value to store (can be any type)
   */
  set(key: string, value: any): void {
    this.contextData.set(key, value);
  }

  /**
   * Retrieves a value from the context.
   * @param key - The key to retrieve
   * @returns The stored value, or undefined if not found
   */
  get<T = any>(key: string): T | undefined {
    return this.contextData.get(key) as T | undefined;
  }

  /**
   * Checks if a key exists in the context.
   * @param key - The key to check
   * @returns True if the key exists, false otherwise
   */
  has(key: string): boolean {
    return this.contextData.has(key);
  }
}
