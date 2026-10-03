(function (root) {
  "use strict";

  const COLORS = {
    axis: "#64748b",
    text: "#334155",
    accent: "#2563eb",
    accent2: "#db2777",
    band1: "rgba(37, 99, 235, 0.22)",
    band2: "rgba(37, 99, 235, 0.12)",
    band3: "rgba(37, 99, 235, 0.06)",
    shade: "rgba(219, 39, 119, 0.35)",
    good: "#16a34a",
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  function tip(key, calc) {
    return ` data-tip="${key}"${calc ? ` data-tip-calc="${esc(calc)}"` : ""}`;
  }

  function niceNum(x) {
    return Number.isInteger(x) ? String(x) : String(Number(x.toPrecision(6)));
  }

  function scale(d0, d1, r0, r1) {
    const span = d1 - d0 || 1;
    return (v) => r0 + ((v - d0) / span) * (r1 - r0);
  }

  function svg(width, height, body) {
    return `<svg viewBox="0 0 ${width} ${height}" class="chart" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;
  }

  function sdBands(x, m, sd, top, bottom, maxK) {
    let out = "";
    const fills = [COLORS.band3, COLORS.band2, COLORS.band1];
    for (let k = maxK; k >= 1; k--) {
      const x0 = x(m - k * sd);
      const x1 = x(m + k * sd);
      const calc = `${m.toFixed(4).replace(/\.?0+$/, "")} ± ${k} × ${sd.toFixed(4).replace(/\.?0+$/, "")} → ${(m - k * sd).toFixed(2)} to ${(m + k * sd).toFixed(2)}`;
      out += `<rect x="${x0}" y="${top}" width="${Math.max(0, x1 - x0)}" height="${bottom - top}" fill="${fills[3 - k]}"${tip(`band-${k}`, calc)}/>`;
    }
    return out;
  }

  function sdTicks(x, m, sd, y, maxK, places) {
    let out = "";
    for (let k = -maxK; k <= maxK; k++) {
      const v = m + k * sd;
      const label = k === 0 ? "x̄" : `${k > 0 ? "+" : "−"}${Math.abs(k)}s`;
      const calc = k === 0 ? `mean = ${v.toFixed(places)}` : `${m.toFixed(places)} ${k > 0 ? "+" : "−"} ${Math.abs(k)} × ${sd.toFixed(places)} = ${v.toFixed(places)}`;
      out += `<g${tip(k === 0 ? "mean-line" : "sd-tick", calc)}>`;
      out += `<rect x="${x(v) - 18}" y="${y}" width="36" height="34" fill="transparent"/>`;
      out += `<line x1="${x(v)}" y1="${y}" x2="${x(v)}" y2="${y + 6}" stroke="${COLORS.axis}"/>`;
      out += `<text x="${x(v)}" y="${y + 18}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${esc(label)}</text>`;
      out += `<text x="${x(v)}" y="${y + 31}" text-anchor="middle" font-size="10" fill="${COLORS.axis}">${esc(v.toFixed(places))}</text>`;
      out += `</g>`;
    }
    return out;
  }

  /** Stacked dot plot with mean line and ±1/2/3 standard deviation bands. */
  function dotPlot(values, m, sd, places) {
    const W = 720, H = 260, padL = 30, padR = 30, axisY = 190;
    const lo = Math.min(Math.min(...values), m - 3 * sd);
    const hi = Math.max(Math.max(...values), m + 3 * sd);
    const x = scale(lo, hi, padL, W - padR);

    const counts = new Map();
    const sorted = [...values].sort((a, b) => a - b);
    let dots = "";
    const maxStack = Math.max(...sorted.map((v) => sorted.filter((u) => u === v).length));
    const r = Math.max(3, Math.min(7, 150 / Math.max(1, maxStack) / 2.2));
    for (const v of sorted) {
      const c = counts.get(v) || 0;
      counts.set(v, c + 1);
      dots += `<circle cx="${x(v)}" cy="${axisY - r - 2 - c * (2 * r + 1)}" r="${r}" fill="${COLORS.accent}" opacity="0.85"${tip("dot", `x = ${niceNum(v)}\nz = (${niceNum(v)} − ${m.toFixed(places + 2)}) ÷ ${sd.toFixed(places + 2)} = ${((v - m) / sd).toFixed(2)}`)}/>`;
    }

    const body =
      sdBands(x, m, sd, 20, axisY, 3) +
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<g${tip("mean-line", `mean = ${m.toFixed(places)}`)}>` +
      `<line x1="${x(m)}" y1="14" x2="${x(m)}" y2="${axisY}" stroke="transparent" stroke-width="12"/>` +
      `<line x1="${x(m)}" y1="14" x2="${x(m)}" y2="${axisY}" stroke="${COLORS.accent2}" stroke-width="2" stroke-dasharray="5 3"/>` +
      `<text x="${x(m)}" y="11" text-anchor="middle" font-size="11" fill="${COLORS.accent2}">mean = ${esc(m.toFixed(places))}</text>` +
      `</g>` +
      dots +
      sdTicks(x, m, sd, axisY, 3, places);
    return svg(W, H, body);
  }

  /** Histogram of the data with a mean marker. */
  function histogram(values, m, sd, places) {
    const W = 720, H = 260, padL = 40, padR = 20, padT = 20, axisY = 210;
    const bins = Stats.histogramBins(values);
    const maxCount = Math.max(...bins.map((b) => b.count));
    const x = scale(bins[0].from, bins[bins.length - 1].to, padL, W - padR);
    const y = scale(0, maxCount, axisY, padT);
    let bars = "";
    for (const b of bins) {
      const x0 = x(b.from), x1 = x(b.to);
      bars += `<rect x="${x0 + 1}" y="${y(b.count)}" width="${Math.max(0, x1 - x0 - 2)}" height="${axisY - y(b.count)}" fill="${COLORS.accent}" opacity="0.8"${tip("bar", `${b.from.toFixed(places)} to ${b.to.toFixed(places)}: ${b.count} value${b.count === 1 ? "" : "s"}\nbin width = (${bins[bins.length - 1].to.toFixed(places)} − ${bins[0].from.toFixed(places)}) ÷ ${bins.length} = ${(b.to - b.from).toFixed(places)}`)}/>`;
      if (b.count > 0) bars += `<text x="${(x0 + x1) / 2}" y="${y(b.count) - 4}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${b.count}</text>`;
    }
    let ticks = "";
    for (const b of bins) {
      ticks += `<text x="${x(b.from)}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="${COLORS.axis}">${esc(b.from.toFixed(places))}</text>`;
    }
    const last = bins[bins.length - 1];
    ticks += `<text x="${x(last.to)}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="${COLORS.axis}">${esc(last.to.toFixed(places))}</text>`;
    const mx = x(m);
    const body =
      bars +
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="10" fill="${COLORS.axis}">${maxCount}</text>` +
      `<text x="${padL - 6}" y="${axisY}" text-anchor="end" font-size="10" fill="${COLORS.axis}">0</text>` +
      (mx >= padL && mx <= W - padR
        ? `<g${tip("mean-line", `mean = ${m.toFixed(places)}`)}>` +
          `<line x1="${mx}" y1="${padT - 6}" x2="${mx}" y2="${axisY}" stroke="transparent" stroke-width="12"/>` +
          `<line x1="${mx}" y1="${padT - 6}" x2="${mx}" y2="${axisY}" stroke="${COLORS.accent2}" stroke-width="2" stroke-dasharray="5 3"/>` +
          `<text x="${mx}" y="${padT - 9}" text-anchor="middle" font-size="11" fill="${COLORS.accent2}">mean</text></g>`
        : "") +
      ticks +
      `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${COLORS.text}">Frequency histogram</text>`;
    return svg(W, H + 10, body);
  }

  /** Bell curve labelled with 68-95-99.7 regions; shades [a, b] (use ±Infinity for tails). */
  function bellCurve(m, sd, a, b, places) {
    const W = 720, H = 290, padL = 30, padR = 30, axisY = 220, top = 40;
    const lo = m - 3.6 * sd, hi = m + 3.6 * sd;
    const x = scale(lo, hi, padL, W - padR);
    const peak = Stats.normalPdf(m, m, sd);
    const y = (v) => axisY - (Stats.normalPdf(v, m, sd) / peak) * (axisY - top);

    const pts = [];
    const steps = 240;
    for (let i = 0; i <= steps; i++) {
      const v = lo + ((hi - lo) * i) / steps;
      pts.push(`${x(v).toFixed(2)},${y(v).toFixed(2)}`);
    }
    const curve = `<polyline points="${pts.join(" ")}" fill="none" stroke="${COLORS.accent}" stroke-width="2.5"/>`;

    let shade = "";
    if (a !== undefined && b !== undefined) {
      const s0 = Math.max(lo, a), s1 = Math.min(hi, b);
      if (s1 > s0) {
        const sp = [`${x(s0)},${axisY}`];
        for (let i = 0; i <= steps; i++) {
          const v = s0 + ((s1 - s0) * i) / steps;
          sp.push(`${x(v).toFixed(2)},${y(v).toFixed(2)}`);
        }
        sp.push(`${x(s1)},${axisY}`);
        shade = `<polygon points="${sp.join(" ")}" fill="${COLORS.shade}"/>`;
      }
    }

    let lines = "";
    for (let k = -3; k <= 3; k++) {
      const v = m + k * sd;
      lines += `<line x1="${x(v)}" y1="${y(v)}" x2="${x(v)}" y2="${axisY}" stroke="${COLORS.axis}" stroke-dasharray="3 3" opacity="0.7"/>`;
    }
    const regions = [
      [-3.6, -3, "0.15%"], [-3, -2, "2.35%"], [-2, -1, "13.5%"], [-1, 0, "34%"],
      [0, 1, "34%"], [1, 2, "13.5%"], [2, 3, "2.35%"], [3, 3.6, "0.15%"],
    ];
    let labels = "";
    let hits = "";
    for (const [k0, k1, t] of regions) {
      const a0 = m + k0 * sd, a1 = m + k1 * sd;
      const edge = (k) => (Math.abs(k) === 3.6 ? (k < 0 ? "−∞" : "+∞") : (m + k * sd).toFixed(places));
      hits += `<rect x="${x(a0)}" y="${top - 10}" width="${x(a1) - x(a0)}" height="${axisY - top + 10}" fill="transparent"${tip(`bell-${t.replace("%", "")}`, `${edge(k0)} to ${edge(k1)} holds about ${t}`)}/>`;
      const mid = m + ((k0 + k1) / 2) * sd;
      const ly = Math.abs(k0 + k1) / 2 < 1.5 ? axisY - 30 : axisY - 12;
      labels += `<text x="${x(mid)}" y="${ly}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${t}</text>`;
    }
    const body =
      shade +
      lines +
      curve +
      labels +
      hits +
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      sdTicks(x, m, sd, axisY, 3, places).replace(/x̄/g, "μ").replace(/s</g, "σ<");
    return svg(W, H, body);
  }

  /** Number line showing the Chebyshev interval mean ± k·sd, with optional data dots. */
  function chebyshevLine(m, sd, k, percent, places, values) {
    const W = 720, H = 170, padL = 40, padR = 40, axisY = 110;
    const lower = m - k * sd, upper = m + k * sd;
    let lo = lower - 0.25 * k * sd, hi = upper + 0.25 * k * sd;
    if (values && values.length) {
      lo = Math.min(lo, Math.min(...values));
      hi = Math.max(hi, Math.max(...values));
    }
    const x = scale(lo, hi, padL, W - padR);
    let dots = "";
    if (values && values.length) {
      for (const v of values) {
        const inside = v >= lower && v <= upper;
        dots += `<circle cx="${x(v)}" cy="${axisY - 14}" r="4" fill="${inside ? COLORS.good : COLORS.accent2}" opacity="0.7"${tip("dot", `x = ${niceNum(v)} (${inside ? "inside" : "outside"} the interval)\nz = ${((v - m) / sd).toFixed(2)}`)}/>`;
      }
    }
    const body =
      `<rect x="${x(lower)}" y="${axisY - 40}" width="${x(upper) - x(lower)}" height="40" fill="${COLORS.band1}" rx="4"${tip("ch-bounds", `${m.toFixed(places)} − ${k} × ${sd.toFixed(places)} = ${lower.toFixed(places)}\n${m.toFixed(places)} + ${k} × ${sd.toFixed(places)} = ${upper.toFixed(places)}`)}/>` +
      `<text x="${(x(lower) + x(upper)) / 2}" y="${axisY - 48}" text-anchor="middle" font-size="13" font-weight="600" fill="${COLORS.accent}">at least ${esc(percent)} of data</text>` +
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      dots +
      [[lower, "μ − kσ"], [m, "μ"], [upper, "μ + kσ"]]
        .map(
          ([v, t]) =>
            `<line x1="${x(v)}" y1="${axisY - 40}" x2="${x(v)}" y2="${axisY + 6}" stroke="${v === m ? COLORS.accent2 : COLORS.accent}" stroke-width="2"/>` +
            `<text x="${x(v)}" y="${axisY + 22}" text-anchor="middle" font-size="12" fill="${COLORS.text}">${t}</text>` +
            `<text x="${x(v)}" y="${axisY + 38}" text-anchor="middle" font-size="11" fill="${COLORS.axis}">${esc(v.toFixed(places))}</text>`
        )
        .join("");
    return svg(W, H, body);
  }

  /** Side-by-side CV bars; the lower bar is highlighted as more consistent. */
  function cvBars(items) {
    const W = 720, rowH = 46, padL = 150, padR = 90;
    const H = items.length * rowH + 20;
    const max = Math.max(...items.map((i) => i.cv), 1);
    const x = scale(0, max, padL, W - padR);
    const minCv = Math.min(...items.map((i) => i.cv));
    const body = items
      .map((it, idx) => {
        const yy = 10 + idx * rowH;
        const best = it.cv === minCv;
        return (
          `<text x="${padL - 10}" y="${yy + 24}" text-anchor="end" font-size="13" fill="${COLORS.text}">${esc(it.label)}</text>` +
          `<rect x="${padL}" y="${yy + 6}" width="${Math.max(2, x(it.cv) - padL)}" height="28" rx="4" fill="${best ? COLORS.good : COLORS.accent}" opacity="0.85"${tip("cv-bar", `(${Number(it.sd.toFixed(4))} ÷ ${Number(it.m.toFixed(4))}) × 100 = ${it.cvText}`)}/>` +
          `<text x="${x(it.cv) + 8}" y="${yy + 25}" font-size="13" font-weight="600" fill="${COLORS.text}">${esc(it.cvText)}</text>`
        );
      })
      .join("");
    return svg(W, H, body);
  }

  /** Histogram of a frequency table: bars span lower to upper class boundary. */
  function freqHistogram(rows) {
    const W = 720, H = 280, padL = 44, padR = 20, padT = 24, axisY = 220;
    const fmt = (v) => String(Number(v.toFixed(6)));
    const lo = rows[0].lowerBoundary, hi = rows[rows.length - 1].upperBoundary;
    const maxF = Math.max(1, ...rows.map((r) => r.freq));
    const x = scale(lo, hi, padL, W - padR);
    const y = scale(0, maxF, axisY, padT);
    let bars = "", ticks = "";
    rows.forEach((r, i) => {
      const x0 = x(r.lowerBoundary), x1 = x(r.upperBoundary);
      bars += `<rect x="${x0}" y="${y(r.freq)}" width="${Math.max(0, x1 - x0)}" height="${axisY - y(r.freq)}" fill="${COLORS.accent}" opacity="${0.6 + 0.3 * (i % 2)}" stroke="white"${tip("freq-bar", `Class ${i + 1}: ${fmt(r.lower)} – ${fmt(r.upper)}\nboundaries ${fmt(r.lowerBoundary)} to ${fmt(r.upperBoundary)}\nfrequency = ${fmt(r.freq)}, cumulative = ${fmt(r.cumFreq)}`)}/>`;
      bars += `<text x="${(x0 + x1) / 2}" y="${y(r.freq) - 5}" text-anchor="middle" font-size="12" fill="${COLORS.text}">${fmt(r.freq)}</text>`;
      ticks += `<text x="${x0}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="${COLORS.axis}">${fmt(r.lowerBoundary)}</text>`;
      ticks += `<text x="${(x0 + x1) / 2}" y="${axisY + 32}" text-anchor="middle" font-size="10" fill="${COLORS.text}">${fmt(r.lower)}–${fmt(r.upper)}</text>`;
    });
    ticks += `<text x="${x(hi)}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="${COLORS.axis}">${fmt(hi)}</text>`;
    const body =
      bars +
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="10" fill="${COLORS.axis}">${maxF}</text>` +
      `<text x="${padL - 6}" y="${axisY}" text-anchor="end" font-size="10" fill="${COLORS.axis}">0</text>` +
      ticks +
      `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${COLORS.text}">Class boundaries (top row) and class limits (bottom row)</text>`;
    return svg(W, H, body);
  }

  /** Box plot from the five-number summary. */
  function boxPlot(min, q1, q2, q3, max) {
    const W = 720, H = 130, padL = 40, padR = 40, midY = 50;
    const fmt = (v) => String(Number(v.toFixed(6)));
    const x = scale(min, max === min ? min + 1 : max, padL, W - padR);
    const pts = [[min, "Min", "min-max"], [q1, "Q1", "quartiles"], [q2, "Median", "loc-median"], [q3, "Q3", "quartiles"], [max, "Max", "min-max"]];
    let labels = "";
    pts.forEach(([v, t, key], i) => {
      const ly = i % 2 ? 108 : 94;
      labels += `<g${tip(key, `${t} = ${fmt(v)}`)}><text x="${x(v)}" y="${ly}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${t}</text>` +
        `<text x="${x(v)}" y="${ly + 13}" text-anchor="middle" font-size="10" fill="${COLORS.axis}">${fmt(v)}</text></g>`;
    });
    const body =
      `<line x1="${x(min)}" y1="${midY}" x2="${x(q1)}" y2="${midY}" stroke="${COLORS.axis}" stroke-width="2"/>` +
      `<line x1="${x(q3)}" y1="${midY}" x2="${x(max)}" y2="${midY}" stroke="${COLORS.axis}" stroke-width="2"/>` +
      `<line x1="${x(min)}" y1="${midY - 12}" x2="${x(min)}" y2="${midY + 12}" stroke="${COLORS.axis}" stroke-width="2"${tip("min-max", `Min = ${fmt(min)}`)}/>` +
      `<line x1="${x(max)}" y1="${midY - 12}" x2="${x(max)}" y2="${midY + 12}" stroke="${COLORS.axis}" stroke-width="2"${tip("min-max", `Max = ${fmt(max)}`)}/>` +
      `<rect x="${x(q1)}" y="${midY - 24}" width="${Math.max(1, x(q3) - x(q1))}" height="48" fill="${COLORS.band1}" stroke="${COLORS.accent}" stroke-width="2"${tip("iqr", `IQR = Q3 − Q1 = ${fmt(q3)} − ${fmt(q1)} = ${fmt(q3 - q1)}`)}/>` +
      `<line x1="${x(q2)}" y1="${midY - 24}" x2="${x(q2)}" y2="${midY + 24}" stroke="${COLORS.accent2}" stroke-width="3"${tip("loc-median", `Median = ${fmt(q2)}`)}/>` +
      labels;
    return svg(W, H + 10, body);
  }

  /** Skewed / symmetric curve with mean, median and mode marked, labelled with the user's letters. */
  function skewCurve(shape, letters) {
    const W = 720, H = 280, padL = 30, padR = 30, axisY = 220, top = 40;
    const sig = 0.7, mu = 0;
    const lnPdf = (t) => (t <= 0 ? 0 : Math.exp(-Math.pow(Math.log(t) - mu, 2) / (2 * sig * sig)) / (t * sig * Math.sqrt(2 * Math.PI)));
    let f, lo, hi, marks;
    if (shape === "sym") {
      f = (t) => Math.exp(-0.5 * t * t);
      lo = -3.5; hi = 3.5;
      marks = [{ v: 0, names: ["Mean", "Median", "Mode"] }];
    } else {
      const modeV = Math.exp(mu - sig * sig), medV = Math.exp(mu), meanV = Math.exp(mu + (sig * sig) / 2);
      if (shape === "right") {
        f = lnPdf; lo = 0; hi = 4.5;
        marks = [{ v: modeV, names: ["Mode"] }, { v: medV, names: ["Median"] }, { v: meanV, names: ["Mean"] }];
      } else {
        f = (t) => lnPdf(-t); lo = -4.5; hi = 0;
        marks = [{ v: -meanV, names: ["Mean"] }, { v: -medV, names: ["Median"] }, { v: -modeV, names: ["Mode"] }];
      }
    }
    const x = scale(lo, hi, padL, W - padR);
    let peak = 0;
    for (let i = 0; i <= 400; i++) peak = Math.max(peak, f(lo + ((hi - lo) * i) / 400));
    const y = (t) => axisY - (f(t) / peak) * (axisY - top);
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const t = lo + ((hi - lo) * i) / 400;
      pts.push(`${x(t).toFixed(1)},${y(t).toFixed(1)}`);
    }
    const area = `<polygon points="${x(lo)},${axisY} ${pts.join(" ")} ${x(hi)},${axisY}" fill="${COLORS.band2}"/>`;
    const colors = { Mode: COLORS.good, Median: COLORS.accent2, Mean: "#7c3aed" };
    const tipKey = { Mode: "loc-mode", Median: "loc-median", Mean: "loc-mean" };
    let lines = "";
    marks.forEach((mk, i) => {
      const letter = shape === "sym" ? letters[1] : letters[i];
      const name = mk.names.join(" = ");
      const c = mk.names.length > 1 ? COLORS.accent : colors[mk.names[0]];
      const why = shape === "sym" ? "Symmetric: all three measures sit at the center." : mk.names[0] === "Mode" ? "The mode is at the highest point (the peak)." : mk.names[0] === "Mean" ? "The mean is pulled toward the long tail." : "The median sits between the mode and the mean.";
      lines +=
        `<g${tip(mk.names.length > 1 ? "skew-shape" : tipKey[mk.names[0]], `${name} → letter ${letter}\n${why}`)}>` +
        `<line x1="${x(mk.v)}" y1="${y(mk.v)}" x2="${x(mk.v)}" y2="${axisY}" stroke="${c}" stroke-width="2.5" stroke-dasharray="6 3"/>` +
        `<line x1="${x(mk.v)}" y1="${top - 10}" x2="${x(mk.v)}" y2="${axisY}" stroke="transparent" stroke-width="14"/>` +
        `<text x="${x(mk.v)}" y="${axisY + 20}" text-anchor="middle" font-size="16" font-weight="700" fill="${c}">${esc(letter)}</text>` +
        `<text x="${x(mk.v)}" y="${axisY + 38 + (i % 2) * 15}" text-anchor="middle" font-size="12" fill="${c}">${esc(name)}</text></g>`;
    });
    const body =
      area +
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${COLORS.accent}" stroke-width="2.5"/>` +
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      lines;
    return svg(W, H, body);
  }

  /** Line chart of a series and its moving average. */
  function lineChart(labels, values, mas, k) {
    const W = 720, H = 260, padL = 60, padR = 20, padT = 20, axisY = 200;
    const fmt = (v) => String(Number(v.toFixed(4)));
    const all = values.concat(mas.filter((v) => v !== null));
    let lo = Math.min(...all), hi = Math.max(...all);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    lo -= pad; hi += pad;
    const x = (i) => (values.length === 1 ? (padL + W - padR) / 2 : padL + (i * (W - padR - padL)) / (values.length - 1));
    const y = scale(lo, hi, axisY, padT);
    const path = (arr) => {
      let d = "";
      arr.forEach((v, i) => { if (v !== null) d += `${d && arr[i - 1] !== null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `; });
      return d;
    };
    let dots = "", ticks = "";
    values.forEach((v, i) => {
      dots += `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${COLORS.accent}"${tip("ma-value", `${labels[i]}: ${fmt(v)}`)}/>`;
      if (mas[i] !== null) dots += `<circle cx="${x(i)}" cy="${y(mas[i])}" r="5" fill="${COLORS.accent2}"${tip("moving-avg", `${labels[i]}: ${k}-period moving average = ${fmt(mas[i])}`)}/>`;
      ticks += `<text x="${x(i)}" y="${axisY + 18}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${esc(labels[i])}</text>`;
    });
    const body =
      `<line x1="${padL}" y1="${axisY}" x2="${W - padR}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${axisY}" stroke="${COLORS.axis}"/>` +
      `<text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="10" fill="${COLORS.axis}">${fmt(hi)}</text>` +
      `<text x="${padL - 6}" y="${axisY}" text-anchor="end" font-size="10" fill="${COLORS.axis}">${fmt(lo)}</text>` +
      `<path d="${path(values)}" fill="none" stroke="${COLORS.accent}" stroke-width="2"/>` +
      `<path d="${path(mas)}" fill="none" stroke="${COLORS.accent2}" stroke-width="2" stroke-dasharray="6 3"/>` +
      dots + ticks +
      `<circle cx="${padL + 10}" cy="${H - 20}" r="5" fill="${COLORS.accent}"/><text x="${padL + 20}" y="${H - 16}" font-size="11" fill="${COLORS.text}">Data</text>` +
      `<circle cx="${padL + 80}" cy="${H - 20}" r="5" fill="${COLORS.accent2}"/><text x="${padL + 90}" y="${H - 16}" font-size="11" fill="${COLORS.text}">${k}-period moving average</text>`;
    return svg(W, H, body);
  }

  root.Charts = { dotPlot, histogram, bellCurve, chebyshevLine, cvBars, freqHistogram, boxPlot, skewCurve, lineChart };
})(typeof globalThis !== "undefined" ? globalThis : this);
