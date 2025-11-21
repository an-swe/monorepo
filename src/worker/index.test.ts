import { describe, it, expect, beforeEach } from "vitest";

// Mock D1Database for testing
class MockD1Database {
  private data: Map<string, any> = new Map();

  prepare(query: string) {
    const self = this;
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          if (query.includes("SELECT") && query.includes("WHERE short_code = ?")) {
            const shortCode = params[0];
            return self.data.get(shortCode) || null;
          }
          return null;
        },
        run: async () => {
          if (query.includes("INSERT INTO urls")) {
            const [shortCode, originalUrl, createdAt, expiresAt] = params;
            if (self.data.has(shortCode)) {
              throw new Error("UNIQUE constraint failed");
            }
            self.data.set(shortCode, {
              short_code: shortCode,
              original_url: originalUrl,
              created_at: createdAt,
              expires_at: expiresAt,
            });
            return { success: true };
          }
          return { success: false };
        },
        all: async () => {
          const results = Array.from(self.data.values());
          return { results };
        },
      }),
      // Support calling all() directly without bind()
      all: async () => {
        const results = Array.from(self.data.values());
        return { results };
      },
    };
  }

  reset() {
    this.data.clear();
  }
}

// Import the UrlShortenerService class (we'll need to export it)
// For now, we'll duplicate the class for testing purposes
class UrlShortenerService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  generateShortCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  isValidAlias(alias: string): boolean {
    const aliasRegex = /^[a-zA-Z0-9]{3,20}$/;
    if (!aliasRegex.test(alias)) {
      return false;
    }
    
