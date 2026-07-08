# Affinity Giving — a work-sample prototype for Rocket

**The one-line concept:** the school's existing initiative-level giving campaigns, delivered at the moment of affinity, on the channel that actually reaches alumni — the texted highlight link — with the recognition touchscreen as the in-building surface for the moments alumni are physically present. Rocket is the affinity trigger, not the checkout — and never the fund creator.

Built with Claude Code as a demonstration of build speed + product thinking. Themed around Syracuse rowing.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Deploys automatically to GitHub Pages via `.github/workflows/deploy.yml` (Settings → Pages → Source: **GitHub Actions** must be enabled once).

## The demo narrative

**Primary path — the texted highlight (mobile):**

1. **`/`** — A mock SMS: *"Throwback: the 2014 Lightweight 8+ just hit the Wall of Records — you're in it."* One tap opens the highlight. No real SMS is sent; the screen renders the reach argument.
2. **Team page** — Recognition content on a mobile surface: records, roster (with "That's you"), and — embedded at the moment of affinity — an initiative the school is *already* running for this team.
3. **Initiative detail** — Story, goal, optional progress with an "as of" stamp, social proof, "Support this."
4. **Handoff** — A clearly-labeled boundary: *"You're heading to Syracuse's giving page."* The URL carries UTM source tags; the mocked GiveCampus-style page displays exactly what attribution it received. Rocket never processes the gift.

**Secondary path — the kiosk (`/#/kiosk`):** the same content at touchscreen scale, framed for reunion/homecoming moments. The handoff is a scannable QR (tagged `kiosk_qr`) or "text me the link" — the transaction always belongs on the alum's phone.

**Analytics mode** — the floating toggle (or press `a`) shows funnel events firing live: `link_open | kiosk_open → team_view → initiative_view → support_tap → handoff_initiated`, split by surface. Two deliberate honesty features: the entry event is split by surface because the top of the funnel is the whole reach question, and the funnel *ends* at handoff — Rocket reports intent; the school's platform attributes completions via the source tag.

## Product boundaries (the design's honest premises)

- **No fund creation.** Every initiative maps 1:1 to a giving destination the school already administers — a designated fund or a live crowdfunding campaign with its own URL.
- **No payments.** The handoff is the end of Rocket's surface; the mock external page proves no events fire past it.
- **Advancement governs, doesn't operate.** Progress figures (`raised_amount`, `donor_count`, `last_updated`) are optional school-entered fields. If they're never updated, the module degrades gracefully to goal + story + CTA — it never looks broken. Both states are seeded: "Restore the Boathouse Record Board" (fresh data) and "Rowing Excellence Fund" (goal-only).
- **The kiosk audience is conceded.** Day-to-day, the touchscreen crowd is students and tour parents. Alumni touch the display at event moments and their phones every day — which is why mobile is the primary path.

## Architecture notes

- **Stack:** Vite + React + TypeScript, Tailwind v4 (design tokens live in one `@theme` block in `src/styles/index.css`).
- **Routing:** HashRouter; surface (`mobile` vs `kiosk`) is encoded in the route namespace (`/m/*`, `/kiosk/*`) and injected by layout routes — it survives refresh and deep links with no global state.
- **Data:** one mock module (`src/data/`) — `Entity`, `Initiative`, `Alum`, `AnalyticsEvent`. No backend, no auth, no CMS.
- **Analytics:** a ~60-line store on `useSyncExternalStore` with sessionStorage persistence; the funnel viz is plain divs. No chart/state libraries.
- **Imagery:** deterministic SVG placeholder art (seeded gradients + rowing-shell silhouette) — zero stock-photo licensing in an application repo, consistent art direction.
- **Dependencies:** react, react-dom, react-router-dom, qrcode.react (the kiosk QR is genuinely scannable — it encodes the deployed mobile URL at runtime), one variable font.

## Definition of done

- [x] Full narrative clicks end-to-end from the mock SMS without a dead end
- [x] Handoff boundary is unmistakable — Rocket is neither payment processor nor fund creator
- [x] One initiative renders fresh progress + "as of" stamp; one renders gracefully goal-only
- [x] Kiosk variant exists, framed as the event-moment surface
- [x] Analytics overlay fires surface-split events live, ending at `handoff_initiated`
- [x] Consistent visual system across all screens (the external mock page *deliberately* breaks it)
- [x] Deploy workflow to a shareable link
