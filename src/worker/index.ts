import { Hono } from "hono";

// Environment bindings
interface Env {
  home_db: D1Database;
}

// URL Shortener Service class
class UrlShortenerService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // Generate random short code
  generateShortCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Validate URL format
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Validate custom alias
  isValidAlias(alias: string): boolean {
    // Alphanumeric only, 3-20 characters
    const aliasRegex = /^[a-zA-Z0-9]{3,20}$/;
    if (!aliasRegex.test(alias)) {
      return false;
    }
    
    // Reserved words
    const reserved = ["api", "admin", "dashboard", "settings"];
    if (reserved.includes(alias.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  // Check if short code exists
  async shortCodeExists(shortCode: string): Promise<boolean> {
    const result = await this.db
      .prepare("SELECT id FROM urls WHERE short_code = ?")
      .bind(shortCode)
      .first();
    return result !== null;
  }

  // Generate unique short code with retries
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

  // Create shortened URL
  async createShortUrl(url: string, alias?: string, ttl?: number): Promise<{
    short_code: string;
    original_url: string;
    expires_at: number | null;
  }> {
    // Validate URL
    if (!url || !this.isValidUrl(url)) {
      throw new Error("Invalid URL. Must be a valid http:// or https:// URL");
    }

    // Generate or validate short code
    let shortCode: string;
    if (alias) {
      // Validate custom alias
      if (!this.isValidAlias(alias)) {
        throw new Error("Invalid alias. Must be 3-20 alphanumeric characters and not a reserved word");
      }
      shortCode = alias;
    } else {
      // Generate random short code
      const generated = await this.generateUniqueShortCode();
      if (!generated) {
        throw new Error("Failed to generate unique short code. Please try again.");
      }
      shortCode = generated;
    }

    // Calculate expiration timestamp
    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = ttl ? createdAt + ttl : null;

    // Insert into database
    try {
      await this.db
        .prepare("INSERT INTO urls (short_code, original_url, created_at, expires_at) VALUES (?, ?, ?, ?)")
        .bind(shortCode, url, createdAt, expiresAt)
        .run();
    } catch (err) {
      // Handle unique constraint violation
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

  // Get all URLs
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

  // Get URL by short code
  async getUrlByShortCode(shortCode: string): Promise<{
    original_url: string;
    is_expired: boolean;
  } | null> {
    const result = await this.db
      .prepare("SELECT original_url, expires_at FROM urls WHERE short_code = ?")
      .bind(shortCode)
      .first<{ original_url: string; expires_at: number | null }>();

    if (!result) {
      return null;
    }

    // Check if expired
    const isExpired = result.expires_at 
      ? Math.floor(Date.now() / 1000) > result.expires_at 
      : false;

    return {
      original_url: result.original_url,
      is_expired: isExpired
    };
  }
}

// Main application class
class UrlShortenerApp {
  private app: Hono<{ Bindings: Env }>;

  constructor() {
    this.app = new Hono<{ Bindings: Env }>();
    this.setupRoutes();
  }

  private setupRoutes() {
    // API routes first (highest priority)
    
    // POST /api/shorten - Create shortened URL
    this.app.post("/api/shorten", async (c) => {
      try {
        const service = new UrlShortenerService(c.env.home_db);
        const body = await c.req.json<{ url: string; alias?: string; ttl?: number }>();
        const { url, alias, ttl } = body;

        const result = await service.createShortUrl(url, alias, ttl);
        const shortUrl = `${new URL(c.req.url).origin}/${result.short_code}`;

        return c.json({ 
          short_url: shortUrl, 
          short_code: result.short_code,
          original_url: result.original_url,
          expires_at: result.expires_at 
        }, 201);
      } catch (err) {
        if (err instanceof Error) {
          const statusCode = err.message.includes("already taken") ? 409 : 400;
          return c.json({ error: err.message }, statusCode);
        }
        console.error("Error in /api/shorten:", err);
        return c.json({ error: "Internal server error" }, 500);
      }
    });

    // GET /api/urls - List all URLs
    this.app.get("/api/urls", async (c) => {
      try {
        const service = new UrlShortenerService(c.env.home_db);
        const urls = await service.getAllUrls();

        const baseUrl = new URL(c.req.url).origin;
        const urlsWithShortUrl = urls.map(url => ({
          ...url,
          short_url: `${baseUrl}/${url.short_code}`
        }));

        return c.json({ urls: urlsWithShortUrl });
      } catch (err) {
        console.error("Error in /api/urls:", err);
        return c.json({ error: "Internal server error" }, 500);
      }
    });

    // Fallback for unknown API routes
    this.app.get("/api/*", () => {
      return new Response("Not Found", { status: 404 });
    });

    // GET /:shortCode - Redirect to original URL
    // This catches all non-API routes and checks if they're short codes
    this.app.get("/:shortCode", async (c) => {
      const shortCode = c.req.param("shortCode");

      // If the path is empty (root path), let it fall through to assets
      if (!shortCode) {
        return c.notFound();
      }

      try {
        const service = new UrlShortenerService(c.env.home_db);
        const result = await service.getUrlByShortCode(shortCode);

        if (!result) {
          // Not found in database, let assets handler serve React app
          return c.notFound();
        }

        if (result.is_expired) {
          return c.text("Short URL has expired", 410);
        }

        return c.redirect(result.original_url, 302);
      } catch (err) {
        console.error("Error in redirect:", err);
        return c.text("Internal server error", 500);
      }
    });
  }

  getApp() {
    return this.app;
  }
}

// Export the configured app
const urlShortener = new UrlShortenerApp();
export default urlShortener.getApp();
