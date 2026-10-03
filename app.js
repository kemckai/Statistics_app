(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const n6 = (x) => String(Number(Number(x).toFixed(6)));
  const roundShow = (x, places) => (Stats.decimalPlaces(n6(x)) < places ? n6(x) : Stats.fmt(x, places));
  let lastSpread = null;

  // ---------------- Tabs ----------------
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${btn.dataset.tab}`));
    });
  });

  function tipAttrs(key, calc) {
    return ` data-tip="${key}"${calc ? ` data-tip-calc="${esc(calc)}"` : ""}`;
  }

  function stat(label, symbol, value, extra, tip, calc) {
    return `<div class="stat"${tip ? tipAttrs(tip, calc) : ""}><div class="stat-label">${label}</div><div class="stat-value">${esc(value)}</div><div class="stat-symbol">${symbol}${extra ? ` · ${extra}` : ""}</div></div>`;
  }

  // ---------------- Spread ----------------
  function currentKind() {
    return document.querySelector('input[name="kind"]:checked').value;
  }

  function renderSpread() {
    const parsed = Stats.parseData($("data-input").value);
    const warn = $("data-warning");
    if (parsed.invalid.length) {
      warn.hidden = false;
      warn.textContent = `Ignored non-numeric entries: ${parsed.invalid.slice(0, 10).join(", ")}${parsed.invalid.length > 10 ? "…" : ""}`;
    } else {
      warn.hidden = true;
    }

    const typeHint = $("data-type");
    if (parsed.values.length) {
      const allWhole = parsed.values.every(Number.isInteger);
      typeHint.textContent = allWhole
        ? "Data type: all whole numbers — discrete if you counted them (people, cars, die rolls); continuous if they're measurements rounded to whole units (height, time)."
        : "Data type: has decimals — this usually comes from measuring, so it's likely continuous.";
    } else {
      typeHint.textContent = "";
    }

    const kind = currentKind();
    const out = $("spread-results");
    try {
      const r = Stats.spread(parsed.values, kind);
      const dataPlaces = Stats.maxDecimalPlaces(parsed.raw);
      const mode = $("round-mode").value;
      const places = mode === "auto" ? dataPlaces + 1 : Number(mode);
      lastSpread = { ...r, places, dataPlaces, values: parsed.values };

      const isS = kind === "sample";
      const mSym = isS ? "x̄" : "μ";
      const sSym = isS ? "s" : "σ";
      const vSym = isS ? "s²" : "σ²";
      const nSym = isS ? "n" : "N";

      const w = places + 2;
      const sorted = [...parsed.values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const medianCalc =
        sorted.length % 2
          ? `Sorted: ${sorted.join(", ")}\nMiddle (#${mid + 1}) = ${sorted[mid]}`
          : `Sorted: ${sorted.join(", ")}\n(${sorted[mid - 1]} + ${sorted[mid]}) ÷ 2 = ${Stats.round(r.median, 10)}`;
      const calcs = {
        count: `${parsed.values.length} values entered → ${nSym} = ${r.n}`,
        mean: `${mSym} = ${Stats.round(r.sum, 10)} ÷ ${r.n} = ${Stats.fmt(r.mean, w)} ≈ ${Stats.fmt(r.mean, places)}`,
        range: `${Stats.round(r.max, 10)} − ${Stats.round(r.min, 10)} = ${Stats.round(r.range, 10)}`,
        variance: `Σ(x − ${mSym})² = ${Stats.fmt(r.sumSquares, w)}\n${vSym} = ${Stats.fmt(r.sumSquares, w)} ÷ ${r.divisor} (${isS ? "n − 1" : "N"}) = ${Stats.fmt(r.variance, w)} ≈ ${Stats.fmt(r.variance, places)}`,
        sd: `${sSym} = √${Stats.fmt(r.variance, w)} = ${Stats.fmt(r.sd, w)} ≈ ${Stats.fmt(r.sd, places)}`,
        cv: Number.isFinite(r.cv)
          ? `(${Stats.fmt(r.sd, w)} ÷ ${Stats.fmt(r.mean, w)}) × 100 = ${Stats.fmt(r.cv, 2)}%`
          : "Mean is 0, so CV is undefined.",
        median: medianCalc,
      };
      lastSpread.calcs = calcs;

      out.innerHTML =
        `<div class="stats-grid">` +
        stat("Count", nSym, r.n, "", "count", calcs.count) +
        stat("Mean", mSym, Stats.fmt(r.mean, places), "", "mean", calcs.mean) +
        stat("Range", "max − min", Stats.fmt(r.range, dataPlaces), `${Stats.fmt(r.max, dataPlaces)} − ${Stats.fmt(r.min, dataPlaces)}`, "range", calcs.range) +
        stat(`${isS ? "Sample" : "Population"} variance`, vSym, Stats.fmt(r.variance, places), "squared units", "variance", calcs.variance) +
        stat(`${isS ? "Sample" : "Population"} std. deviation`, sSym, Stats.fmt(r.sd, places), "", "sd", calcs.sd) +
        stat("Coefficient of variation", `(${sSym} ÷ ${mSym}) × 100%`, Number.isFinite(r.cv) ? `${Stats.fmt(r.cv, 2)}%` : "undefined (mean = 0)", "", "cv", calcs.cv) +
        stat("Median", "middle value", Stats.fmt(r.median, places), "", "median", calcs.median) +
        (() => {
          const mo = Stats.mode(parsed.values);
          const txt = mo.modes.length ? mo.modes.join(", ") : "none";
          return stat("Mode", mo.type, txt, "", "loc-mode", `Highest frequency = ${mo.maxFreq}${mo.modes.length ? ` → ${txt}` : " for every value → no mode"}`);
        })() +
        `</div>` +
        `<p class="hint">Rounding: original data has ${dataPlaces} decimal place${dataPlaces === 1 ? "" : "s"}${
          mode === "auto" ? `, so answers are rounded to ${places}.` : `; you chose ${places}.`
        }</p>`;

      $("dotplot").innerHTML = Charts.dotPlot(parsed.values, r.mean, r.sd || 1, places);
      $("histogram").innerHTML = Charts.histogram(parsed.values, r.mean, r.sd, places);
      $("spread-steps").innerHTML = spreadSteps(r, places, { mSym, sSym, vSym, nSym });
    } catch (e) {
      lastSpread = null;
      out.innerHTML = `<div class="card error">${esc(e.message)}</div>`;
      $("dotplot").innerHTML = "";
      $("histogram").innerHTML = "";
      $("spread-steps").innerHTML = "";
    }
  }

  function spreadSteps(r, places, sym) {
    const work = places + 2;
    const isS = r.kind === "sample";
    const rows = r.rows
      .map(
        (row) =>
          `<tr><td${tipAttrs("col-x")}>${esc(row.x)}</td>` +
          `<td${tipAttrs("col-dev", `${row.x} − ${Stats.fmt(r.mean, work)} = ${Stats.fmt(row.dev, work)}`)}>${Stats.fmt(row.dev, work)}</td>` +
          `<td${tipAttrs("col-sq", `(${Stats.fmt(row.dev, work)})² = (${Stats.fmt(row.dev, work)}) × (${Stats.fmt(row.dev, work)}) = ${Stats.fmt(row.sq, work)}`)}>${Stats.fmt(row.sq, work)}</td></tr>`
      )
      .join("");
    const sumCalc = r.rows.map((row) => Stats.fmt(row.sq, work)).join(" + ") + ` = ${Stats.fmt(r.sumSquares, work)}`;
    const c = lastSpread.calcs;
    return `
      <ol class="steps">
        <li${tipAttrs("range", c.range)}><strong>Range</strong> = max − min = ${esc(r.max)} − ${esc(r.min)} = <strong>${esc(Stats.round(r.range, 10))}</strong></li>
        <li${tipAttrs("mean", c.mean)}><strong>Mean</strong>: ${sym.mSym} = Σx ÷ ${sym.nSym} = ${esc(Stats.round(r.sum, 10))} ÷ ${r.n} = <strong>${Stats.fmt(r.mean, work)}</strong></li>
        <li><strong>Deviations, squared</strong>: subtract the mean from each value, then square it.
          <table class="work">
            <thead><tr><th${tipAttrs("col-x")}>x</th><th${tipAttrs("col-dev")}>x − ${sym.mSym}</th><th${tipAttrs("col-sq")}>(x − ${sym.mSym})²</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr${tipAttrs("sum-sq", sumCalc)}><td colspan="2">Σ(x − ${sym.mSym})²</td><td><strong>${Stats.fmt(r.sumSquares, work)}</strong></td></tr></tfoot>
          </table>
        </li>
        <li${tipAttrs(r.kind === "sample" ? "kind-sample" : "kind-population", c.variance)}><strong>Divide</strong> by ${isS ? "n − 1" : "N"} = ${r.divisor}:
          ${sym.vSym} = ${Stats.fmt(r.sumSquares, work)} ÷ ${r.divisor} = ${Stats.fmt(r.variance, work)} ≈ <strong>${Stats.fmt(r.variance, places)}</strong></li>
        <li${tipAttrs("sd", c.sd)}><strong>Square root</strong>: ${sym.sSym} = √${Stats.fmt(r.variance, work)} = ${Stats.fmt(r.sd, work)} ≈ <strong>${Stats.fmt(r.sd, places)}</strong></li>
        ${
          Number.isFinite(r.cv)
            ? `<li${tipAttrs("cv", c.cv)}><strong>CV</strong> = (${sym.sSym} ÷ ${sym.mSym}) × 100% = (${Stats.fmt(r.sd, work)} ÷ ${Stats.fmt(r.mean, work)}) × 100% ≈ <strong>${Stats.fmt(r.cv, 2)}%</strong></li>`
            : ""
        }
      </ol>
      <p class="hint">Intermediate work is shown with ${work} decimals; only the final answers are rounded.</p>`;
  }

  ["data-input"].forEach((id) => $(id).addEventListener("input", renderSpread));
  $("round-mode").addEventListener("change", renderSpread);
  document.querySelectorAll('input[name="kind"]').forEach((el) => el.addEventListener("change", renderSpread));

  // ---------------- File loading ----------------
  $("data-file").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const delim = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : null;
    const cols = delim ? lines[0].split(delim) : [lines[0]];

    if (delim && cols.length > 1) {
      const header = cols.every((c) => !Number.isFinite(Number(c.trim())) || c.trim() === "");
      const names = header ? cols.map((c) => c.trim() || "(unnamed)") : cols.map((_, i) => `Column ${i + 1}`);
      const body = header ? lines.slice(1) : lines;
      const choice = window.prompt(
        `This file has ${names.length} columns:\n${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n\nWhich column number should be used?`,
        "1"
      );
      const idx = Number(choice) - 1;
      if (!(idx >= 0 && idx < names.length)) return;
      $("data-input").value = body
        .map((l) => (l.split(delim)[idx] || "").trim())
        .filter((v) => v !== "")
        .join(", ");
    } else {
      $("data-input").value = Stats.parseData(text).raw.join(", ");
    }
    ev.target.value = "";
    renderSpread();
  });

  // ---------------- Location ----------------
  const fmtList = (arr) => arr.map((v) => n6(v)).join(", ");

  function percentileSteps(res, p, n) {
    const s = res.sorted;
    if (res.method === "interp") {
      const lines = [`Locator: L = (P ÷ 100) × (n + 1) = (${p} ÷ 100) × ${n + 1} = ${n6(res.L)}`];
      if (res.note) lines.push(`${res.note} → <b>${n6(res.value)}</b>`);
      else
        lines.push(
          `Go ${n6(res.frac)} of the way from the ${ordinal(res.lo)} value (${n6(s[res.lo - 1])}) to the ${ordinal(res.lo + 1)} value (${n6(s[res.lo])}):`,
          `${n6(s[res.lo - 1])} + ${n6(res.frac)} × (${n6(s[res.lo])} − ${n6(s[res.lo - 1])}) = <b>${n6(res.value)}</b>`
        );
      return lines;
    }
    const lines = [`Locator: L = (P ÷ 100) × n = (${p} ÷ 100) × ${n} = ${n6(res.L)}`];
    if (res.whole) {
      lines.push(
        res.k >= n
          ? `L is whole and equals n, so use the last value → <b>${n6(res.value)}</b>`
          : `L is a whole number, so average the ${ordinal(res.k)} and ${ordinal(res.k + 1)} values: (${n6(s[res.k - 1])} + ${n6(s[res.k])}) ÷ 2 = <b>${n6(res.value)}</b>`
      );
    } else {
      lines.push(`L is not whole, so round up to ${res.k}. The ${ordinal(res.k)} value is <b>${n6(res.value)}</b>`);
    }
    return lines;
  }

  function percentileCalc(res, p, n) {
    return percentileSteps(res, p, n).join("\n").replace(/<[^>]+>/g, "");
  }

  function renderLocation() {
    const parsed = Stats.parseData($("loc-input").value);
    const v = parsed.values;
    const center = $("loc-center");
    if (v.length < 1) {
      center.innerHTML = `<div class="card error">Enter at least one number.</div>`;
      ["loc-quantiles", "loc-pct-steps", "loc-boxplot", "loc-other", "skew-data"].forEach((id) => ($(id).innerHTML = ""));
      return;
    }
    const dataPlaces = Stats.maxDecimalPlaces(parsed.raw);
    const places = $("loc-round").value === "auto" ? dataPlaces + 1 : Number($("loc-round").value);
    const method = $("loc-method").value;
    const n = v.length;
    const m = Stats.mean(v);
    const med = Stats.medianSteps(v);
    const mo = Stats.mode(v);
    const s = med.sorted;

    const sumText = v.map((x) => (x < 0 ? `(${n6(x)})` : n6(x))).join(" + ");
    const meanCalc = `${sumText} = ${n6(Stats.sum(v))}\n${n6(Stats.sum(v))} ÷ ${n} = ${n6(m)}`;
    const medCalc =
      `Sorted: ${fmtList(s)}\n` +
      (n % 2
        ? `n = ${n} (odd) → position (${n} + 1) ÷ 2 = ${med.pos} → ${n6(med.median)}`
        : `n = ${n} (even) → average positions ${med.positions[0]} and ${med.positions[1]}: (${n6(s[n / 2 - 1])} + ${n6(s[n / 2])}) ÷ 2 = ${n6(med.median)}`);
    const modeText = mo.modes.length ? fmtList(mo.modes) : "none";
    const modeCalc = `Highest frequency = ${mo.maxFreq}` + (mo.modes.length ? ` → ${modeText} (${mo.type})` : " for every value → no mode");

    const sortedHtml = s
      .map((x, i) => (med.positions.includes(i + 1) ? `<mark>${n6(x)}</mark>` : n6(x)))
      .join(", ");
    const freqRows = mo.table
      .map((t) => `<tr${mo.modes.includes(t.value) ? ' class="hl"' : ""}><td>${n6(t.value)}</td><td>${t.freq}</td></tr>`)
      .join("");

    center.innerHTML = `
      <div class="stats-grid">
        ${stat("Mean", "x̄ = Σx ÷ n", roundShow(m, places), "", "loc-mean", meanCalc)}
        ${stat("Median", "middle value", n6(med.median), `position ${n % 2 ? med.pos : `${med.positions[0]} & ${med.positions[1]}`}`, "loc-median", medCalc)}
        ${stat("Mode", mo.type, modeText, "", "loc-mode", modeCalc)}
      </div>
      <div class="card">
        <h2>Step by step</h2>
        <h3>Mean</h3>
        <ol class="steps">
          <li${tipAttrs("loc-mean", meanCalc)}>Add all values: ${sumText} = <b>${n6(Stats.sum(v))}</b></li>
          <li>Count the values: n = <b>${n}</b></li>
          <li>Divide: ${n6(Stats.sum(v))} ÷ ${n} = <b>${roundShow(m, places)}</b>${Stats.decimalPlaces(n6(m)) < places ? "" : ` (${n6(m)} rounded)`}</li>
        </ol>
        <h3>Median</h3>
        <ol class="steps">
          <li${tipAttrs("loc-median", medCalc)}>Sort from smallest to largest: ${sortedHtml}</li>
          <li>${n % 2 ? `n = ${n} is odd, so the median is at position (n + 1) ÷ 2 = (${n} + 1) ÷ 2 = <b>${med.pos}</b>` : `n = ${n} is even, so average the values at positions ${med.positions[0]} and ${med.positions[1]}`}</li>
          <li>Median = <b>${n6(med.median)}</b></li>
        </ol>
        <h3>Mode</h3>
        <ol class="steps">
          <li${tipAttrs("loc-mode", modeCalc)}>Count how often each value appears:
            <table class="work"><thead><tr><th>Value</th><th>Frequency</th></tr></thead><tbody>${freqRows}</tbody></table></li>
          <li>Highest frequency = <b>${mo.maxFreq}</b>${mo.modes.length ? `, reached by <b>${modeText}</b>` : ", and every value has it"}.</li>
          <li data-tip="mode-types">Classification: <b>${mo.type}</b>${mo.modes.length ? ` — mode${mo.modes.length > 1 ? "s" : ""}: ${modeText}` : ""}</li>
        </ol>
      </div>`;

    // Quantiles
    const q = (p) => Stats.percentile(v, p, method);
    const qCell = (label, p, tip) => {
      const r = q(p);
      return `<td${tipAttrs(tip, percentileCalc(r, p, n))}><span class="q-label">${label}</span>${n6(r.value)}</td>`;
    };
    const Q1 = q(25).value, Q2 = q(50).value, Q3 = q(75).value;
    $("loc-quantiles").innerHTML = `
      <div class="table-scroll"><table class="q-table">
        <tr><th data-tip="quartiles">Quartiles</th>${qCell("Q1 (P25)", 25, "quartiles")}${qCell("Q2 (P50)", 50, "quartiles")}${qCell("Q3 (P75)", 75, "quartiles")}</tr>
        <tr><th data-tip="quintiles">Quintiles</th>${[20, 40, 60, 80].map((p) => qCell(`P${p}`, p, "quintiles")).join("")}</tr>
        <tr><th data-tip="deciles">Deciles</th>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => qCell(`D${d}`, d * 10, "deciles")).join("")}</tr>
      </table></div>
      <p class="hint">Sorted data: ${fmtList(s)}. Methods differ between textbooks/calculators — switch the method above to match yours.</p>`;

    const P = parseFloat($("loc-p").value);
    const X = parseFloat($("loc-x").value);
    let pctHtml = "";
    if (P > 0 && P < 100) {
      const r = q(P);
      pctHtml += `<h3>${Number.isInteger(P) ? `${ordinal(P)} percentile` : `P${n6(P)}`} = <span class="inline-answer">${n6(r.value)}</span></h3>
        <ol class="steps"><li>Sort the data: ${fmtList(s)}</li>${percentileSteps(r, P, n).map((l) => `<li>${l}</li>`).join("")}</ol>`;
    }
    if (Number.isFinite(X)) {
      const pr = Stats.percentileRank(v, X);
      pctHtml += `<h3>Percentile rank of ${n6(X)} = <span class="inline-answer">${Math.round(pr.rank)}</span></h3>
        <ol class="steps"><li>Count the values less than ${n6(X)}: <b>${pr.below}</b></li>
        <li>Percentile = (${pr.below} ÷ ${pr.n}) × 100 = ${n6(pr.rank)} → about the <b>${ordinal(Math.round(pr.rank))}</b> percentile</li></ol>`;
    }
    $("loc-pct-steps").innerHTML = pctHtml;
    $("loc-boxplot").innerHTML = n >= 2 ? `<h3>Five-number summary / box plot</h3>` + Charts.boxPlot(s[0], Q1, Q2, Q3, s[n - 1]) : "";

    // Other measures
    const other = [];
    const otherSteps = [];
    try {
      const g = Stats.geometricMean(v);
      const prod = v.reduce((a, b) => a * b, 1);
      const calc = `(${v.map(n6).join(" × ")})^(1/${n}) = ${n6(prod)}^(1/${n}) = ${n6(g)}`;
      other.push(stat("Geometric mean", "ⁿ√(x₁·x₂·…·xₙ)", Stats.fmt(g, places), "", "geo-mean", calc));
    } catch (e) {
      other.push(stat("Geometric mean", "ⁿ√(x₁·x₂·…·xₙ)", "—", "needs all values > 0", "geo-mean"));
    }
    try {
      const h = Stats.harmonicMean(v);
      const calc = `${n} ÷ (${v.map((x) => `1/${n6(x)}`).join(" + ")}) = ${n} ÷ ${n6(Stats.sum(v.map((x) => 1 / x)))} = ${n6(h)}`;
      other.push(stat("Harmonic mean", "n ÷ Σ(1/x)", Stats.fmt(h, places), "", "harm-mean", calc));
    } catch (e) {
      other.push(stat("Harmonic mean", "n ÷ Σ(1/x)", "—", "needs all values > 0", "harm-mean"));
    }
    const mr = Stats.midrange(v);
    other.push(stat("Midrange", "(max + min) ÷ 2", n6(mr), "", "midrange", `(${n6(s[n - 1])} + ${n6(s[0])}) ÷ 2 = ${n6(mr)}`));
    const tri = (Q1 + 2 * Q2 + Q3) / 4;
    other.push(stat("Trimean", "(Q1 + 2·Q2 + Q3) ÷ 4", Stats.fmt(tri, places), "", "trimean", `(${n6(Q1)} + 2 × ${n6(Q2)} + ${n6(Q3)}) ÷ 4 = ${n6(tri)}`));
    const pct = parseFloat($("loc-wins").value) || 0;
    try {
      const w = Stats.winsorize(v, pct);
      const calc =
        w.k === 0
          ? `${pct}% of ${n} values = ${n6((n * pct) / 100)} → rounds down to 0, nothing replaced.\nMean = ${n6(w.mean)}`
          : `${pct}% of ${n} = ${n6((n * pct) / 100)} → replace ${w.k} value${w.k > 1 ? "s" : ""} at each end.\nSorted: ${fmtList(w.sorted)}\nWinsorized: ${fmtList(w.winsorized)}\nMean = ${n6(Stats.sum(w.winsorized))} ÷ ${n} = ${n6(w.mean)}`;
      other.push(stat(`Winsorized mean (${pct}%)`, "extremes replaced", Stats.fmt(w.mean, places), "", "winsor", calc));
      otherSteps.push(`<li${tipAttrs("winsor", calc)}><b>Winsorized mean</b>: ${esc(calc).replace(/\n/g, "<br>")}</li>`);
    } catch (e) {
      other.push(stat(`Winsorized mean (${pct}%)`, "extremes replaced", "—", esc(e.message), "winsor"));
    }
    $("loc-other").innerHTML = `<div class="stats-grid">${other.join("")}</div>${otherSteps.length ? `<ol class="steps">${otherSteps.join("")}</ol>` : ""}`;

    // Data skew hint
    const sd = n > 1 ? Stats.spread(v, "sample").sd : 0;
    const diff = m - med.median;
    let shape;
    if (sd === 0 || Math.abs(diff) < 0.1 * sd) shape = "roughly symmetric (mean ≈ median)";
    else if (diff > 0) shape = "skewed right (mean > median: the mean is pulled toward a tail of high values)";
    else shape = "skewed left (mean < median: the mean is pulled toward a tail of low values)";
    $("skew-data").textContent = `Your data: mean = ${roundShow(m, places)}, median = ${n6(med.median)}, mode = ${modeText} → ${shape}.`;
  }

  function renderSkew() {
    const shape = $("skew-shape").value;
    const letters = [$("skew-l1").value || "A", $("skew-l2").value || "B", $("skew-l3").value || "C"];
    let order, text;
    if (shape === "right") {
      order = ["Mode", "Median", "Mean"];
      text = "Tail on the right: the mode is at the peak (farthest left), the median is in the middle, and the mean is pulled toward the tail (farthest right).";
    } else if (shape === "left") {
      order = ["Mean", "Median", "Mode"];
      text = "Tail on the left: the mean is pulled toward the tail (farthest left), the median is in the middle, and the mode is at the peak (farthest right).";
    } else {
      order = ["Mean = Median = Mode", "", ""];
      text = "Symmetric: mean, median and mode are all at the center peak — the middle letter.";
    }
    const rows =
      shape === "sym"
        ? `<tr><td>Mean</td><td>${esc(letters[1])}</td></tr><tr><td>Median</td><td>${esc(letters[1])}</td></tr><tr><td>Mode</td><td>${esc(letters[1])}</td></tr>`
        : ["Mean", "Median", "Mode"].map((name) => `<tr><td>${name}</td><td><b>${esc(letters[order.indexOf(name)])}</b></td></tr>`).join("");
    $("skew-answer").innerHTML = `
      <p>${text}</p>
      <table class="work"><thead><tr><th>Measure</th><th>Letter</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="hint">Left → right order: ${shape === "sym" ? "all at the center" : order.join(" → ")}</p>`;
    $("skew-chart").innerHTML = Charts.skewCurve(shape, letters);
  }

  ["loc-input", "loc-p", "loc-x", "loc-wins"].forEach((id) => $(id).addEventListener("input", renderLocation));
  ["loc-round", "loc-method"].forEach((id) => $(id).addEventListener("change", renderLocation));
  $("loc-use-data").addEventListener("click", () => {
    $("loc-input").value = $("data-input").value;
    renderLocation();
  });
  ["skew-shape", "skew-l1", "skew-l2", "skew-l3"].forEach((id) => {
    $(id).addEventListener("input", renderSkew);
    $(id).addEventListener("change", renderSkew);
  });

  // ---------------- Weighted mean ----------------
  const WM_EXAMPLE = [[4.77, 8], [2.53, 6], [2.36, 7], [5.1, 10], [3.28, 4], [4.22, 3], [7.15, 7], [4.72, 4]];

  function addPairRow(tbodyId, a, b, cls, onChange, aType) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="${aType || "number"}" step="any" class="${cls}-a" value="${a ?? ""}" /></td>
      <td><input type="number" step="any" class="${cls}-b" value="${b ?? ""}" /></td>
      <td class="computed"></td>
      <td><button class="link" title="Remove">✕</button></td>`;
    tr.querySelector("button").addEventListener("click", () => { tr.remove(); onChange(); });
    $(tbodyId).appendChild(tr);
  }

  function renderWeighted() {
    const places = Number($("wm-round").value);
    const trs = [...$("wm-rows").querySelectorAll("tr")];
    const pairs = [];
    trs.forEach((tr) => {
      const w = parseFloat(tr.querySelector(".wm-a").value);
      const x = parseFloat(tr.querySelector(".wm-b").value);
      const cell = tr.querySelector(".computed");
      if (Number.isFinite(w) && Number.isFinite(x)) {
        pairs.push({ w, x });
        cell.textContent = `${n6(w)} × ${n6(x)} = ${n6(w * x)}`;
        cell.dataset.tip = "wx";
        cell.dataset.tipCalc = `${n6(w)} × ${n6(x)} = ${n6(w * x)}`;
      } else {
        cell.textContent = "";
      }
    });
    const out = $("wm-result");
    if (!pairs.length) { out.innerHTML = ""; return; }
    try {
      const r = Stats.weightedMean(pairs);
      out.innerHTML = `
        <p class="answer big"${tipAttrs("weighted", `${n6(r.sumWX)} ÷ ${n6(r.sumW)} = ${n6(r.mean)}`)}>${Stats.fmt(r.mean, places)}</p>
        <ol class="steps">
          <li>Multiply each weight by its data value (the w × x column).</li>
          <li${tipAttrs("wx")}>Add the products: ${r.products.map(n6).join(" + ")} = <b>${n6(r.sumWX)}</b></li>
          <li${tipAttrs("weight")}>Add the weights: ${pairs.map((p) => n6(p.w)).join(" + ")} = <b>${n6(r.sumW)}</b></li>
          <li>Divide: ${n6(r.sumWX)} ÷ ${n6(r.sumW)} = ${n6(r.mean)} → <b>${Stats.fmt(r.mean, places)}</b></li>
        </ol>`;
    } catch (e) {
      out.innerHTML = `<p class="warning">${esc(e.message)}</p>`;
    }
  }

  function setWeighted(rows) {
    $("wm-rows").innerHTML = "";
    rows.forEach(([w, x]) => addPairRow("wm-rows", w, x, "wm", renderWeighted));
    renderWeighted();
  }
  $("wm-rows").addEventListener("input", renderWeighted);
  $("wm-round").addEventListener("change", renderWeighted);
  $("wm-add").addEventListener("click", () => addPairRow("wm-rows", "", "", "wm", renderWeighted));
  $("wm-example").addEventListener("click", () => setWeighted(WM_EXAMPLE));
  setWeighted(WM_EXAMPLE);

  // ---------------- Moving average ----------------
  const MA_EXAMPLE = [["2005", 18828], ["2006", 15677], ["2007", 13780]];

  function renderMoving() {
    const k = parseInt($("ma-k").value, 10);
    const trs = [...$("ma-rows").querySelectorAll("tr")];
    const rows = trs
      .map((tr) => ({ tr, label: tr.querySelector(".ma-a").value.trim(), raw: tr.querySelector(".ma-b").value.trim() }))
      .filter((r) => r.raw !== "" && Number.isFinite(Number(r.raw)));
    const values = rows.map((r) => Number(r.raw));
    const places = Stats.maxDecimalPlaces(rows.map((r) => r.raw)) + 1;
    const labels = rows.map((r, i) => r.label || `Period ${i + 1}`);

    trs.forEach((tr) => (tr.querySelector(".computed").textContent = ""));
    const mas = values.map((_, i) => (k >= 2 ? Stats.movingAverage(values, k, i) : null));
    rows.forEach((r, i) => {
      const cell = r.tr.querySelector(".computed");
      const ma = mas[i];
      if (ma) {
        cell.textContent = Stats.fmt(ma.value, places);
        cell.dataset.tip = "moving-avg";
        cell.dataset.tipCalc = `(${ma.window.map(n6).join(" + ")}) ÷ ${k} = ${n6(ma.total)} ÷ ${k} = ${n6(ma.value)}`;
      } else {
        cell.textContent = "—";
        delete cell.dataset.tip;
      }
    });

    const sel = $("ma-target");
    const prev = sel.value;
    sel.innerHTML = labels.map((l, i) => `<option value="${i}">${esc(l)}</option>`).join("");
    sel.value = prev !== "" && Number(prev) < labels.length ? prev : String(labels.length - 1);

    const out = $("ma-result");
    if (!(k >= 2)) { out.innerHTML = `<p class="warning">Use a period of 2 or more.</p>`; $("ma-chart").innerHTML = ""; return; }
    if (!values.length) { out.innerHTML = ""; $("ma-chart").innerHTML = ""; return; }
    const i = Number(sel.value);
    const ma = mas[i];
    if (!ma) {
      out.innerHTML = `<p class="warning">A ${k}-period moving average for ${esc(labels[i])} needs ${k - 1} earlier period${k > 2 ? "s" : ""}, but there ${i === 1 ? "is" : "are"} only ${i}.</p>`;
    } else {
      const winLabels = labels.slice(i - k + 1, i + 1);
      const exact = n6(ma.value);
      const isExact = Stats.decimalPlaces(exact) < places;
      const shown = isExact ? exact : Stats.fmt(ma.value, places);
      const roundNote = isExact
        ? `Rounding: the data has ${places - 1} decimal place${places - 1 === 1 ? "" : "s"}, so round to ${places} — but ${exact} is already exact, so it stays <b>${exact}</b>`
        : `Rounding: the data has ${places - 1} decimal place${places - 1 === 1 ? "" : "s"}, so give ${places} → <b>${shown}</b>`;
      out.innerHTML = `
        <h3>${k}-period moving average for ${esc(labels[i])}</h3>
        <p class="answer big"${tipAttrs("moving-avg", `(${ma.window.map(n6).join(" + ")}) ÷ ${k} = ${n6(ma.value)}`)}>${shown.replace(/^(-?\d+)/, (w) => w.replace(/\B(?=(\d{3})+(?!\d))/g, ","))}</p>
        <ol class="steps">
          <li>Use ${esc(labels[i])} and the ${k - 1} period${k > 2 ? "s" : ""} right before it: ${winLabels.map((l, j) => `${esc(l)}: ${n6(ma.window[j])}`).join(", ")}</li>
          <li>Add them: ${ma.window.map(n6).join(" + ")} = <b>${n6(ma.total)}</b></li>
          <li>Divide by ${k}: ${n6(ma.total)} ÷ ${k} = <b>${n6(ma.value)}</b></li>
          <li data-tip="rounding">${roundNote}</li>
        </ol>`;
    }
    $("ma-chart").innerHTML = values.length >= 2 ? Charts.lineChart(labels, values, mas.map((x) => (x ? x.value : null)), k) : "";
  }

  function setMoving(rows) {
    $("ma-rows").innerHTML = "";
    rows.forEach(([l, v]) => addPairRow("ma-rows", l, v, "ma", renderMoving, "text"));
    renderMoving();
  }
  $("ma-rows").addEventListener("input", renderMoving);
  $("ma-k").addEventListener("input", renderMoving);
  $("ma-target").addEventListener("change", renderMoving);
  $("ma-add").addEventListener("click", () => addPairRow("ma-rows", "", "", "ma", renderMoving, "text"));
  $("ma-example").addEventListener("click", () => setMoving(MA_EXAMPLE));
  setMoving(MA_EXAMPLE);

  // ---------------- Missing value ----------------
  function renderMissing() {
    const m = parseFloat($("mv-mean").value);
    const n = parseInt($("mv-n").value, 10);
    const parsed = Stats.parseData($("mv-known").value);
    const out = $("mv-result");
    if (!Number.isFinite(m) || !Number.isFinite(n)) { out.innerHTML = ""; return; }
    try {
      const r = Stats.missingValue(m, n, parsed.values);
      const places = Math.max(Stats.maxDecimalPlaces(parsed.raw), Stats.decimalPlaces($("mv-mean").value));
      let running = 0;
      const adds = parsed.values.map((x, i) => {
        const before = running;
        running += x;
        return i === 0 ? null : `${n6(before)} + ${n6(x)} = ${n6(running)}`;
      }).filter(Boolean);
      out.innerHTML = `
        <p class="answer big"${tipAttrs("missing", `${n6(m)} × ${n} − ${n6(r.knownSum)} = ${n6(r.value * r.missingCount)}`)}>${Stats.fmt(r.value, places)}</p>
        <ol class="steps">
          <li${tipAttrs("missing-n")}>Total of all ${n} values = mean × n = ${n6(m)} × ${n} = <b>${n6(r.total)}</b></li>
          <li${tipAttrs("missing-known")}>Sum of the ${parsed.values.length} known values: ${adds.length ? adds.join("; ") : n6(r.knownSum)} → <b>${n6(r.knownSum)}</b></li>
          <li>Subtract: ${n6(r.total)} − ${n6(r.knownSum)} = <b>${n6(r.total - r.knownSum)}</b>${r.missingCount > 1 ? ` — shared by ${r.missingCount} missing values, so each (if equal) = ${n6(r.value)}` : ""}</li>
        </ol>`;
    } catch (e) {
      out.innerHTML = `<p class="warning">${esc(e.message)}</p>`;
    }
  }
  ["mv-mean", "mv-n", "mv-known"].forEach((id) => $(id).addEventListener("input", renderMissing));

  // ---------------- Frequency table ----------------
  const PRESETS = {
    tv: {
      title: "Hours Students Watch TV in a Week",
      classes: [[7, 14, 12], [15, 22, 3], [23, 30, 4], [31, 38, 6], [39, 46, 11]],
    },
    scores: {
      title: "Scores on a Test",
      classes: [[30, 47, 3], [48, 65, 10], [66, 83, 14], [84, 101, 11], [102, 119, 4]],
    },
  };
  let freqTable = null;

  function addFreqRow(lower, upper, freq) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="cls-num"></td>
      <td><input type="number" step="any" class="f-lower" value="${lower ?? ""}" /></td>
      <td><input type="number" step="any" class="f-upper" value="${upper ?? ""}" /></td>
      <td><input type="number" step="1" min="0" class="f-freq" value="${freq ?? ""}" /></td>
      <td><button class="link f-remove" title="Remove class">✕</button></td>`;
    tr.querySelector(".f-remove").addEventListener("click", () => { tr.remove(); renderFreq(); });
    $("freq-rows").appendChild(tr);
  }

  function setFreqClasses(classes, title) {
    $("freq-rows").innerHTML = "";
    classes.forEach(([l, u, f]) => addFreqRow(l, u, f));
    if (title !== undefined) $("freq-title").value = title;
    renderFreq();
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function renderFreq() {
    const trs = [...$("freq-rows").querySelectorAll("tr")];
    trs.forEach((tr, i) => (tr.querySelector(".cls-num").textContent = ordinal(i + 1)));
    const classes = trs
      .map((tr) => ({
        lower: parseFloat(tr.querySelector(".f-lower").value),
        upper: parseFloat(tr.querySelector(".f-upper").value),
        freq: parseFloat(tr.querySelector(".f-freq").value),
      }))
      .filter((c) => !(Number.isNaN(c.lower) && Number.isNaN(c.upper) && Number.isNaN(c.freq)));

    const out = $("freq-results");
    try {
      const t = Stats.frequencyTable(classes);
      freqTable = t;
      const rows = t.rows
        .map((r, i) => {
          const prevCum = i > 0 ? t.rows[i - 1].cumFreq : 0;
          const cumCalc = t.rows.slice(0, i + 1).map((x) => x.freq).join(" + ") + ` = ${r.cumFreq}`;
          return `<tr>
            <td>${ordinal(r.index)}</td>
            <td${tipAttrs("lower-limit")}>${n6(r.lower)} – ${n6(r.upper)}</td>
            <td${tipAttrs("frequency", `${r.freq} value${r.freq === 1 ? "" : "s"} between ${n6(r.lower)} and ${n6(r.upper)}`)}>${n6(r.freq)}</td>
            <td${tipAttrs("lower-boundary", `gap = ${i > 0 ? `${n6(r.lower)} − ${n6(t.rows[i - 1].upper)}` : "same as other classes"} = ${n6(r.gapBelow)}\n${n6(r.lower)} − ${n6(r.gapBelow)} ÷ 2 = ${n6(r.lowerBoundary)}`)}>${n6(r.lowerBoundary)}</td>
            <td${tipAttrs("upper-boundary", `gap = ${i < t.rows.length - 1 ? `${n6(t.rows[i + 1].lower)} − ${n6(r.upper)}` : "same as other classes"} = ${n6(r.gapAbove)}\n${n6(r.upper)} + ${n6(r.gapAbove)} ÷ 2 = ${n6(r.upperBoundary)}`)}>${n6(r.upperBoundary)}</td>
            <td${tipAttrs("midpoint", `(${n6(r.lower)} + ${n6(r.upper)}) ÷ 2 = ${n6(r.midpoint)}`)}>${n6(r.midpoint)}</td>
            <td${tipAttrs("rel-freq", `${n6(r.freq)} ÷ ${n6(t.total)} = ${Stats.fmt(r.relFreq, 4)} (${Stats.fmt(r.relFreq * 100, 2)}%)`)}>${Stats.fmt(r.relFreq, 4)}</td>
            <td${tipAttrs("cum-freq", i === 0 ? `${r.freq} (first class)` : `${prevCum} + ${r.freq} = ${r.cumFreq}\n(${cumCalc})`)}>${n6(r.cumFreq)}</td>
          </tr>`;
        })
        .join("");

      const r0 = t.rows[0], r1 = t.rows[1];
      const widthCalc = r1
        ? `${n6(r1.lower)} − ${n6(r0.lower)} = ${n6(t.width)}\ncheck: ${n6(r1.upper)} − ${n6(r0.upper)} = ${n6(r1.upper - r0.upper)}`
        : `only one class: (upper − lower) + gap = ${n6(t.width)}`;
      const warnings = [];
      if (!t.uniformWidth) warnings.push("Class widths are not all equal — check your limits.");
      if (!t.uniformGap) warnings.push("The gaps between classes are not all the same — check your limits.");
      if (t.gap <= 0 && t.rows.length > 1) warnings.push("Classes overlap or touch (gap ≤ 0). Limits normally leave a gap such as 47 → 48.");

      out.innerHTML = `
        <div class="card">
          <h2>${esc($("freq-title").value || "Frequency table")}</h2>
          <div class="stats-grid">
            ${stat("Class width", "next lower − lower", n6(t.width), "", "class-width", widthCalc)}
            ${stat("Gap between classes", "next lower − upper", n6(t.gap), `half = ${n6(t.gap / 2)}`, "gap", r1 ? `${n6(r1.lower)} − ${n6(r0.upper)} = ${n6(t.gap)}` : "")}
            ${stat("Total frequency", "n = Σf", n6(t.total), "", "total-freq", t.rows.map((r) => n6(r.freq)).join(" + ") + ` = ${n6(t.total)}`)}
          </div>
          <div class="table-scroll">
          <table class="freq-table">
            <thead><tr>
              <th>Class</th>
              <th${tipAttrs("lower-limit")}>Limits</th>
              <th${tipAttrs("frequency")}>Frequency</th>
              <th${tipAttrs("lower-boundary")}>Lower boundary</th>
              <th${tipAttrs("upper-boundary")}>Upper boundary</th>
              <th${tipAttrs("midpoint")}>Midpoint</th>
              <th${tipAttrs("rel-freq")}>Relative freq.</th>
              <th${tipAttrs("cum-freq")}>Cumulative freq.</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr${tipAttrs("total-freq")}><td colspan="2">Total</td><td>${n6(t.total)}</td><td colspan="3"></td><td>1.0000</td><td></td></tr></tfoot>
          </table>
          </div>
          ${warnings.map((w) => `<p class="warning">${esc(w)}</p>`).join("")}
        </div>`;

      const sel = $("freq-qclass");
      const prev = sel.value;
      sel.innerHTML = t.rows.map((r) => `<option value="${r.index}">${ordinal(r.index)} (${n6(r.lower)} – ${n6(r.upper)})</option>`).join("");
      if (prev && Number(prev) <= t.rows.length) sel.value = prev;
      renderFreqAnswer();
      $("freq-hist").innerHTML = Charts.freqHistogram(t.rows);
    } catch (e) {
      freqTable = null;
      out.innerHTML = `<div class="card error">${esc(e.message)}</div>`;
      $("freq-answer").innerHTML = "";
      $("freq-hist").innerHTML = "";
    }
  }

  function renderFreqAnswer() {
    const t = freqTable;
    const q = $("freq-q").value;
    $("freq-qclass-wrap").hidden = q === "width";
    if (!t) return;
    const i = Number($("freq-qclass").value || 1) - 1;
    const r = t.rows[i];
    const name = `${ordinal(r.index)} class (${n6(r.lower)} – ${n6(r.upper)})`;
    let steps = [], answer, question, tip;

    if (q === "cum") {
      question = `Cumulative frequency of the ${name}`;
      tip = "cum-freq";
      steps.push(`Find the frequency of the ${ordinal(r.index)} class → <b>${n6(r.freq)}</b>.`);
      steps.push(`Add the frequencies of all classes up to and including it:<br>${t.rows.slice(0, i + 1).map((x) => `${ordinal(x.index)} class: ${n6(x.freq)}`).join("<br>")}`);
      steps.push(
        i === 0
          ? `It's the first class, so nothing comes before it: cumulative frequency = <b>${n6(r.cumFreq)}</b>`
          : `Cumulative frequency = ${t.rows.slice(0, i + 1).map((x) => n6(x.freq)).join(" + ")} = <b>${n6(r.cumFreq)}</b>`
      );
      answer = n6(r.cumFreq);
    } else if (q === "lb") {
      question = `Lower class boundary of the ${name}`;
      tip = "lower-boundary";
      steps.push(`Identify the class → ${n6(r.lower)} – ${n6(r.upper)}.`);
      steps.push(`Its lower limit is <b>${n6(r.lower)}</b>.`);
      if (i > 0) {
        const p = t.rows[i - 1];
        steps.push(`Gap to the previous class: lower limit of ${ordinal(r.index)} − upper limit of ${ordinal(p.index)} = ${n6(r.lower)} − ${n6(p.upper)} = <b>${n6(r.gapBelow)}</b>`);
      } else {
        steps.push(`This is the first class, so use the same gap as the other classes = <b>${n6(r.gapBelow)}</b>`);
      }
      steps.push(`Divide the gap by 2 → ${n6(r.gapBelow)} ÷ 2 = <b>${n6(r.gapBelow / 2)}</b>`);
      steps.push(`Subtract from the lower limit → ${n6(r.lower)} − ${n6(r.gapBelow / 2)} = <b>${n6(r.lowerBoundary)}</b>`);
      answer = n6(r.lowerBoundary);
    } else if (q === "ub") {
      question = `Upper class boundary of the ${name}`;
      tip = "upper-boundary";
      steps.push(`Identify the class → ${n6(r.lower)} – ${n6(r.upper)}.`);
      steps.push(`Its upper limit is <b>${n6(r.upper)}</b>.`);
      if (i < t.rows.length - 1) {
        const nx = t.rows[i + 1];
        steps.push(`Gap to the next class: lower limit of ${ordinal(nx.index)} − upper limit of ${ordinal(r.index)} = ${n6(nx.lower)} − ${n6(r.upper)} = <b>${n6(r.gapAbove)}</b>`);
      } else {
        steps.push(`This is the last class, so use the same gap as the other classes = <b>${n6(r.gapAbove)}</b>`);
      }
      steps.push(`Divide the gap by 2 → ${n6(r.gapAbove)} ÷ 2 = <b>${n6(r.gapAbove / 2)}</b>`);
      steps.push(`Add to the upper limit → ${n6(r.upper)} + ${n6(r.gapAbove / 2)} = <b>${n6(r.upperBoundary)}</b>`);
      answer = n6(r.upperBoundary);
    } else if (q === "width") {
      question = "Class width";
      tip = "class-width";
      if (t.rows.length < 2) {
        steps.push("Add at least two classes to find the width.");
        answer = "—";
      } else {
        const a = t.rows[0], b = t.rows[1];
        steps.push(`Pick two consecutive classes: lower limit of 1st = ${n6(a.lower)}, lower limit of 2nd = ${n6(b.lower)}.`);
        steps.push(`Subtract → ${n6(b.lower)} − ${n6(a.lower)} = <b>${n6(t.width)}</b>`);
        steps.push(`Verify with upper limits → ${n6(b.upper)} − ${n6(a.upper)} = ${n6(b.upper - a.upper)} ${Math.abs(b.upper - a.upper - t.width) < 1e-9 ? "✓ same" : "✗ different — check the table"}`);
        if (!t.uniformWidth) steps.push("⚠️ Not every pair of classes has the same width.");
        answer = n6(t.width);
      }
    } else if (q === "mid") {
      question = `Midpoint of the ${name}`;
      tip = "midpoint";
      steps.push(`Add the lower and upper limits → ${n6(r.lower)} + ${n6(r.upper)} = ${n6(r.lower + r.upper)}`);
      steps.push(`Divide by 2 → ${n6(r.lower + r.upper)} ÷ 2 = <b>${n6(r.midpoint)}</b>`);
      answer = n6(r.midpoint);
    } else {
      question = `Relative frequency of the ${name}`;
      tip = "rel-freq";
      steps.push(`Total frequency n = ${t.rows.map((x) => n6(x.freq)).join(" + ")} = ${n6(t.total)}`);
      steps.push(`Divide the class frequency by n → ${n6(r.freq)} ÷ ${n6(t.total)} = <b>${Stats.fmt(r.relFreq, 4)}</b> (${Stats.fmt(r.relFreq * 100, 2)}%)`);
      answer = `${Stats.fmt(r.relFreq, 4)}`;
    }

    $("freq-answer").innerHTML = `
      <h3>${esc(question)}</h3>
      <p class="answer big" data-tip="${tip}">${esc(answer)}</p>
      <ol class="steps">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>`;
  }

  $("freq-rows").addEventListener("input", renderFreq);
  $("freq-title").addEventListener("input", renderFreq);
  $("freq-add").addEventListener("click", () => { addFreqRow(); });
  $("freq-q").addEventListener("change", renderFreqAnswer);
  $("freq-qclass").addEventListener("change", renderFreqAnswer);
  $("freq-preset").addEventListener("change", () => {
    const p = PRESETS[$("freq-preset").value];
    if (p) setFreqClasses(p.classes, p.title);
  });
  $("freq-build").addEventListener("click", () => {
    const parsed = Stats.parseData($("data-input").value);
    try {
      const k = Number($("freq-k").value);
      const b = Stats.buildClasses(parsed.values, parsed.raw, k);
      setFreqClasses(b.classes.map((c) => [c.lower, c.upper, c.freq]), "My data");
      $("freq-preset").value = "";
      $("freq-build-steps").innerHTML =
        `Range = ${n6(b.max)} − ${n6(b.min)} = ${n6(b.max - b.min)}. ` +
        `Width = ${n6(b.max - b.min)} ÷ ${k} = ${n6(b.rawWidth)} → ${b.exact ? `divides evenly, so add one unit (${n6(b.unit)})` : `round up to the next ${n6(b.unit)}`} = <b>${n6(b.width)}</b>. ` +
        `First lower limit = min = ${n6(b.min)}; upper limits = next lower limit − ${n6(b.unit)}.`;
    } catch (e) {
      $("freq-build-steps").innerHTML = `<span class="warning">${esc(e.message)}</span>`;
    }
  });
  $("freq-preset").value = "scores";
  setFreqClasses(PRESETS.scores.classes, PRESETS.scores.title);

  // ---------------- Coefficient of Variation ----------------
  let cvCount = 0;
  function addCvGroup(label, data, m, sd) {
    cvCount++;
    const id = cvCount;
    const div = document.createElement("div");
    div.className = "cv-group";
    div.dataset.id = id;
    div.innerHTML = `
      <label>Group name<input type="text" class="cv-label" value="${esc(label || `Group ${id}`)}" /></label>
      <label data-tip="cv-data">Raw data (optional)<textarea class="cv-data" rows="3" placeholder="leave blank to enter mean and SD">${esc(data || "")}</textarea></label>
      <div class="grid2 tight">
        <label data-tip="cv-mean">Mean<input type="number" step="any" class="cv-mean" value="${m ?? ""}" /></label>
        <label data-tip="cv-sd">Std. deviation<input type="number" step="any" class="cv-sd" value="${sd ?? ""}" /></label>
      </div>
      ${id > 2 ? `<button class="link cv-remove">Remove</button>` : ""}`;
    $("cv-groups").appendChild(div);
    div.addEventListener("input", renderCv);
    const rm = div.querySelector(".cv-remove");
    if (rm) rm.addEventListener("click", () => { div.remove(); renderCv(); });
  }

  function renderCv() {
    const places = Number($("cv-round").value);
    const kind = document.querySelector('input[name="cv-kind"]:checked').value;
    const items = [];
    const errors = [];
    document.querySelectorAll(".cv-group").forEach((g) => {
      const label = g.querySelector(".cv-label").value || "Group";
      const parsed = Stats.parseData(g.querySelector(".cv-data").value);
      let m, sd, source;
      if (parsed.values.length) {
        try {
          const r = Stats.spread(parsed.values, kind);
          m = r.mean; sd = r.sd; source = `from ${parsed.values.length} data values (${kind})`;
          g.querySelector(".cv-mean").placeholder = Stats.fmt(m, 4);
          g.querySelector(".cv-sd").placeholder = Stats.fmt(sd, 4);
        } catch (e) {
          errors.push(`${label}: ${e.message}`);
          return;
        }
      } else {
        m = parseFloat(g.querySelector(".cv-mean").value);
        sd = parseFloat(g.querySelector(".cv-sd").value);
        source = "from given mean and SD";
      }
      if (!Number.isFinite(m) || !Number.isFinite(sd)) return;
      if (m === 0) { errors.push(`${label}: CV is undefined when the mean is 0.`); return; }
      const cv = Stats.coefficientOfVariation(sd, m);
      items.push({ label, m, sd, cv, cvText: `${Stats.fmt(cv, places)}%`, source });
    });

    const out = $("cv-results");
    if (!items.length) {
      out.innerHTML = errors.length ? `<div class="card error">${errors.map(esc).join("<br>")}</div>` : "";
      return;
    }
    const best = items.reduce((a, b) => (b.cv < a.cv ? b : a));
    const steps = items
      .map(
        (it) => `<li${tipAttrs("cv", `(${Stats.fmt(it.sd, 4)} ÷ ${Stats.fmt(it.m, 4)}) × 100 = ${it.cvText}`)}><strong>${esc(it.label)}</strong> (${esc(it.source)}): CV = (${Stats.fmt(it.sd, 4)} ÷ ${Stats.fmt(it.m, 4)}) × 100% = ${Stats.fmt((it.sd / it.m), 6)} × 100% ≈ <strong>${esc(it.cvText)}</strong></li>`
      )
      .join("");
    out.innerHTML = `
      <div class="card">
        <h2>Results</h2>
        ${Charts.cvBars(items)}
        <ol class="steps">${steps}</ol>
        ${items.length > 1 ? `<p class="answer">✅ <strong>${esc(best.label)}</strong> has the smallest CV (${esc(best.cvText)}), so it is the <strong>most consistent / stable</strong>.</p>` : ""}
        ${errors.length ? `<p class="warning">${errors.map(esc).join("<br>")}</p>` : ""}
      </div>`;
  }

  addCvGroup("Group A", "", 50, 5);
  addCvGroup("Group B", "", 200, 12);
  $("cv-add").addEventListener("click", () => { addCvGroup(); renderCv(); });
  $("cv-round").addEventListener("change", renderCv);
  document.querySelectorAll('input[name="cv-kind"]').forEach((el) => el.addEventListener("change", renderCv));

  // ---------------- Empirical Rule ----------------
  const MIDDLE = { 1: 68, 2: 95, 3: 99.7 };

  function describeZ(x, z, m, sd) {
    const k = Math.round(z);
    if (k === 0) return `X = ${x} is exactly the mean, so 50% of the data is on each side.`;
    const mid = MIDDLE[Math.abs(k)];
    const tail = Stats.round((100 - mid) / 2, 4);
    return `X = ${x} = μ ${k > 0 ? "+" : "−"} ${Math.abs(k)}σ. The middle ${mid}% lies within ${Math.abs(k)} standard deviation${Math.abs(k) > 1 ? "s" : ""} (${Stats.round(m - Math.abs(k) * sd, 6)} to ${Stats.round(m + Math.abs(k) * sd, 6)}). The other ${Stats.round(100 - mid, 4)}% is split evenly: ${tail}% in each tail.`;
  }

  function renderEmpirical() {
    const m = parseFloat($("emp-mean").value);
    const sd = parseFloat($("emp-sd").value);
    const mode = $("emp-mode").value;
    const x = parseFloat($("emp-x").value);
    const x2 = parseFloat($("emp-x2").value);
    $("emp-x2-wrap").hidden = mode !== "between";
    const out = $("emp-results");
    const chartPlaces = Math.min(4, Math.max(Stats.decimalPlaces($("emp-mean").value), Stats.decimalPlaces($("emp-sd").value)));

    if (![m, sd, x].every(Number.isFinite) || (mode === "between" && !Number.isFinite(x2))) {
      out.innerHTML = "";
      return;
    }
    try {
      const res = Stats.empirical(m, sd, mode, x, x2);
      let steps = `<li${tipAttrs("emp-x", `(${x} − ${m}) ÷ ${sd} = ${Stats.round(res.z1, 4)}`)}>How many standard deviations is X from the mean? z = (X − μ) ÷ σ = (${x} − ${m}) ÷ ${sd} = <strong>${Stats.round(res.z1, 4)}</strong></li>`;
      steps += `<li>${esc(describeZ(x, res.z1, m, sd))}</li>`;
      let question, a, b;
      if (mode === "below") {
        question = `What percentage is less than (no more than) ${x}?`;
        steps += `<li>“Less than / no more than X” = everything to the <strong>left</strong> of X = <strong>${res.percent}%</strong></li>`;
        a = -Infinity; b = x;
      } else if (mode === "above") {
        question = `What percentage is greater than (at least) ${x}?`;
        steps += `<li>“Greater than / at least X” = everything to the <strong>right</strong> of X = 100% − ${Stats.round(100 - res.percent, 4)}% = <strong>${res.percent}%</strong></li>`;
        a = x; b = Infinity;
      } else {
        const lo = Math.min(x, x2), hi = Math.max(x, x2);
        question = `What percentage is between ${lo} and ${hi}?`;
        steps += `<li${tipAttrs("emp-x", `(${x2} − ${m}) ÷ ${sd} = ${Stats.round(res.z2, 4)}`)}>z for X₂ = (${x2} − ${m}) ÷ ${sd} = <strong>${Stats.round(res.z2, 4)}</strong></li>`;
        steps += `<li>${esc(describeZ(x2, res.z2, m, sd))}</li>`;
        const bl = Stats.empiricalBelow(Stats.zScore(lo, m, sd));
        const bh = Stats.empiricalBelow(Stats.zScore(hi, m, sd));
        steps += `<li>Percent between = (percent below ${hi}) − (percent below ${lo}) = ${bh}% − ${bl}% = <strong>${res.percent}%</strong></li>`;
        a = lo; b = hi;
      }
      out.innerHTML = `
        <div class="card">
          <h2>${esc(question)}</h2>
          <p class="answer big"${tipAttrs("emp-answer", question + " → " + res.percent + "%")}>${res.percent}%</p>
          <ol class="steps">${steps}</ol>
        </div>`;
      $("emp-chart").innerHTML = Charts.bellCurve(m, sd, a, b, chartPlaces);
    } catch (e) {
      out.innerHTML = `<div class="card error">${esc(e.message)}</div>`;
      $("emp-chart").innerHTML = sd > 0 ? Charts.bellCurve(m, sd, undefined, undefined, chartPlaces) : "";
    }
  }

  ["emp-mean", "emp-sd", "emp-x", "emp-x2", "emp-mode"].forEach((id) => {
    $(id).addEventListener("input", renderEmpirical);
    $(id).addEventListener("change", renderEmpirical);
  });

  function useSpreadData(meanId, sdId, after) {
    if (!lastSpread) {
      alert("Enter valid data on the Spread tab first.");
      return;
    }
    $(meanId).value = Stats.fmt(lastSpread.mean, lastSpread.places);
    $(sdId).value = Stats.fmt(lastSpread.sd, lastSpread.places);
    after();
  }
  $("emp-use-data").addEventListener("click", () => useSpreadData("emp-mean", "emp-sd", renderEmpirical));

  // ---------------- Chebyshev ----------------
  function renderChebyshev() {
    const m = parseFloat($("ch-mean").value);
    const sd = parseFloat($("ch-sd").value);
    const mode = $("ch-mode").value;
    $("ch-percent-wrap").hidden = mode !== "percent";
    $("ch-k-wrap").hidden = mode !== "k";
    $("ch-lo-wrap").hidden = mode !== "interval";
    $("ch-hi-wrap").hidden = mode !== "interval";
    const out = $("ch-results");
    const places = Math.min(4, Math.max(2, Stats.decimalPlaces($("ch-mean").value), Stats.decimalPlaces($("ch-sd").value)));

    if (!Number.isFinite(m) || !(sd > 0)) {
      out.innerHTML = `<div class="card error">Enter a mean and a positive standard deviation.</div>`;
      $("ch-chart").innerHTML = "";
      return;
    }
    try {
      let k, steps = "", note = "";
      if (mode === "percent") {
        const p = parseFloat($("ch-percent").value);
        const exact = Stats.chebyshevK(p);
        k = Math.abs(exact - Math.round(exact)) < 0.01 ? Math.round(exact) : Stats.round(exact, 2);
        steps += `<li>Set the formula equal to the percentage: 1 − 1/k² = ${p / 100}</li>`;
        steps += `<li>1/k² = 1 − ${p / 100} = ${Stats.round(1 - p / 100, 6)}</li>`;
        steps += `<li>k² = 1 ÷ ${Stats.round(1 - p / 100, 6)} = ${Stats.round(1 / (1 - p / 100), 4)}</li>`;
        steps += `<li>k = √${Stats.round(1 / (1 - p / 100), 4)} = ${Stats.round(exact, 4)} ≈ <strong>${k}</strong></li>`;
      } else if (mode === "k") {
        k = parseFloat($("ch-k").value);
        steps += `<li>Percentage = (1 − 1/k²) × 100% = (1 − 1/${k}²) × 100% = (1 − ${Stats.round(1 / (k * k), 6)}) × 100% = <strong>${Stats.round(Stats.chebyshevPercent(k), 2)}%</strong></li>`;
      } else {
        const lo = parseFloat($("ch-lo").value);
        const hi = parseFloat($("ch-hi").value);
        const kHi = (hi - m) / sd;
        const kLo = (m - lo) / sd;
        steps += `<li>k for upper bound = (${hi} − ${m}) ÷ ${sd} = ${Stats.round(kHi, 4)}</li>`;
        steps += `<li>k for lower bound = (${m} − ${lo}) ÷ ${sd} = ${Stats.round(kLo, 4)}</li>`;
        k = Stats.round(Math.min(kHi, kLo), 6);
        if (Math.abs(kHi - kLo) > 1e-9) {
          note = `The interval is not symmetric around the mean, so only the smaller k (${k}) is guaranteed.`;
        }
        steps += `<li>Percentage = (1 − 1/${k}²) × 100% = <strong>${Stats.round(Stats.chebyshevPercent(k), 2)}%</strong></li>`;
      }

      const pct = Stats.chebyshevPercent(k);
      const { lower, upper } = Stats.chebyshevBounds(m, sd, k);
      steps += `<li>Lower bound = μ − kσ = ${m} − ${k} × ${sd} = <strong>${Stats.round(lower, places)}</strong></li>`;
      steps += `<li>Upper bound = μ + kσ = ${m} + ${k} × ${sd} = <strong>${Stats.round(upper, places)}</strong></li>`;

      let dataCheck = "";
      const usingData =
        lastSpread &&
        $("ch-mean").value === Stats.fmt(lastSpread.mean, lastSpread.places) &&
        $("ch-sd").value === Stats.fmt(lastSpread.sd, lastSpread.places);
      if (usingData) {
        const inside = lastSpread.values.filter((v) => v >= lower && v <= upper).length;
        dataCheck = `<p class="hint">Check with your data: ${inside} of ${lastSpread.values.length} values (${Stats.round((inside / lastSpread.values.length) * 100, 1)}%) are inside the interval — Chebyshev guarantees at least ${Stats.round(pct, 2)}%.</p>`;
      }

      const pctText = `${Stats.round(pct, 2)}%`;
      out.innerHTML = `
        <div class="card">
          <h2${tipAttrs("ch-bounds", `${m} − ${k} × ${sd} = ${Stats.round(lower, places)}\n${m} + ${k} × ${sd} = ${Stats.round(upper, places)}\n(1 − 1/${k}²) × 100 = ${pctText}`)}>At least ${pctText} of the data lies between ${Stats.round(lower, places)} and ${Stats.round(upper, places)}</h2>
          <ol class="steps">${steps}</ol>
          ${note ? `<p class="warning">${esc(note)}</p>` : ""}
          ${dataCheck}
        </div>`;
      $("ch-chart").innerHTML = Charts.chebyshevLine(m, sd, k, pctText, places, usingData ? lastSpread.values : null);
    } catch (e) {
      out.innerHTML = `<div class="card error">${esc(e.message)}</div>`;
      $("ch-chart").innerHTML = "";
    }
  }

  ["ch-mean", "ch-sd", "ch-mode", "ch-percent", "ch-k", "ch-lo", "ch-hi"].forEach((id) => {
    $(id).addEventListener("input", renderChebyshev);
    $(id).addEventListener("change", renderChebyshev);
  });
  document.querySelectorAll(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $("ch-mode").value = "k";
      $("ch-k").value = chip.dataset.k;
      renderChebyshev();
    })
  );
  $("ch-use-data").addEventListener("click", () => useSpreadData("ch-mean", "ch-sd", renderChebyshev));

  renderSpread();
  renderLocation();
  renderSkew();
  renderMissing();
  renderCv();
  renderEmpirical();
  renderChebyshev();
})();
