# EvidLY Deployment Process

## NEVER deploy directly to production.

### Step 1: Build and deploy to test

```bash
git add -A
git commit -m "description of changes"
npx vercel
```

This creates a unique preview URL (e.g., `https://evidly-app-abc123.vercel.app`).

### Step 2: Share preview URL with Arthur

Copy the preview URL from the Vercel output and send it to Arthur.
Arthur tests on desktop + mobile.

### Step 3: Wait for Arthur's approval

Do NOT proceed until Arthur explicitly confirms: "Push it."

### Step 4: Promote to production

```bash
npx vercel --prod
```

### Emergency hotfix

Same process: preview first, Arthur validates, then promote.

---

## Summary

| Stage | Command | Who |
|-------|---------|-----|
| 1. Build & preview | `npx vercel` | Developer |
| 2. Test | Preview URL | Arthur (desktop + mobile) |
| 3. Approve | Explicit approval | Arthur |
| 4. Promote to prod | `npx vercel --prod` | Developer |
