# Ads.txt, Google tag, and MCP approval prompts

## 1. ads.txt for AdSense
Create `public/ads.txt` containing exactly:

```text
google.com, pub-3415158915231085, DIRECT, f08c47fec0942fa0
```

Files in `public/` are served from the site root, so it will be live at `https://classlab.in/ads.txt` after publishing.

## 2. Google Analytics tag (G-MMGY5L22M0)
Add the gtag.js snippet to the root route head (`src/routes/__root.tsx`) so it loads on every page:
- a `<script async src="https://www.googletagmanager.com/gtag/js?id=G-MMGY5L22M0">` entry in the route `scripts`/head config
- an inline init script that pushes `js`/`config` to `dataLayer`
- a small client-side hook that fires a `page_view` event on TanStack Router route changes (single-page navigation doesn't reload the page, so without this only the first page load is counted)

No env var needed — the measurement ID is a public value hardcoded once.

## 3. MCP approval prompts
Approval prompts are shown by the connecting agent (Claude, ChatGPT, etc.), not by our server — our app cannot force auto-approval. What we can do on our side is send the correct hints so clients don't treat safe calls as risky:
- keep `readOnlyHint: true` on all read tools (already set)
- ensure every write tool declares `destructiveHint: false` and `openWorldHint: false`, and add `idempotentHint` where the operation is safely repeatable (`update_blog_post`, `update_task_status`, `vote_post`)
- regenerate the MCP manifest afterwards

To actually stop being asked each time, you enable "always allow" for the ClassLab tools in your MCP client's permission settings (e.g. Claude's tool approval dialog has an "always allow for this tool/server" option). I'll point out where after the change.

## Technical notes
- Only three areas change: new `public/ads.txt`, head/script additions in `src/routes/__root.tsx` (plus a tiny analytics helper in `src/lib/`), and annotation tweaks in `src/lib/mcp/tools/*`.
- No database or auth changes.