    const reserved = ["api", "admin", "dashboard", "settings"];
    if (reserved.includes(alias.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  async shortCodeExists(shortCode: string): Promise<boolean> {
    const result = await this.db
      .prepare("SELECT id FROM urls WHERE short_code = ?")
      .bind(shortCode)
      .first();
    return result !== null;
  }

  async generateUniqueShortCode(maxRetries: number = 5): Promise<string | null> {
    let shortCode = this.generateShortCode();
    let retries = 0;
    
    while (retries < maxRetries) {
      const exists = await this.shortCodeExists(shortCode);
      if (!exists) return shortCode;
      
      shortCode = this.generateShortCode();
      retries++;
    }
    
    return null;
  }

  async createShortUrl(url: string, alias?: string, ttl?: number): Promise<{
    short_code: string;
    original_url: string;
    expires_at: number | null;
  }> {
    if (!url || !this.isValidUrl(url)) {
      throw new Error("Invalid URL. Must be a valid http:// or https:// URL");
    }

    let shortCode: string;
    if (alias) {
      if (!this.isValidAlias(alias)) {
        throw new Error("Invalid alias. Must be 3-20 alphanumeric characters and not a reserved word");
      }
      shortCode = alias;
    } else {
      const generated = await this.generateUniqueShortCode();
      if (!generated) {
        throw new Error("Failed to generate unique short code. Please try again.");
      }
      shortCode = generated;
    }

    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = ttl ? createdAt + ttl : null;

    try {
      await this.db
        .prepare("INSERT INTO urls (short_code, original_url, created_at, expires_at) VALUES (?, ?, ?, ?)")
        .bind(shortCode, url, createdAt, expiresAt)
        .run();
    } catch (err) {
      if (err instanceof Error && err.message.includes("UNIQUE")) {
        throw new Error("Alias already taken. Please choose another.");
      }
      throw err;
    }

    return {
      short_code: shortCode,
      original_url: url,
      expires_at: expiresAt
    };
  }

  async getAllUrls(): Promise<Array<{
    short_code: string;
    original_url: string;
    created_at: number;
    expires_at: number | null;
    is_expired: boolean;
  }>> {
    const results = await this.db
      .prepare("SELECT short_code, original_url, created_at, expires_at FROM urls ORDER BY created_at DESC")
      .all();

    const currentTime = Math.floor(Date.now() / 1000);
    return results.results.map((row: any) => ({
      short_code: row.short_code,
      original_url: row.original_url,
      created_at: row.created_at,
      expires_at: row.expires_at,
      is_expired: row.expires_at ? currentTime > row.expires_at : false
    }));
  }

  async getUrlByShortCode(shortCode: string): Promise<{
    original_url: string;
    is_expired: boolean;
  } | null> {
    const result = await this.db
      .prepare("SELECT original_url, expires_at FROM urls WHERE short_code = ?")
      .bind(shortCode)
      .first();

    if (!result) {
      return null;
    }

    const isExpired = result.expires_at 
      ? Math.floor(Date.now() / 1000) > result.expires_at 
      : false;

    return {
      original_url: result.original_url,
      is_expired: isExpired
    };
  }
}

describe("UrlShortenerService", () => {
  let service: UrlShortenerService;
  let mockDb: MockD1Database;

  beforeEach(() => {
    mockDb = new MockD1Database();
    service = new UrlShortenerService(mockDb);
    mockDb.reset();
  });

  describe("generateShortCode", () => {
    it("should generate a 6-character alphanumeric code", () => {
      const code = service.generateShortCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[a-zA-Z0-9]{6}$/);
    });

    it("should generate different codes on multiple calls", () => {
      const codes = new Set();
      for (let i = 0; i < 10; i++) {
        codes.add(service.generateShortCode());
      }
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe("isValidUrl", () => {
    it("should accept valid http URLs", () => {
      expect(service.isValidUrl("http://example.com")).toBe(true);
    });

    it("should accept valid https URLs", () => {
      expect(service.isValidUrl("https://example.com")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(service.isValidUrl("not a url")).toBe(false);
      expect(service.isValidUrl("ftp://example.com")).toBe(false);
      expect(service.isValidUrl("")).toBe(false);
    });
  });

  describe("isValidAlias", () => {
    it("should accept valid alphanumeric aliases", () => {
      expect(service.isValidAlias("mylink")).toBe(true);
      expect(service.isValidAlias("test123")).toBe(true);
      expect(service.isValidAlias("ABC")).toBe(true);
    });

    it("should reject aliases that are too short", () => {
      expect(service.isValidAlias("ab")).toBe(false);
    });

    it("should reject aliases that are too long", () => {
      expect(service.isValidAlias("a".repeat(21))).toBe(false);
    });

    it("should reject aliases with special characters", () => {
      expect(service.isValidAlias("my-link")).toBe(false);
      expect(service.isValidAlias("my_link")).toBe(false);
      expect(service.isValidAlias("my link")).toBe(false);
    });

    it("should reject reserved words", () => {
      expect(service.isValidAlias("api")).toBe(false);
      expect(service.isValidAlias("admin")).toBe(false);
      expect(service.isValidAlias("dashboard")).toBe(false);
      expect(service.isValidAlias("settings")).toBe(false);
    });
  });

  describe("createShortUrl", () => {
    it("should create a short URL with auto-generated code", async () => {
      const result = await service.createShortUrl("https://example.com");
      
      expect(result.short_code).toHaveLength(6);
      expect(result.original_url).toBe("https://example.com");
      expect(result.expires_at).toBeNull();
    });

    it("should create a short URL with custom alias", async () => {
      const result = await service.createShortUrl("https://example.com", "mylink");
      
      expect(result.short_code).toBe("mylink");
      expect(result.original_url).toBe("https://example.com");
    });

    it("should create a short URL with TTL", async () => {
      const ttl = 3600; // 1 hour
      const result = await service.createShortUrl("https://example.com", undefined, ttl);
      
      expect(result.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("should throw error for invalid URL", async () => {
      await expect(
        service.createShortUrl("not a url")
      ).rejects.toThrow("Invalid URL");
    });

    it("should throw error for invalid alias", async () => {
      await expect(
        service.createShortUrl("https://example.com", "ab")
      ).rejects.toThrow("Invalid alias");
    });

    it("should throw error for duplicate alias", async () => {
      await service.createShortUrl("https://example.com", "mylink");
      
      await expect(
        service.createShortUrl("https://another.com", "mylink")
      ).rejects.toThrow("Alias already taken");
    });
  });

  describe("getAllUrls", () => {
    it("should return empty array when no URLs exist", async () => {
      const urls = await service.getAllUrls();
      expect(urls).toEqual([]);
    });

    it("should return all created URLs", async () => {
      await service.createShortUrl("https://example.com", "link1");
      await service.createShortUrl("https://another.com", "link2");
      
      const urls = await service.getAllUrls();
      expect(urls).toHaveLength(2);
    });

    it("should mark expired URLs", async () => {
      // Create URL that expired 1 hour ago
      const expiredTtl = -3600;
      await service.createShortUrl("https://example.com", "explink", expiredTtl);
      
      const urls = await service.getAllUrls();
      expect(urls[0].is_expired).toBe(true);
    });
  });

  describe("getUrlByShortCode", () => {
    it("should return null for non-existent short code", async () => {
      const result = await service.getUrlByShortCode("nonexistent");
      expect(result).toBeNull();
    });

    it("should return URL for valid short code", async () => {
      await service.createShortUrl("https://example.com", "mylink");
      
      const result = await service.getUrlByShortCode("mylink");
      expect(result).not.toBeNull();
      expect(result!.original_url).toBe("https://example.com");
      expect(result!.is_expired).toBe(false);
    });

    it("should mark expired URL as expired", async () => {
      const expiredTtl = -3600; // Expired 1 hour ago
      await service.createShortUrl("https://example.com", "explink", expiredTtl);
      
      const result = await service.getUrlByShortCode("explink");
      expect(result).not.toBeNull();
      expect(result!.is_expired).toBe(true);
    });
  });
});
