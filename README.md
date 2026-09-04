# Baiba Clock — "Our Time"

A precision time-dilation chronometer and poetic web experience exploring the subjective perception of relationship time.

Anchored to **August 26, 2026**, the clock captures the intense relativity of time where:
- **1 week feels like 1 year** ($52.18\times$ speed)
- **9 days feels like 20 years** ($811.65\times$ speed)

A continuous non-linear power-law slider seamlessly shifts reality from **Real Time** (1.0×) to **"Our Time"** (20+ years today), complete with microsecond precision and an ambient background featuring abstracted rural Soviet farm flecks and surreal animated goats, dogs, and cats whose motion dilates in lockstep with the clock.

---

## Features

1. **Precision Ticker (Microsecond Resolution)**:
   - High-resolution counter tracking **Years, Days, Hours, Minutes, Seconds, Milliseconds, and Microseconds** ($10^{-6}\text{ s}$).
   - Stable tabular numbers with **Avenir Next Light** typography.
2. **Base-10 Decadic Bins ($10^0$ to $10^{15}\,\mu\text{s}$)**:
   - Toggle to inspect elapsed duration in pure metric decimal bins from individual microseconds up to gigaseconds.
3. **Power-Law Dilation Slider**:
   - Continuous slider blending from objective real time to subjective relationship time.
   - Live speed multiplier and calendar date projection readout.
4. **Time-Warp Simulator**:
   - Test how time feels at exact milestones (e.g., 1 day, 7 days, 9 days, 14 days, 30 days).
5. **Surreal Soviet Farm Canvas**:
   - Minimalist, abstracted flecks of rye chaff and birch bark drifting gently in the breeze.
   - Stylized goats, three dogs (including a golden retriever), and four cats running in an infinite surreal loop whose pace, stride frequency, and relativistic motion trails dynamically warp as time accelerates.
   - **Seasonal Botanical Lifecycle**: Stylized birch trees and meadow rye that grow, flourish, turn golden autumn amber, shed drifting leaf flurries, and undergo winter dormancy—evolving at a tranquil meditative pace in Real Time and accelerating into rapid seasonal year-cycles under high time dilation.
6. **Zero-Dependency Architecture**:
   - Pure Vanilla HTML5, CSS3, and JavaScript. Fast, lightweight, and works natively in any modern browser without build tools.

---

## Running Locally

To preview the website locally:

```bash
# Using Python
python3 -m http.server 8080

# Or using Node
npx serve .
```

Then open `http://localhost:8080` in your web browser.

---

## Hosting & Deployment

Because this project is built entirely with static files (`index.html`, `style.css`, `app.js`), you can host it for free anywhere:

### 1. GitHub Pages (Recommended)
1. Push this directory to a GitHub repository (e.g. `Baiba_clock`).
2. Go to repository **Settings** > **Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/ (root)`.
4. Click **Save**. Your site will be live at `https://<your-username>.github.io/Baiba_clock/`.

### 2. Vercel
1. Install Vercel CLI: `npm i -g vercel` or link your GitHub repository on [vercel.com](https://vercel.com).
2. Run `vercel` in this directory to deploy in seconds.

### 3. Netlify
1. Drag and drop the `Baiba_clock` folder directly into the [Netlify Drop](https://app.netlify.com/drop) dashboard, or connect via Git.

### 4. Cloudflare Pages
1. Connect your repository on Cloudflare Pages and set the build output directory to `/`.
