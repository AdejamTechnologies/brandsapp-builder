# VENDORED — do not edit here

`src/builder-core/` is a **copy** of the canonical engine at
`brandsapp-multitenant/lib/builder-core`. It is vendored into this repo because
Cloudflare Workers Builds only checks out this repo, so a sibling-path alias
(the old setup) fails on CI with `ENOENT … lib/builder-core`.

**Edit builder-core in brandsapp-multitenant, then run here:**

```bash
pnpm sync:builder-core
```

That re-copies the folder and drops this marker back in. Long-term (spec §11)
this becomes a published `@brandsapp/builder-core` package consumed by both repos.
