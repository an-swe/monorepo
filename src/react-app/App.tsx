import { useState, useEffect } from "react";
import "./App.css";

interface ShortenedUrl {
  short_code: string;
  original_url: string;
  short_url: string;
  created_at: number;
  expires_at: number | null;
  is_expired: boolean;
}

function App() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [ttl, setTtl] = useState<string>("");
  const [customTtl, setCustomTtl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ short_url: string; short_code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<ShortenedUrl[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch URLs on mount
  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const res = await fetch("/api/urls");
      const data = await res.json();
      setUrls(data.urls || []);
    } catch (err) {
      console.error("Failed to fetch URLs:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Calculate TTL in seconds
      let ttlSeconds: number | undefined;
      if (ttl === "custom" && customTtl) {
        ttlSeconds = parseInt(customTtl, 10);
      } else if (ttl) {
        ttlSeconds = parseInt(ttl, 10);
      }

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          alias: alias || undefined,
          ttl: ttlSeconds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to shorten URL");
      } else {
        setResult(data);
        setUrl("");
        setAlias("");
        setTtl("");
        setCustomTtl("");
        fetchUrls(); // Refresh list
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getExpirationText = (expiresAt: number | null) => {
    if (!expiresAt) return "Never";
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) return "Expired";
    const remaining = expiresAt - now;
    const hours = Math.floor(remaining / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return `${Math.floor(remaining / 60)}m remaining`;
  };

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>🔗 URL Shortener</h1>
          <p>Create short, shareable links with optional custom aliases and expiration</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="url">URL to shorten *</label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/very/long/url"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="alias">Custom alias (optional)</label>
                <input
                  id="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="my-link"
                />
                <small>3-20 alphanumeric characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="ttl">Expiration (optional)</label>
                <select
                  id="ttl"
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                >
                  <option value="">Never expires</option>
                  <option value="3600">1 hour</option>
                  <option value="86400">1 day</option>
                  <option value="604800">1 week</option>
                  <option value="custom">Custom...</option>
                </select>
              </div>
            </div>

            {ttl === "custom" && (
              <div className="form-group">
                <label htmlFor="customTtl">Custom TTL (seconds)</label>
                <input
                  id="customTtl"
                  type="number"
                  value={customTtl}
                  onChange={(e) => setCustomTtl(e.target.value)}
                  placeholder="3600"
                  min="1"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Shortening..." : "Shorten URL"}
            </button>
          </form>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="alert alert-success">
              <span>✓</span>
              <div className="result-content">
                <p>Your shortened URL:</p>
                <div className="url-result">
                  <a href={result.short_url} target="_blank" rel="noopener noreferrer">
                    {result.short_url}
                  </a>
                  <button
                    onClick={() => copyToClipboard(result.short_url)}
                    className="btn-copy"
                    title="Copy to clipboard"
                  >
                    {copied === result.short_url ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {urls.length > 0 && (
          <div className="urls-list">
            <h2>Recent URLs ({urls.length})</h2>
            <div className="url-items">
              {urls.map((item) => (
                <div
                  key={item.short_code}
                  className={`url-item ${item.is_expired ? "expired" : ""}`}
                >
                  <div className="url-item-header">
                    <a
                      href={item.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="short-url"
                    >
                      {item.short_url}
                    </a>
                    <button
                      onClick={() => copyToClipboard(item.short_url)}
                      className="btn-copy-small"
                      title="Copy"
                    >
                      {copied === item.short_url ? "✓" : "📋"}
                    </button>
                  </div>
                  <div className="url-item-body">
                    <p className="original-url" title={item.original_url}>
                      → {item.original_url}
                    </p>
                    <div className="url-item-meta">
                      <span className="meta-date">{formatDate(item.created_at)}</span>
                      <span className={`meta-expiry ${item.is_expired ? "expired" : ""}`}>
                        {getExpirationText(item.expires_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

