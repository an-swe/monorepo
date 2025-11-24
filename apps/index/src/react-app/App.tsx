import { Layout } from "@repo/ui";
import "./App.css";

function App() {
  return (
    <Layout title="anprogrammer.org">
      <section className="hero">
        <h1 className="hero-title">Welcome to anprogrammer.org</h1>
        <p className="hero-desc">
          A collection of tools and projects built with modern web technologies.
        </p>
      </section>

      <div className="content-container">
        <div className="card">
          <h2>🔗 URL Shortener</h2>
          <p>Create short, shareable links with optional custom aliases and expiration.</p>
          <a href="https://link.anprogrammer.org" className="btn-primary" target="_blank" rel="noopener noreferrer">
            Visit Link Shortener →
          </a>
        </div>

        <div className="card">
          <h2>🚀 More Coming Soon</h2>
          <p>Stay tuned for more tools and projects!</p>
        </div>
      </div>
    </Layout>
  );
}

export default App;
