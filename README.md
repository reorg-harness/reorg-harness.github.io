# ReOrg project page

Source for <https://reorg-harness.github.io>, the project page for **ReOrg: Evolving Reflective Organization Skills for Enterprise Agents**.

It is a static site with no build step: `index.html`, `assets/css/style.css`, `assets/js/main.js`, and generated data in `assets/js/library-data.js`.

## Preview locally

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

## Common edits

- **Paper link:** set `LINKS.paper` at the top of `assets/js/main.js` to the arXiv URL. Every Paper button switches from "soon" to the link.
- **Numbers:** results tables and charts are defined near the bottom of `assets/js/main.js` (`MAIN`, `COST`, the heatmaps and the Luna bars). They follow the arXiv v1 manuscript.
- **Skill explorer data:** `assets/js/library-data.js` is generated from the captured GDPval learning campaigns (Gemini: `experiment_1`, Qwen: `experiment_4`). It contains only role/action graphs, origin task index, reinforcement count and held-out usage counts.
- **Social card:** `assets/img/og.png` (1200×630).

Deploys automatically through GitHub Pages from `main`.
