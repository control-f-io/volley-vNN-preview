# Volley vNN · SPS 2026 presentation

The web page for Control-F's **Volley vNN**, a spiking neural network that reads language and live telemetry as one
unbroken stream, learns during inference per asset and per stream, and answers predictive-maintenance questions.
It is built for SPS 2026 (Messezentrum Nürnberg, 24–26 November 2026) in the Control-F corporate identity.

The page is published by GitHub Pages from `main` at **https://control-f-io.github.io/volley-vNN-preview/** once Pages
is switched on for this repository (see [Publishing](#publishing)). A change goes live a minute or two after it is merged
into `main`. The repository continues `DanielTea/volley-presentation` with its full history.

## What the page shows

0. **Hero and principle.** An isometric drawing of the stack: telemetry and language flow into one asset's memory
   capsule and volleys of spikes rise through the eleven levels. Under the key figures, four neurons that fire in turn
   follow a signal none of them could follow alone, which is where the name comes from.
1. **Architecture.** An interactive diagram of the spike-only stack: telemetry and byte encoders, the 512-channel
   spike stream, eleven levels of state reads and threshold cells, output neurons, and the per-asset memory capsule
   (read tape and fast synapses). A solid contour means *Measured · v16* and a dashed contour means *New in vNN*.
   **Auto-tour** steps through it, and every part is also listed by name beside it.
2. **Streaming.** Why a stream beats a window for telemetry, with two figures drawn from the research records: learned
   power-law forgetting (with a slope slider) and the fast-synapse gain growing as the square root of the text read.
3. **Industrial AI.** The loop of sense, predict, surprise, teach and answer, with surprise as the anomaly score.
4. **Asset console.** Three simulated assets with four streams each. Inject a fault, see which stream Volley finds first,
   and ask about status, root cause, maintenance timing and what the capsule has learned.
5. **Measured.** The enwik8 scores of every release from v11 to v16 against a same-size Transformer.
6. **Roadmap** and a pilot call to action that links to the contact page on control-f.io.

## Design system

The page is built on the **Control-F design system** published at
[control-f.io/design-system](https://www.control-f.io/design-system/), not on styles of its own. `assets/ds/` holds
an unmodified copy, taken on 22 November 2026, so the page does not depend on another site being up at the booth:

| File | From |
|---|---|
| `assets/ds/css/tokens.css`, `base.css`, `components.css` | `design-system/assets/css/` |
| `assets/ds/css/landing-v2.css` | the inline styles of the control-f.io landing page (section heads, spec rows) |
| `assets/ds/js/cf-nav.js` | `design-system/assets/js/` (the phone menu) |
| `assets/ds/fonts/Geist-Variable.woff2`, `GeistMono-Variable.woff2` | `design-system/assets/fonts/` (Geist, SIL Open Font License 1.1) |
| `assets/ds/img/logo/` | the white horizontal logo and the favicon |

The page loads one stylesheet from it, `assets/ds/css/cf.bundle.css`: the four sheets above joined with their comments
removed by `tools/build_css.py`. The comments make up most of the 1.3 MB, and the bundle is 248 KB (38 KB compressed)
with the same rules.

The page uses the system's own components: `cf-nav--v2`, `cf-hero`, `cf-section-header`, `cf-btn` (one primary per
screen), `cf-table`, `cf-accordion`, `cf-field__input`, `cf-icon` and `cf-footer--v2` with the foil title.
`assets/css/volley.css` adds only the page layer (prefix `vo-`) and uses tokens throughout. The drawings follow the
system's rules: contours in ink, 2:1 isometry, a 2 px corner and nothing round, one lime light per screen and never a
flat lime area, and the found state (an underline for every match, lime behind the current one) for the console's
deviations. Publica Sans is not licensed for the web yet, so headlines fall back to Geist, as they do on control-f.io.

To refresh the copy after the design system changes:

```bash
B=https://www.control-f.io/design-system/assets
for f in css/tokens.css css/base.css css/components.css js/cf-nav.js; do curl -fsSL "$B/$f" -o "assets/ds/$f"; done
python3 tools/build_css.py            # rebuild the bundle; --check only reports whether it is current
```

Then raise the `?v=` number on the stylesheet and script links in `index.html`, so browsers that kept the old files
fetch the new ones.

## Publishing

Switch GitHub Pages on once: Settings → Pages → *Build and deployment* → Source: **Deploy from a branch** → Branch:
**main**, folder **/ (root)** → Save. The site is plain HTML, CSS and JavaScript with no build step. `.nojekyll` makes
Pages serve the files unchanged.

To serve the page on a control-f.io address, for example `volley.control-f.io`:

1. Add a DNS record for the subdomain: `volley` CNAME `control-f-io.github.io`.
2. Settings → Pages → *Custom domain*: `volley.control-f.io` → Save. Tick **Enforce HTTPS** once GitHub has issued the
   certificate. The github.io address then redirects to the new one.
3. Replace the address in `og:image`, `og:url` and the canonical link at the top of `index.html`, so link previews use it.

## Booth mode

| Address | What it does |
|---|---|
| `…/volley-vNN-preview/?kiosk` | The architecture diagram tours itself, and the asset console injects faults, asks its questions, repairs the asset and moves to the next one. |
| `…/volley-vNN-preview/?kiosk=loop` | The same, and the page walks itself from stop to stop, longest at the console, then starts again from the top. |

The page is composed for a window of 1440 × 900. On a larger screen booth mode scales it up until that window fills the
screen: 1.2× on a 1920 × 1080 screen, 2.4× on a 4K panel. Text stays sharp and the charts are drawn at the screen's
resolution. Add `&zoom=1.5` to set the factor by hand, or `&zoom=1` to keep the page at its normal size. In booth mode
the blocks no longer fade in as they scroll, so every stop of the loop shows them complete.

A visitor's click pauses the console's autoplay for 45 seconds, and a touch, a key or the mouse wheel pauses the loop for
a minute. The **Booth autoplay** switch on the console's top bar starts the autoplay without the URL flag. The pause
button in the hero stops the hero animation.

For the booth screen, open the address full screen in Chrome or Edge, for example
`chrome --kiosk "https://control-f-io.github.io/volley-vNN-preview/?kiosk=loop"`.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Where the numbers come from

Every language number on the page comes from the ShuntFormer research repository,
[DanielTea/transformer-snn](https://github.com/DanielTea/transformer-snn): the
[v16 model card](https://github.com/DanielTea/transformer-snn/blob/main/models/spiking-byte-lm-v16/README.md),
[Long streams](https://github.com/DanielTea/transformer-snn/blob/main/docs/LONG_STREAMS.md),
[Stream form](https://github.com/DanielTea/transformer-snn/blob/main/docs/STREAM_FORM.md) and
`results/event_lm/long_streams/reading_curve.json`. The telemetry parts describe the vNN design. The asset console is a
browser simulation: its signals, its learning model and its answers are scripted, and the page says so wherever they appear.
