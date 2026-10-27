# Dependency record

Node 24.19.0 and npm 11.17.0 were available at initialization. Registry metadata
was queried before installation. Exact installed versions and npm integrity
hashes are pinned in package-lock.json. Node/npm are tools, not redistributed.

Runtime families: React/React DOM, Hono and its Node adapter, Zod (MIT).
Vite, TypeScript, Vitest, ESLint, esbuild, formatting and development tools are
build/test dependencies. Playwright is Apache-2.0. No optional partner SDKs or
model weights are installed.

Run node scripts/license-inventory.mjs to regenerate DEPENDENCIES.json from
the lockfile's package license metadata. This is a dependency inventory, not a
guarantee of compatibility for an arbitrary later deployment. Package licenses
remain in their npm distributions. Full dependency audit is a separate check.
