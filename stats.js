(function (root) {
  "use strict";

  function parseData(text) {
    const tokens = String(text)
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const values = [];
    const invalid = [];
    for (const t of tokens) {
      const n = Number(t);
      if (Number.isFinite(n)) values.push({ value: n, raw: t });
      else invalid.push(t);
    }
    return { values: values.map((v) => v.value), raw: values.map((v) => v.raw), invalid };
  }

  function decimalPlaces(raw) {
    const s = String(raw).toLowerCase();
    if (s.includes("e")) {
      const [base, exp] = s.split("e");
      return Math.max(0, decimalPlaces(base) - Number(exp));
    }
    const dot = s.indexOf(".");
    return dot === -1 ? 0 : s.length - dot - 1;
  }

  function maxDecimalPlaces(rawValues) {
    return rawValues.reduce((m, r) => Math.max(m, decimalPlaces(r)), 0);
  }

  function round(x, places) {
    if (!Number.isFinite(x)) return x;
    const f = Math.pow(10, places);
    return Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f;
  }

  function fmt(x, places) {
    if (!Number.isFinite(x)) return String(x);
    return round(x, places).toFixed(places);
  }

  function sum(values) {
    return values.reduce((a, b) => a + b, 0);
  }

  function mean(values) {
    return sum(values) / values.length;
  }

  function range(values) {
    return Math.max(...values) - Math.min(...values);
  }

  function median(values) {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  /**
   * Full step-by-step spread calculation.
   * kind: "sample" (divide by n - 1) or "population" (divide by N).
   */
  function spread(values, kind) {
    const n = values.length;
    if (n === 0) throw new Error("No data.");
    if (kind === "sample" && n < 2) throw new Error("A sample needs at least 2 values.");
    const m = mean(values);
    const rows = values.map((x) => {
      const dev = x - m;
      return { x, dev, sq: dev * dev };
    });
    const ss = sum(rows.map((r) => r.sq));
    const divisor = kind === "sample" ? n - 1 : n;
    const variance = ss / divisor;
    const sd = Math.sqrt(variance);
    return {
      kind,
      n,
      sum: sum(values),
      mean: m,
      min: Math.min(...values),
      max: Math.max(...values),
      range: range(values),
      median: median(values),
      rows,
      sumSquares: ss,
      divisor,
      variance,
      sd,
      cv: m === 0 ? NaN : (sd / m) * 100,
    };
  }

  function coefficientOfVariation(sd, m) {
    if (m === 0) return NaN;
    return (sd / m) * 100;
  }

  // Cumulative percent of data BELOW mean + z*sd under the 68-95-99.7 rule.
  const EMPIRICAL_BELOW = { "-3": 0.15, "-2": 2.5, "-1": 16, "0": 50, "1": 84, "2": 97.5, "3": 99.85 };

  function zScore(x, m, sd) {
    return (x - m) / sd;
  }

  function empiricalBelow(z) {
    const k = Math.round(z);
    if (Math.abs(z - k) > 1e-9 || Math.abs(k) > 3) return null;
    return EMPIRICAL_BELOW[String(k === 0 ? 0 : k)];
  }

  /**
   * mode: "below" (less than / no more than), "above" (greater than / at least),
   *       "between" (between x and x2)
   */
  function empirical(m, sd, mode, x, x2) {
    if (!(sd > 0)) throw new Error("Standard deviation must be positive.");
    const z1 = zScore(x, m, sd);
    const b1 = empiricalBelow(z1);
    if (b1 === null) {
      throw new Error(
        `${x} is ${round(z1, 4)} standard deviations from the mean. The Empirical Rule only handles whole numbers of standard deviations from -3 to 3.`
      );
    }
    if (mode === "below") return { z1, percent: b1 };
    if (mode === "above") return { z1, percent: round(100 - b1, 4) };
    const z2 = zScore(x2, m, sd);
    const b2 = empiricalBelow(z2);
    if (b2 === null) {
      throw new Error(
        `${x2} is ${round(z2, 4)} standard deviations from the mean. The Empirical Rule only handles whole numbers of standard deviations from -3 to 3.`
      );
    }
    return { z1, z2, percent: round(Math.abs(b2 - b1), 4) };
  }

  function chebyshevPercent(k) {
    if (!(k > 1)) throw new Error("k must be greater than 1.");
    return (1 - 1 / (k * k)) * 100;
  }

  function chebyshevK(percent) {
    const p = percent / 100;
    if (!(p > 0 && p < 1)) throw new Error("Percent must be between 0 and 100.");
    return Math.sqrt(1 / (1 - p));
  }

  function chebyshevBounds(m, sd, k) {
    return { lower: m - k * sd, upper: m + k * sd };
  }

  // Standard normal density, used only for drawing the bell curve.
  function normalPdf(x, m, sd) {
    const z = (x - m) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }

  function histogramBins(values, binCount) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = binCount || Math.max(1, Math.ceil(Math.log2(values.length) + 1));
    const width = max === min ? 1 : (max - min) / count;
    const bins = Array.from({ length: count }, (_, i) => ({
      from: min + i * width,
      to: min + (i + 1) * width,
      count: 0,
    }));
    for (const v of values) {
      let i = Math.floor((v - min) / width);
      if (i >= count) i = count - 1;
      bins[i].count++;
    }
    return bins;
  }

  /**
   * Frequency table from class limits.
   * classes: [{ lower, upper, freq }] in ascending order.
   * gap = next lower limit − this upper limit; boundaries sit halfway across the gap.
   */
  function frequencyTable(classes) {
    if (!classes.length) throw new Error("Add at least one class.");
    for (const [i, c] of classes.entries()) {
      if (![c.lower, c.upper, c.freq].every(Number.isFinite)) throw new Error(`Class ${i + 1} is missing a number.`);
      if (c.upper < c.lower) throw new Error(`Class ${i + 1}: upper limit is below the lower limit.`);
      if (c.freq < 0) throw new Error(`Class ${i + 1}: frequency can't be negative.`);
    }
    const gaps = classes.slice(1).map((c, i) => c.lower - classes[i].upper);
    const gap = gaps.length ? gaps[0] : 0;
    const width = classes.length > 1 ? classes[1].lower - classes[0].lower : classes[0].upper - classes[0].lower + gap;
    const total = sum(classes.map((c) => c.freq));
    let cum = 0;
    const rows = classes.map((c, i) => {
      cum += c.freq;
      const gapBelow = i > 0 ? gaps[i - 1] : gap;
      const gapAbove = i < gaps.length ? gaps[i] : gap;
      return {
        index: i + 1,
        lower: c.lower,
        upper: c.upper,
        freq: c.freq,
        gapBelow,
        gapAbove,
        lowerBoundary: c.lower - gapBelow / 2,
        upperBoundary: c.upper + gapAbove / 2,
        midpoint: (c.lower + c.upper) / 2,
        relFreq: total ? c.freq / total : NaN,
        cumFreq: cum,
      };
    });
    const widths = classes.slice(1).map((c, i) => c.lower - classes[i].lower);
    return {
      rows,
      total,
      gap,
      width,
      uniformWidth: widths.every((w) => Math.abs(w - widths[0]) < 1e-9),
      uniformGap: gaps.every((g) => Math.abs(g - gap) < 1e-9),
    };
  }

  /**
   * Build class limits from raw data with k classes.
   * Width = range ÷ k rounded UP to the data's precision unit; if it divides evenly, add one unit
   * so the maximum still lands inside the last class.
   */
  function buildClasses(values, rawValues, k) {
    if (values.length < 2) throw new Error("Enter at least 2 data values.");
    if (!(Number.isInteger(k) && k >= 1)) throw new Error("Number of classes must be a whole number ≥ 1.");
    const places = maxDecimalPlaces(rawValues);
    const unit = Math.pow(10, -places);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const raw = (max - min) / k;
    const units = raw / unit;
    const exact = Math.abs(units - Math.round(units)) < 1e-9;
    const width = round((exact ? Math.round(units) + 1 : Math.ceil(units)) * unit, places);
    const classes = [];
    for (let i = 0; i < k; i++) {
      const lower = round(min + i * width, places);
      const upper = round(lower + width - unit, places);
      const freq = values.filter((v) => v >= lower - 1e-9 && v <= upper + 1e-9).length;
      classes.push({ lower, upper, freq });
    }
    return { classes, min, max, rawWidth: raw, width, unit, places, exact };
  }

  function sortAsc(values) {
    return [...values].sort((a, b) => a - b);
  }

  /** Mode(s) with a frequency table and classification (No mode / Unimodal / Bimodal / Multimodal). */
  function mode(values) {
    const counts = new Map();
    for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
    const table = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([value, freq]) => ({ value, freq }));
    const maxFreq = Math.max(...table.map((t) => t.freq));
    const allSame = table.every((t) => t.freq === maxFreq);
    const modes = allSame ? [] : table.filter((t) => t.freq === maxFreq).map((t) => t.value);
    const type = modes.length === 0 ? "No mode" : modes.length === 1 ? "Unimodal" : modes.length === 2 ? "Bimodal" : "Multimodal";
    return { table, maxFreq, modes, type };
  }

  /** Median with the position used: (n + 1) / 2 in the sorted list. */
  function medianSteps(values) {
    const s = sortAsc(values);
    const n = s.length;
    const pos = (n + 1) / 2;
    if (n % 2) return { sorted: s, n, pos, positions: [pos], median: s[pos - 1] };
    return { sorted: s, n, pos, positions: [n / 2, n / 2 + 1], median: (s[n / 2 - 1] + s[n / 2]) / 2 };
  }

  /**
   * Pth percentile.
   * method "locator": L = (P/100)·n; if L is whole, average the Lth and (L+1)th values, else round L up.
   * method "interp":  L = (P/100)·(n + 1); interpolate between neighbouring values.
   */
  function percentile(values, p, method) {
    const s = sortAsc(values);
    const n = s.length;
    if (!(p > 0 && p < 100)) throw new Error("Percentile must be between 0 and 100.");
    if (method === "interp") {
      const L = (p / 100) * (n + 1);
      if (L <= 1) return { value: s[0], L, method, note: "L ≤ 1, so use the smallest value", sorted: s };
      if (L >= n) return { value: s[n - 1], L, method, note: "L ≥ n, so use the largest value", sorted: s };
      const lo = Math.floor(L);
      const frac = L - lo;
      const value = s[lo - 1] + frac * (s[lo] - s[lo - 1]);
      return { value, L, lo, frac, method, sorted: s };
    }
    const L = (p / 100) * n;
    const whole = Math.abs(L - Math.round(L)) < 1e-9;
    if (whole) {
      const k = Math.round(L);
      const value = k >= n ? s[n - 1] : (s[k - 1] + s[k]) / 2;
      return { value, L, whole, k, method, sorted: s };
    }
    const k = Math.ceil(L);
    return { value: s[k - 1], L, whole, k, method, sorted: s };
  }

  /** Percentile rank of x: (number of values below x) ÷ n × 100. */
  function percentileRank(values, x) {
    const below = values.filter((v) => v < x).length;
    return { below, n: values.length, rank: (below / values.length) * 100 };
  }

  function geometricMean(values) {
    if (values.some((v) => v <= 0)) throw new Error("Geometric mean needs all values > 0.");
    return Math.exp(sum(values.map(Math.log)) / values.length);
  }

  function harmonicMean(values) {
    if (values.some((v) => v <= 0)) throw new Error("Harmonic mean needs all values > 0.");
    return values.length / sum(values.map((v) => 1 / v));
  }

  function midrange(values) {
    return (Math.max(...values) + Math.min(...values)) / 2;
  }

  /** Replace the lowest and highest k = floor(n·pct/100) values with their nearest kept neighbours. */
  function winsorize(values, pct) {
    const s = sortAsc(values);
    const n = s.length;
    const k = Math.floor((n * pct) / 100);
    if (2 * k >= n) throw new Error("Too much trimming for this many values.");
    const w = s.map((v, i) => (i < k ? s[k] : i >= n - k ? s[n - 1 - k] : v));
    return { k, sorted: s, winsorized: w, mean: mean(w) };
  }

  function weightedMean(pairs) {
    if (!pairs.length) throw new Error("Add at least one weight and value.");
    const products = pairs.map((p) => p.w * p.x);
    const sumWX = sum(products);
    const sumW = sum(pairs.map((p) => p.w));
    if (sumW === 0) throw new Error("The weights add up to 0.");
    return { products, sumWX, sumW, mean: sumWX / sumW };
  }

  /** k-period moving average ending at index i (uses values i−k+1 … i). */
  function movingAverage(series, k, i) {
    if (!(Number.isInteger(k) && k >= 2)) throw new Error("Use a period of 2 or more.");
    if (i < k - 1) return null;
    const window = series.slice(i - k + 1, i + 1);
    return { window, total: sum(window), value: sum(window) / k };
  }

  /** Missing value when the mean of all n values is known. */
  function missingValue(m, n, known) {
    if (!(Number.isInteger(n) && n > known.length)) throw new Error("Total count must be larger than the number of known values.");
    const total = m * n;
    const knownSum = sum(known);
    const missingCount = n - known.length;
    return { total, knownSum, missingCount, value: (total - knownSum) / missingCount };
  }

  const Stats = {
    sortAsc,
    mode,
    medianSteps,
    percentile,
    percentileRank,
    geometricMean,
    harmonicMean,
    midrange,
    winsorize,
    weightedMean,
    movingAverage,
    missingValue,
    frequencyTable,
    buildClasses,
    parseData,
    decimalPlaces,
    maxDecimalPlaces,
    round,
    fmt,
    sum,
    mean,
    median,
    range,
    spread,
    coefficientOfVariation,
    zScore,
    empiricalBelow,
    empirical,
    chebyshevPercent,
    chebyshevK,
    chebyshevBounds,
    normalPdf,
    histogramBins,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Stats;
  root.Stats = Stats;
})(typeof globalThis !== "undefined" ? globalThis : this);
