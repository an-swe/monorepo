# URL Shortener

A modern, full-stack URL shortener built with React, Vite, Hono, and Cloudflare Workers with D1 database.

[![Deployed on Cloudflare Workers](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://link.dev-ansung.workers.dev)
[![CI](https://github.com/an-swe/link/actions/workflows/ci.yml/badge.svg)](https://github.com/an-swe/link/actions/workflows/ci.yml)
[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Hono](https://img.shields.io/badge/Hono-4.8-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![URL Shortener](public/image.png)

## ✨ Features

- 🔗 **Shorten URLs** - Convert long URLs into short, shareable links
- 🎯 **Custom Aliases** - Create memorable custom short codes
- ⏰ **Expiration (TTL)** - Set automatic expiration times for links
- 📊 **URL Management** - View and manage all your shortened URLs
- 🎨 **Modern UI** - Chromium-inspired design with smooth animations
- ⚡ **Edge Deployment** - Runs on Cloudflare's global network
- 💾 **D1 Database** - Persistent storage with Cloudflare D1

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd link
```

2. Install dependencies:
```bash
npm install
```

3. Set up the D1 database:

**For local development:**
```bash
# Create the database schema locally
npx wrangler d1 execute home_db --local --file=./schema.sql
```

**For production:**
```bash
# The database is already configured in wrangler.json
# Apply the schema to production:
npx wrangler d1 execute home_db --file=./schema.sql
```

### Development

Start the development server:
```bash
npm run dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode (useful during development):
```bash
npm run test:watch
```

The test suite includes:
- URL validation tests
- Alias validation tests (alphanumeric, length, reserved words)
- Short code generation and uniqueness tests
- Database operations (create, retrieve, list URLs)
- TTL/expiration logic tests

## Deployment

Build and deploy to Cloudflare Workers:
```bash
npm run build && npm run deploy
```

Monitor your worker:
```bash
npx wrangler tail
```

## API Endpoints

### POST /api/shorten
Create a shortened URL.

**Request:**
```json
{
  "url": "https://example.com/very/long/url",
  "alias": "my-link",  // optional
  "ttl": 3600          // optional, in seconds
}
```

**Response:**
```json
{
  "short_url": "https://your-domain.com/abc123",
  "short_code": "abc123",
  "original_url": "https://example.com/very/long/url",
  "expires_at": 1234567890  // unix timestamp, or null
}
```

### GET /api/urls
List all shortened URLs.

**Response:**
```json
{
  "urls": [
    {
      "short_code": "abc123",
      "original_url": "https://example.com",
      "short_url": "https://your-domain.com/abc123",
      "created_at": 1234567890,
      "expires_at": 1234571490,
      "is_expired": false
    }
  ]
}
```

### GET /:shortCode
Redirect to the original URL (302 redirect).

Returns 404 if the short code doesn't exist or has expired.

## Database Schema

The application uses Cloudflare D1 with the following schema:

```sql
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/)
- [Hono Documentation](https://hono.dev/)

