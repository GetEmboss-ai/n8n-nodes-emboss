# Releasing & n8n verification

This package is published to npm as `n8n-nodes-emboss`. v1.0.0 was published manually (community
tier). For the **n8n verified tier**, releases must be published from CI with **npm provenance**
(required by n8n from May 2026) — this is what `.github/workflows/publish.yml` does.

## One-time setup (operator)

1. **Make the GitHub repo public.** n8n verification requires a public repo whose URL matches the npm
   package.
   ```bash
   gh repo edit edwinorange/n8n-nodes-emboss --visibility public
   ```
2. **Give the GitHub Action permission to publish to npm.** Either:
   - **Trusted Publisher (recommended, no long-lived token):** on npmjs.com → the package →
     Settings → *Trusted Publishers* → add this GitHub repo + the `Publish` workflow. The workflow's
     `id-token: write` + `--provenance` then authenticate via OIDC. (No `NPM_TOKEN` secret needed.)
   - **OR a granular token:** npmjs.com → Access Tokens → Generate → *Granular Access Token* with
     read+write on this package (and "bypass 2FA"/automation). Add it to the GitHub repo as the
     secret **`NPM_TOKEN`** (Settings → Secrets and variables → Actions).

## Cutting a release (each new version)

You can never republish an existing version, so always bump first.

1. Make code changes; ensure green locally:
   ```bash
   npm run lint && npm test && npm run build
   ```
2. Bump the version + commit + tag, then push:
   ```bash
   npm version patch     # 1.0.1 -> 1.0.2  (or `minor` / `major`)
   git push && git push --tags
   ```
3. **Create a GitHub Release** on the new tag (GitHub UI → Releases → Draft, pick the tag, Publish),
   or:
   ```bash
   gh release create v1.0.2 --title v1.0.2 --notes "what changed"
   ```
4. The `Publish` workflow runs automatically on the published release: `npm ci` → lint → test →
   build → `npm publish --provenance --access public`. Watch it under the repo's **Actions** tab.

> The current `package.json` is at **1.0.1** (bumped, unpublished). The first provenance release will
> publish 1.0.1 — just cut a `v1.0.1` GitHub Release after the one-time setup above.

## Submitting for n8n verification

After a provenance-published version exists:

1. Confirm it passes the scan:
   ```bash
   npx @n8n/scan-community-package n8n-nodes-emboss
   ```
   (Provenance check must pass — it failed for the manually-published 1.0.0; a CI/provenance release
   fixes it.)
2. Submit at **https://creators.n8n.io/nodes** — connect the npm package + the public GitHub repo.
   n8n reviews it (quality check). We already satisfy: zero runtime deps, lint-clean
   (`plugin:n8n-nodes-base/community`), MIT license, README, single service.
