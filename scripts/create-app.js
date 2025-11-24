#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function exec(command, cwd = process.cwd()) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    process.exit(1);
  }
}

async function main() {
  console.log('\n🚀 Create New App for anprogrammer.org monorepo\n');

  // Get app name
  const appName = await ask('App name (e.g., "todo", "blog"): ');
  if (!appName) {
    console.error('App name is required!');
    process.exit(1);
  }

  const appPath = join(process.cwd(), 'apps', appName);

  console.log(`\n✨ Creating new app: ${appName}\n`);

  // Step 1: Scaffold with Vite
  console.log('📦 Step 1/7: Scaffolding React + TypeScript app with Vite...');
  exec(`npm create vite@latest ${appName} -- --template react-ts`, join(process.cwd(), 'apps'));

  // Step 2: Restructure files
  console.log('\n📁 Step 2/7: Restructuring files for Cloudflare Workers...');
  mkdirSync(join(appPath, 'src', 'react-app'), { recursive: true });
  mkdirSync(join(appPath, 'src', 'worker'), { recursive: true });
  
  exec(`mv src/*.tsx src/*.ts src/*.css src/react-app/ 2>/dev/null || true`, appPath);
  exec(`mv src/assets src/react-app/ 2>/dev/null || true`, appPath);

  // Update index.html
  const indexHtml = readFileSync(join(appPath, 'index.html'), 'utf-8');
  writeFileSync(
    join(appPath, 'index.html'),
    indexHtml.replace('/src/main.tsx', '/src/react-app/main.tsx')
  );

  // Step 3: Update package.json
  console.log('\n📝 Step 3/7: Adding Cloudflare dependencies...');
  const pkgPath = join(appPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  
  pkg.dependencies = {
    ...pkg.dependencies,
    '@repo/config': '^0.0.0',
    '@repo/ui': '^0.0.0',
    '@repo/utils': '^0.0.0',
    'hono': '^4.10.6'
  };
  
  pkg.devDependencies = {
    ...pkg.devDependencies,
    '@cloudflare/vite-plugin': '1.7.5',
    'wrangler': '4.21.x'
  };
  
  pkg.scripts = {
    ...pkg.scripts,
    'cf-typegen': 'wrangler types',
    'deploy': 'wrangler deploy',
    'build': 'tsc -b && vite build'
  };
  
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // Step 4: Update vite.config.ts
  console.log('\n⚡ Step 4/7: Configuring Vite for Cloudflare...');
  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()] as any,
});
`;
  writeFileSync(join(appPath, 'vite.config.ts'), viteConfig);

  // Step 5: Create worker
  console.log('\n🔧 Step 5/7: Creating Cloudflare Worker...');
  const workerCode = `import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({ status: "ok", app: "${appName}" });
});

export default app;
`;
  writeFileSync(join(appPath, 'src', 'worker', 'index.ts'), workerCode);

  // Step 6: Create wrangler.json
  console.log('\n☁️  Step 6/7: Creating Wrangler configuration...');
  const wranglerConfig = {
    "$schema": "node_modules/wrangler/config-schema.json",
    "name": appName,
    "main": "./src/worker/index.ts",
    "compatibility_date": "2025-10-08",
    "compatibility_flags": ["nodejs_compat"],
    "observability": { "enabled": true },
    "upload_source_maps": true,
    "assets": {
      "directory": "./dist/client",
      "not_found_handling": "404-page"
    }
  };
  writeFileSync(join(appPath, 'wrangler.json'), JSON.stringify(wranglerConfig, null, 2));

  // Copy tsconfig.worker.json from existing app
  const referenceApp = 'apps/index';
  copyFileSync(
    join(process.cwd(), referenceApp, 'tsconfig.worker.json'),
    join(appPath, 'tsconfig.worker.json')
  );

  // Update tsconfig.json
  const tsconfigPath = join(appPath, 'tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
  tsconfig.references.push({ "path": "./tsconfig.worker.json" });
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  // Step 7: Update root package.json
  console.log('\n🔗 Step 7/7: Updating workspace configuration...');
  const rootPkgPath = join(process.cwd(), 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  rootPkg.scripts[`dev:${appName}`] = `npm run dev --workspace=apps/${appName}`;
  rootPkg.scripts[`deploy:${appName}`] = `npm run deploy --workspace=apps/${appName}`;
  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));

  // Create GitHub Actions workflow
  console.log('\n🤖 Creating GitHub Actions workflow...');
  const workflowName = `deploy-${appName}.yml`;
  const workflow = `name: Deploy ${appName.charAt(0).toUpperCase() + appName.slice(1)} App

on:
  push:
    branches: [main]
    paths:
      - 'apps/${appName}/**'
      - 'packages/**'
      - 'package-lock.json'

jobs:
  deploy:
    name: Deploy ${appName.charAt(0).toUpperCase() + appName.slice(1)} Worker
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build -w apps/${appName}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: 'apps/${appName}'
`;
  writeFileSync(join(process.cwd(), '.github', 'workflows', workflowName), workflow);

  console.log('\n✅ App created successfully!\n');
  console.log('Next steps:');
  console.log(`  1. cd apps/${appName}`);
  console.log(`  2. npm install (at root)`);
  console.log(`  3. npm run dev:${appName}`);
  console.log(`  4. npm run deploy:${appName}\n`);

  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
