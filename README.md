# anprogrammer.org

[![Deployed on Cloudflare Workers](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://link.dev-ansung.workers.dev)
[![Link App CI](https://github.com/an-swe/link/actions/workflows/deploy-link.yml/badge.svg)](https://github.com/an-swe/link/actions/workflows/deploy-link.yml)
[![Index App CI](https://github.com/an-swe/link/actions/workflows/deploy-index.yml/badge.svg)](https://github.com/an-swe/link/actions/workflows/deploy-index.yml)
[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Hono](https://img.shields.io/badge/Hono-4.8-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The source code for the `anprogrammer.org` ecosystem, a collection of high-performance web applications and utilities built on the modern web stack.

## Directory Structure

The repository is organized as a monorepo using NPM Workspaces.

### Applications (`apps/`)

| Application | Description | URL | Stack |
| :--- | :--- | :--- | :--- |
| **[Index](apps/index)** | The main landing page and directory. | [anprogrammer.org](https://anprogrammer.org) | Vite, React |
| **[Link Shortener](apps/link)** | High-performance URL shortener with custom aliases and TTL. | [link.anprogrammer.org](https://link.anprogrammer.org) | Cloudflare Workers, Hono, D1, React |

### Shared Packages (`packages/`)

*   **[`@repo/ui`](packages/ui)**: Shared UI component library implementing the Chromium-inspired design system.
*   **[`@repo/config`](packages/config)**: Shared configuration files (TypeScript, ESLint, etc.).
*   **[`@repo/utils`](packages/utils)**: Common utility functions and helpers.

## Development

### Prerequisites

*   Node.js 20+
*   npm 10+

### Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run applications**:

    *   **Index App**:
        ```bash
        npm run dev:index
        ```
    *   **Link Shortener**:
        ```bash
        npm run dev:link
        ```

## Deployment

Continuous deployment is handled via GitHub Actions, deploying directly to Cloudflare's global edge network.

*   **Infrastructure**: Cloudflare Workers & Pages
*   **Database**: Cloudflare D1 (SQLite at the Edge)

## Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
