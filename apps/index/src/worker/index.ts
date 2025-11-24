import { Hono } from "hono";

// Simple Hono app that serves the React application through Cloudflare Workers Assets
const app = new Hono();

// The app will automatically serve static assets from the dist/client directory
// configured in wrangler.json. No additional routes needed for basic page serving.

// Optional: Add a simple API endpoint for testing
app.get("/api/health", (c) => {
  return c.json({ status: "ok", message: "Index app is running!" });
});

export default app;
