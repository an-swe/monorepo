import { Layout, Card } from "@repo/ui";

function App() {
  const projects = [
    {
      name: "Link Shortener",
      description: "A high-performance, edge-deployed URL shortener built on Cloudflare Workers and D1.",
      url: "https://link.anprogrammer.org",
    },
    {
      name: "Media Gallery",
      description: "An immersive video and image gallery featuring seamless transitions and optimized playback.",
      url: "https://gallery.anprogrammer.org",
    },
    // Add more projects here
  ];

  return (
    <Layout title="anprogrammer.org">
      <section className="hero">
        <h1 className="hero-title">Developer Resources</h1>
        <p className="hero-desc">
          A collection of tools, applications, and experiments built for the modern web.
        </p>
      </section>

      <div className="projects-grid">
        {projects.map((project) => (
          <Card
            key={project.name}
            title={project.name}
            description={project.description}
            href={project.url}
          />
        ))}
      </div>
    </Layout>
  )
}

export default App
