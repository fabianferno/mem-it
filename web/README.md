# mem-it — landing page

A static, single-page marketing site for **mem-it** with build-from-source install
instructions. Matches the app's design language (pure-black canvas, crimson
`#E53659` accent, glassmorphism — see `cortex/src/theme.ts`).

## Files

- `index.html` — page markup (hero, pipeline, features, privacy, install steps, footer)
- `styles.css` — all styling
- `main.js` — sticky nav, copy-to-clipboard buttons, scroll-reveal
- `assets/` — logo, icon, hero/cube GIFs (copied from `cortex/assets/`), QVAC logo

## Preview locally

No build step — it's plain HTML/CSS/JS. Serve the folder:

```bash
cd web
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Point it
at this `web/` directory; there is nothing to compile.
