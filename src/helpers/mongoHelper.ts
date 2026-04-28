import { MongoClient, Db, Filter, Document } from "mongodb";
import { EnvConfig } from "../config/env";

/**
 * MongoDB Helper Utility for TypeScript/Playwright
 * Equivalent to Java's MongoDBUtil class
 * 
 * Used for validating UI data against MongoDB database
 */
export class MongoDBHelper {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private host: string;
  private port: string;
  private database: string;
  private username: string;
  private password: string;
  private authEnabled: boolean;
  private tlsEnabled: boolean;

  constructor(options?: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    authEnabled?: boolean;
    tlsEnabled?: boolean;
  }) {
    // Load from environment or use provided options
    // EnvConfig loads .env.secrets automatically
    this.host = options?.host || process.env.MONGO_HOST || "localhost";
    this.port = options?.port || process.env.MONGO_PORT || "27023";
    this.database = options?.database || process.env.MONGO_DATABASE || "screenDB";
    this.username = options?.username || process.env.MONGO_USERNAME || "";
    this.password = options?.password || process.env.MONGO_PASSWORD || "";
    this.authEnabled = options?.authEnabled ?? (this.username !== "");
    this.tlsEnabled = options?.tlsEnabled ?? (process.env.MONGO_TLS_ENABLED === "true");
  }

  /**
   * Connect to MongoDB database
   */
  async connect(): Promise<void> {
    try {
      let connectionUri = "mongodb://";

      if (this.authEnabled && this.username) {
        connectionUri += `${encodeURIComponent(this.username)}:${encodeURIComponent(this.password)}@`;
      }

      connectionUri += `${this.host}:${this.port}/${this.database}`;

      // Add query parameters
      const params: string[] = [];
      if (this.authEnabled) {
        params.push("authSource=admin");
      }
      if (this.tlsEnabled) {
        params.push("tls=true");
        params.push("tlsAllowInvalidCertificates=true");
      }

      if (params.length > 0) {
        connectionUri += "?" + params.join("&");
      }

      // Add directConnection for SSH tunnel scenarios
      if (connectionUri.includes("?")) {
        connectionUri += "&directConnection=true";
      } else {
        connectionUri += "?directConnection=true";
      }

      console.log(`[MongoDBHelper] Connecting to: ${connectionUri.replace(/:[^@/]+@/, ":****@")}`);

      this.client = new MongoClient(connectionUri, {
        // Connection options
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      await this.client.connect();
      this.db = this.client.db(this.database);
      console.log(`[MongoDBHelper] Connected to database: ${this.database}`);
    } catch (error) {
      throw new Error(`[MongoDBHelper] Connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("[MongoDBHelper] Connection closed.");
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Find all documents in a collection
   */
  async findAll(collectionName: string): Promise<Map<string, string>[]> {
    return this.findDocuments(collectionName);
  }

  /**
   * Find documents matching a filter
   */
  async findDocuments(
    collectionName: string,
    filter?: Filter<Document>,
    fields?: string[]
  ): Promise<Map<string, string>[]> {
    if (!this.db) {
      throw new Error("[MongoDBHelper] Not connected to database");
    }

    const collection = this.db.collection(collectionName);
    
    // Build projection if fields specified
    let projection: Document | undefined;
    if (fields && fields.length > 0) {
      projection = { _id: 0 };
      fields.forEach(field => {
        projection![field] = 1;
      });
    }

    const cursor = filter 
      ? collection.find(filter, { projection })
      : collection.find({}, { projection });

    const results: Map<string, string>[] = [];
    
    for await (const doc of cursor) {
      const row = new Map<string, string>();
      for (const [key, value] of Object.entries(doc)) {
        row.set(key, value !== null && value !== undefined ? String(value) : "");
      }
      results.push(row);
    }

    return results;
  }

  /**
   * Get count of documents matching a filter
   */
  async getCount(collectionName: string, filter?: Filter<Document>): Promise<number> {
    if (!this.db) {
      throw new Error("[MongoDBHelper] Not connected to database");
    }

    const collection = this.db.collection(collectionName);
    return filter 
      ? await collection.countDocuments(filter)
      : await collection.countDocuments();
  }

  /**
   * Fetch a single field value from the first matching document
   */
  async fetchSingleValue(
    collectionName: string,
    filter: Filter<Document>,
    fieldName: string
  ): Promise<string | null> {
    if (!this.db) {
      throw new Error("[MongoDBHelper] Not connected to database");
    }

    const collection = this.db.collection(collectionName);
    const doc = await collection.findOne(filter, { projection: { [fieldName]: 1 } });
    
    if (doc && doc[fieldName] !== null && doc[fieldName] !== undefined) {
      return String(doc[fieldName]);
    }
    return null;
  }

  /**
   * Fetch a single column/field from all matching documents
   */
  async fetchColumn(
    collectionName: string,
    filter: Filter<Document> | null,
    fieldName: string
  ): Promise<string[]> {
    if (!this.db) {
      throw new Error("[MongoDBHelper] Not connected to database");
    }

    const collection = this.db.collection(collectionName);
    const cursor = filter 
      ? collection.find(filter, { projection: { [fieldName]: 1 } })
      : collection.find({}, { projection: { [fieldName]: 1 } });

    const values: string[] = [];
    for await (const doc of cursor) {
      values.push(doc[fieldName] !== null && doc[fieldName] !== undefined ? String(doc[fieldName]) : "");
    }

    return values;
  }

  /**
   * Find the first raw document matching a filter
   */
  async findRawDocument(
    collectionName: string,
    filter?: Filter<Document>
  ): Promise<Document | null> {
    if (!this.db) {
      throw new Error("[MongoDBHelper] Not connected to database");
    }

    const collection = this.db.collection(collectionName);
    return filter 
      ? await collection.findOne(filter)
      : await collection.findOne({});
  }

  /**
   * Find all raw documents matching a filter
   */
  async findRawDocuments(
    collectionName: string,
    filter?: Filter<Document>
  ): Promise<Document[]> {
    if (!this.db) {
      throw new Error("[MongoDBHelper] Not connected to database");
    }

    const collection = this.db.collection(collectionName);
    const cursor = filter 
      ? collection.find(filter)
      : collection.find({});

    return await cursor.toArray();
  }
}

/**
 * UK SANCTIONS specific MongoDB queries
 */
export class UKSanctionsMongoQueries {
  private mongoHelper: MongoDBHelper;
  private collectionName: string;

  constructor(mongoHelper: MongoDBHelper, collectionName: string = "facctumRegulatoryList") {
    this.mongoHelper = mongoHelper;
    this.collectionName = collectionName;
  }

  /**
   * Get count of UK SANCTIONS Active records with ID Type
   * Equivalent to Java's MongoDB validation query
   */
  async getActiveRecordsWithIdTypeCount(): Promise<number> {
    const filter = {
      listName: "UK SANCTIONS",
      statusId: 2000,
      idNumberTypesList: { $exists: true }
    };

    return await this.mongoHelper.getCount(this.collectionName, filter);
  }

  /**
   * Get count of UK SANCTIONS records by status
   */
  async getRecordsByStatusCount(statusId: number): Promise<number> {
    const filter = {
      listName: "UK SANCTIONS",
      statusId: statusId
    };

    return await this.mongoHelper.getCount(this.collectionName, filter);
  }

  /**
   * Get UK SANCTIONS records with specific filters
   */
  async getFilteredRecords(options: {
    statusId?: number;
    hasIdType?: boolean;
    hasProgramSource?: boolean;
    hasRegimeName?: boolean;
    entityType?: string;
  }): Promise<number> {
    const filter: Filter<Document> = {
      listName: "UK SANCTIONS"
    };

    if (options.statusId !== undefined) {
      filter.statusId = options.statusId;
    }
    if (options.hasIdType) {
      filter.idNumberTypesList = { $exists: true };
    }
    if (options.hasProgramSource) {
      filter["sanctionProgramDetailsList.programSource"] = { $exists: true };
    }
    if (options.hasRegimeName) {
      filter["sanctionProgramDetailsList.programName"] = { $exists: true };
    }
    if (options.entityType) {
      filter.entityTypeName = options.entityType;
    }

    return await this.mongoHelper.getCount(this.collectionName, filter);
  }

  /**
   * Validate UI count against MongoDB count
   */
  async validateUICount(uiCount: number, statusId: number = 2000): Promise<{
    passed: boolean;
    uiCount: number;
    dbCount: number;
    message: string;
  }> {
    const dbCount = await this.getActiveRecordsWithIdTypeCount();
    const passed = uiCount >= 0 && uiCount === dbCount;

    const message = passed
      ? `PASSED - UI count (${uiCount}) matches DB count (${dbCount})`
      : `FAILED - UI count (${uiCount}) vs DB count (${dbCount})`;

    console.log(`[UKSanctionsMongoQueries] ${message}`);

    return { passed, uiCount, dbCount, message };
  }
}

/**
 * OFAC specific MongoDB queries
 * Equivalent to Java's MongoDB validation in OFACadvfilterPage
 */
export class OFACMongoQueries {
  private mongoHelper: MongoDBHelper;
  private collectionName: string;

  constructor(mongoHelper: MongoDBHelper, collectionName: string = "facctumRegulatoryList") {
    this.mongoHelper = mongoHelper;
    this.collectionName = collectionName;
  }

  /**
   * Get count of OFAC Active records with Address Country
   * Equivalent to Java's MongoDB validation query:
   * Filters.and(
   *   Filters.eq("listName", "OFAC Enhanced"),
   *   Filters.eq("statusId", 2000),
   *   Filters.exists("addressDetailsList.countryName", true)
   * )
   */
  async getActiveRecordsWithAddressCount(listName: string = "OFAC Enhanced"): Promise<number> {
    const filter = {
      listName: listName,
      statusId: 2000,
      "addressDetailsList.countryName": { $exists: true }
    };

    return await this.mongoHelper.getCount(this.collectionName, filter);
  }

  /**
   * Get count of OFAC records by status
   */
  async getRecordsByStatusCount(statusId: number, listName: string = "OFAC Enhanced"): Promise<number> {
    const filter = {
      listName: listName,
      statusId: statusId
    };

    return await this.mongoHelper.getCount(this.collectionName, filter);
  }

  /**
   * Get OFAC records with specific filters
   */
  async getFilteredRecords(options: {
    listName?: string;
    statusId?: number;
    hasAddressCountry?: boolean;
    hasCitizenshipCountry?: boolean;
    hasNationalityCountry?: boolean;
    hasProgramName?: boolean;
    entityType?: string;
  }): Promise<number> {
    const filter: Filter<Document> = {
      listName: options.listName || "OFAC Enhanced"
    };

    if (options.statusId !== undefined) {
      filter.statusId = options.statusId;
    }
    if (options.hasAddressCountry) {
      filter["addressDetailsList.countryName"] = { $exists: true };
    }
    if (options.hasCitizenshipCountry) {
      filter["citizenshipDetailsList.countryName"] = { $exists: true };
    }
    if (options.hasNationalityCountry) {
      filter["nationalityDetailsList.countryName"] = { $exists: true };
    }
    if (options.hasProgramName) {
      filter["sanctionProgramDetailsList.programName"] = { $exists: true };
    }
    if (options.entityType) {
      filter.entityTypeName = options.entityType;
    }

    return await this.mongoHelper.getCount(this.collectionName, filter);
  }

  /**
   * Validate UI count against MongoDB count for OFAC
   */
  async validateUICount(
    uiCount: number,
    listName: string = "OFAC Enhanced",
    statusId: number = 2000
  ): Promise<{
    passed: boolean;
    uiCount: number;
    dbCount: number;
    message: string;
  }> {
    const dbCount = await this.getActiveRecordsWithAddressCount(listName);
    const passed = uiCount >= 0 && uiCount === dbCount;

    const message = passed
      ? `PASSED - UI count (${uiCount}) matches DB count (${dbCount})`
      : `FAILED - UI count (${uiCount}) vs DB count (${dbCount})`;

    console.log(`[OFACMongoQueries] ${message}`);

    return { passed, uiCount, dbCount, message };
  }

  /**
   * Validate UI count with specific filter criteria
   */
  async validateUICountWithFilter(
    uiCount: number,
    filterType: "address" | "citizenship" | "nationality" | "program" | "type",
    listName: string = "OFAC Enhanced"
  ): Promise<{
    passed: boolean;
    uiCount: number;
    dbCount: number;
    message: string;
  }> {
    const filterOptions: {
      listName: string;
      statusId: number;
      hasAddressCountry?: boolean;
      hasCitizenshipCountry?: boolean;
      hasNationalityCountry?: boolean;
      hasProgramName?: boolean;
    } = {
      listName: listName,
      statusId: 2000
    };

    switch (filterType) {
      case "address":
        filterOptions.hasAddressCountry = true;
        break;
      case "citizenship":
        filterOptions.hasCitizenshipCountry = true;
        break;
      case "nationality":
        filterOptions.hasNationalityCountry = true;
        break;
      case "program":
        filterOptions.hasProgramName = true;
        break;
      case "type":
        // Type filter doesn't have a specific field check
        break;
    }

    const dbCount = await this.getFilteredRecords(filterOptions);
    const passed = uiCount >= 0 && uiCount === dbCount;

    const message = passed
      ? `PASSED - UI count (${uiCount}) matches DB count (${dbCount}) for ${filterType} filter`
      : `FAILED - UI count (${uiCount}) vs DB count (${dbCount}) for ${filterType} filter`;

    console.log(`[OFACMongoQueries] ${message}`);

    return { passed, uiCount, dbCount, message };
  }
}

// Export a singleton instance for convenience
let mongoHelperInstance: MongoDBHelper | null = null;

export async function getMongoHelper(): Promise<MongoDBHelper> {
  if (!mongoHelperInstance) {
    mongoHelperInstance = new MongoDBHelper();
    await mongoHelperInstance.connect();
  }
  return mongoHelperInstance;
}

export async function closeMongoHelper(): Promise<void> {
  if (mongoHelperInstance) {
    await mongoHelperInstance.disconnect();
    mongoHelperInstance = null;
  }
}
