# Spread & Variation Lab

An interactive statistics study app that runs entirely in the browser. Enter your data and it calculates the answer, shows every step of the work, and graphs the result. Hover over almost anything to see a short explanation of how to calculate it, filled in with your own numbers.

**Live app: [kemckai.github.io/Statistics_app](https://kemckai.github.io/Statistics_app/)**

No installs, no build step, no dependencies — just open `index.html`.

## Features

| Tab | What it does |
|---|---|
| **Spread** | Range, sample/population variance and standard deviation, coefficient of variation, mean, median and mode. Shows the full deviation table (x, x − x̄, (x − x̄)²), applies the "one more decimal place than the data" rounding rule, and draws a dot plot with ±1/2/3 standard deviation bands plus a histogram. Load data by typing, pasting, or from a CSV file. |
| **Location** | Mean, median and mode (no mode / unimodal / bimodal / multimodal) with steps; quartiles, quintiles, deciles, any percentile and percentile rank (two textbook methods); geometric, harmonic, midrange, trimean and winsorized means; a box plot; and a skewness helper that tells you which letter on a graph is the mean, median and mode. |
| **Averages** | Weighted mean, k-period moving averages (with a trend chart), and finding a missing value when the mean is known. |
| **Frequency Table** | Class width, gaps, lower/upper class boundaries, midpoints, relative and cumulative frequency, with a step-by-step "answer a question" panel and a boundary-based histogram. Can build classes from raw data. |
| **Coefficient of Variation** | Compare the consistency of two or more groups from raw data or a given mean and standard deviation. |
| **Empirical Rule** | 68–95–99.7 questions ("less than", "at least", "between") with a shaded bell curve. |
| **Chebyshev** | Solve for k, the percentage, or the interval μ ± kσ, for any distribution shape. |
| **Study Guide** | Vocabulary, rounding rule, discrete vs. continuous data, frequency-table terms, which rule to use, and a test-taking checklist. |

Hover tips can be switched off with the checkbox at the top of the page.

## Running it

Open `index.html` in any modern browser. Or serve the folder locally:

```bash
python3 -m http.server 8765
# then visit http://127.0.0.1:8765
```

## Tests

The math lives in `stats.js` and is covered by Node's built-in test runner (Node 18+):

```bash
node --test stats.test.js
```

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Page layout and tabs |
| `styles.css` | Styling |
| `stats.js` | All statistics calculations (works in the browser and in Node) |
| `charts.js` | SVG charts (dot plot, histograms, bell curve, box plot, skew curve, line chart) |
| `tips.js` | Hover-tooltip text and behaviour |
| `app.js` | Wires inputs to calculations, step-by-step explanations and charts |
| `stats.test.js` | Unit tests for `stats.js` |

## Notes

- Percentile methods differ between textbooks and calculators. The default is L = (P/100)·n (round up, or average two values when L is whole); switch to the (n + 1) interpolation method on the Location tab if your class uses it.
- When an answer is already exact (e.g. a mean of 2), it's shown without padded zeros; otherwise answers follow the "one more decimal place than the data" rule.
