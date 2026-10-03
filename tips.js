(function (root) {
  "use strict";

  // Each tip: title + body (HTML). Elements reference these with data-tip="key".
  // An element may also carry data-tip-calc="..." (plain text) showing the calculation with real numbers.
  const TIPS = {
    // ----- Data entry -----
    "data-input": {
      title: "Your data",
      body: "Type or paste numbers separated by commas, spaces, or new lines. Everything on this tab recalculates as you type.",
    },
    file: {
      title: "Load a file",
      body: "Pick a .csv or .txt file. If it has several columns you'll be asked which column to use; header rows are skipped.",
    },
    "kind-sample": {
      title: "Sample (n)",
      body: "A <em>subset</em> of a larger group. Variance divides by <b>n − 1</b>:<div class='f'>s² = Σ(x − x̄)² ÷ (n − 1)</div>Use when the problem says “sample” or gives only part of the group.",
    },
    "kind-population": {
      title: "Population (N)",
      body: "The <em>entire</em> group of interest. Variance divides by <b>N</b>:<div class='f'>σ² = Σ(x − μ)² ÷ N</div>Use when the problem says “population” or gives ALL the data.",
    },
    rounding: {
      title: "Rounding rule",
      body: "Count the decimal places in the original data, then round variance / standard deviation to <b>one more</b> place.<div class='f'>4, 8, 12 → 1 decimal<br>4.5, 8.2 → 2 decimals</div>Round only the final answer, never intermediate steps.",
    },

    // ----- Spread statistics -----
    count: {
      title: "Count (n or N)",
      body: "Count how many data values there are. Use <b>n</b> for a sample and <b>N</b> for a population.",
    },
    mean: {
      title: "Mean (x̄ or μ)",
      body: "Add all the numbers, then divide by how many there are.<div class='f'>x̄ = Σx ÷ n</div>",
    },
    range: {
      title: "Range",
      body: "Largest value minus smallest value.<div class='f'>Range = Max − Min</div>Example: 3, 7, 15 → 15 − 3 = 12",
    },
    variance: {
      title: "Variance (s² or σ²)",
      body: "<ol><li>Find the mean.</li><li>Subtract the mean from each value: (x − x̄)</li><li>Square each deviation.</li><li>Add them up: Σ(x − x̄)²</li><li>Divide by <b>n − 1</b> (sample) or <b>N</b> (population).</li></ol>Units are <em>squared</em>.",
    },
    sd: {
      title: "Standard deviation (s or σ)",
      body: "Take the square root of the variance.<div class='f'>s = √s²</div>It's the typical distance of values from the mean, in the same units as the data.",
    },
    cv: {
      title: "Coefficient of variation (CV)",
      body: "<ol><li>Divide the standard deviation by the mean.</li><li>Multiply by 100.</li><li>Add the % sign.</li></ol><div class='f'>CV = (s ÷ x̄) × 100%</div>Lower CV = more consistent.",
    },
    median: {
      title: "Median",
      body: "Sort the data. With an odd count, take the middle value; with an even count, average the two middle values.",
    },

    // ----- Work table -----
    "col-x": { title: "x", body: "Each original data value." },
    "col-dev": {
      title: "Deviation (x − x̄)",
      body: "Subtract the mean from the value. Negative = below the mean, positive = above. Deviations always add up to 0.",
    },
    "col-sq": {
      title: "Squared deviation (x − x̄)²",
      body: "Multiply the deviation by itself. Squaring makes every value positive so they don't cancel out.",
    },
    "sum-sq": {
      title: "Sum of squares Σ(x − x̄)²",
      body: "Add up every number in the squared-deviation column. This is the numerator of the variance.",
    },

    // ----- Charts (spread) -----
    dot: {
      title: "Data value",
      body: "Each dot is one value. Stacked dots are repeated values.<div class='f'>z = (x − x̄) ÷ s</div>tells how many standard deviations it sits from the mean.",
    },
    "band-1": {
      title: "Within 1 standard deviation",
      body: "From x̄ − 1s to x̄ + 1s. If the data is bell-shaped, about <b>68%</b> of values fall here.",
    },
    "band-2": {
      title: "Within 2 standard deviations",
      body: "From x̄ − 2s to x̄ + 2s. Bell-shaped: about <b>95%</b>. Any shape (Chebyshev): at least <b>75%</b>.",
    },
    "band-3": {
      title: "Within 3 standard deviations",
      body: "From x̄ − 3s to x̄ + 3s. Bell-shaped: about <b>99.7%</b>. Any shape (Chebyshev): at least <b>88.9%</b>.",
    },
    "mean-line": {
      title: "Mean line",
      body: "Marks the mean (Σx ÷ n), the balance point of the data.",
    },
    "sd-tick": {
      title: "Standard deviation mark",
      body: "Each tick is the mean plus or minus a whole number of standard deviations.<div class='f'>x̄ ± k·s</div>",
    },
    bar: {
      title: "Histogram bar",
      body: "The height is how many values fall in this interval (its frequency). Each interval has the same width:<div class='f'>width = (Max − Min) ÷ number of bins</div>",
    },

    // ----- CV tab -----
    "cv-formula": {
      title: "Coefficient of variation",
      body: "Standard deviation as a percentage of the mean, so groups with different units or sizes can be compared. Smaller CV = more consistent / stable.",
    },
    "cv-data": {
      title: "Raw data (optional)",
      body: "If you enter data, the app computes the mean and standard deviation for you (sample or population, per the toggle above). Leave it blank to type them in yourself.",
    },
    "cv-mean": { title: "Mean", body: "The group's average (Σx ÷ n). Used as the denominator of CV." },
    "cv-sd": { title: "Standard deviation", body: "The group's standard deviation. Used as the numerator of CV." },
    "cv-round": {
      title: "Rounding CV",
      body: "Problems usually specify this, e.g. “round to two decimal places”. Round only the final percentage.",
    },
    "cv-bar": {
      title: "CV bar",
      body: "Bar length = CV. The <span style='color:#16a34a'><b>green</b></span> bar has the smallest CV, so that group is the most consistent.",
    },

    // ----- Empirical rule -----
    "emp-rule": {
      title: "Empirical Rule (68-95-99.7)",
      body: "Only for <b>bell-shaped / normal</b> data.<ul><li>68% within μ ± 1σ</li><li>95% within μ ± 2σ</li><li>99.7% within μ ± 3σ</li></ul>",
    },
    "emp-mean": { title: "Mean (μ)", body: "The centre of the bell curve. Given in the problem, or computed from data (Σx ÷ N)." },
    "emp-sd": { title: "Standard deviation (σ)", body: "The width of one step on the bell curve. Given in the problem, or computed from data." },
    "emp-mode": {
      title: "Question type",
      body: "<ul><li><b>Less than / no more than / at most</b> = everything to the <em>left</em> of X.</li><li><b>Greater than / at least</b> = everything to the <em>right</em> of X.</li><li><b>Between</b> = the area between the two values.</li></ul>",
    },
    "emp-x": {
      title: "X",
      body: "First find how many standard deviations X is from the mean:<div class='f'>z = (X − μ) ÷ σ</div>For the Empirical Rule this must be a whole number from −3 to 3.",
    },
    "emp-answer": {
      title: "How the percentage is found",
      body: "<ol><li>Find z = (X − μ) ÷ σ.</li><li>The middle (68, 95 or 99.7%) lies within |z| SDs.</li><li>Split the rest evenly between the two tails.</li><li>Add up the pieces on the side the question asks about.</li></ol>Example: X = μ + 2σ → tails are 2.5% each → “no more than X” = 100% − 2.5% = 97.5%.",
    },
    "bell-34": {
      title: "34% (mean to 1σ)",
      body: "Half of the middle 68%:<div class='f'>68% ÷ 2 = 34%</div>",
    },
    "bell-13.5": {
      title: "13.5% (1σ to 2σ)",
      body: "Half of the difference between 95% and 68%:<div class='f'>(95% − 68%) ÷ 2 = 13.5%</div>",
    },
    "bell-2.35": {
      title: "2.35% (2σ to 3σ)",
      body: "Half of the difference between 99.7% and 95%:<div class='f'>(99.7% − 95%) ÷ 2 = 2.35%</div>",
    },
    "bell-0.15": {
      title: "0.15% (beyond 3σ)",
      body: "Half of what's left outside 99.7%:<div class='f'>(100% − 99.7%) ÷ 2 = 0.15%</div>",
    },

    // ----- Chebyshev -----
    "ch-formula": {
      title: "Chebyshev's Theorem",
      body: "Works for <b>any</b> distribution shape. At least<div class='f'>(1 − 1/k²) × 100%</div>of the data lies within k standard deviations of the mean (k > 1).<br>k = 2 → 75%, k = 3 → 88.9%, k = 4 → 93.75%",
    },
    "ch-mean": { title: "Mean (μ)", body: "The centre of the interval. Given in the problem, or computed from data." },
    "ch-sd": { title: "Standard deviation (σ)", body: "Multiplied by k to get how far the interval reaches on each side." },
    "ch-mode": {
      title: "What do you know?",
      body: "Pick what the problem gives you: a percentage, the number of standard deviations k, or an interval (lower and upper bound).",
    },
    "ch-percent": {
      title: "Percentage → k",
      body: "<ol><li>Set 1 − 1/k² = percent ÷ 100.</li><li>1/k² = 1 − p</li><li>k² = 1 ÷ (1 − p)</li><li>k = √(1 ÷ (1 − p))</li></ol>Example: 88.9% → k ≈ 3",
    },
    "ch-k": {
      title: "k → percentage",
      body: "<div class='f'>(1 − 1/k²) × 100%</div>Example: k = 2 → (1 − 1/4) × 100% = 75%",
    },
    "ch-interval": {
      title: "Interval → k",
      body: "Find how many standard deviations each bound is from the mean:<div class='f'>k = (upper − μ) ÷ σ<br>k = (μ − lower) ÷ σ</div>Then plug k into 1 − 1/k².",
    },
    "ch-bounds": {
      title: "Chebyshev interval",
      body: "<div class='f'>Lower = μ − kσ<br>Upper = μ + kσ</div>At least (1 − 1/k²) of the data is between these bounds, whatever the shape.",
    },
    chip: {
      title: "Memorised values",
      body: "Plug k into 1 − 1/k²:<div class='f'>k=2: 1 − 1/4 = 75%<br>k=3: 1 − 1/9 ≈ 88.9%<br>k=4: 1 − 1/16 = 93.75%</div>",
    },
    // ----- Measures of location -----
    "use-data-loc": { title: "Use my Spread data", body: "Copies the numbers from the Spread tab into this box." },
    "loc-round": {
      title: "Rounding",
      body: "Means are rounded to one more decimal place than the data (auto). Medians, modes and percentiles are data values (or averages of two), so they're shown exactly.",
    },
    "pct-method": {
      title: "Percentile method",
      body: "Textbooks differ:<ul><li><b>L = (P/100)·n</b>: if L is whole, average the Lth and (L+1)th values; otherwise round L up and take that value.</li><li><b>L = (P/100)·(n + 1)</b>: interpolate between the values around position L.</li></ul>Pick the one your class uses.",
    },
    "pct-find": {
      title: "Pth percentile",
      body: "The value with about P% of the data below it.<ol><li>Sort the data.</li><li>Find the locator L.</li><li>Use L to find the position (see method).</li></ol>",
    },
    "pct-rank": {
      title: "Percentile rank of a value",
      body: "<div class='f'>percentile = (number of values below x ÷ n) × 100</div>Round to the nearest whole number.",
    },
    "loc-mean": {
      title: "Mean (arithmetic average)",
      body: "<ol><li>Add all values (watch negative signs).</li><li>Count the values.</li><li>Divide the sum by the count.</li></ol><div class='f'>x̄ = Σx ÷ n</div>Best for symmetric data; very sensitive to outliers.",
    },
    "loc-median": {
      title: "Median",
      body: "<ol><li>Sort from smallest to largest.</li><li>Odd n: the value at position (n + 1) ÷ 2.</li><li>Even n: average the two middle values.</li></ol>Resistant to outliers — best for skewed data.",
    },
    "loc-mode": {
      title: "Mode",
      body: "<ol><li>Count how many times each value appears.</li><li>Find the highest frequency.</li><li>Every value with that frequency is a mode.</li></ol>If all values appear equally often there's no mode.",
    },
    "mode-types": {
      title: "Mode classification",
      body: "<ul><li><b>No mode</b>: every value appears equally often.</li><li><b>Unimodal</b>: one mode.</li><li><b>Bimodal</b>: two modes.</li><li><b>Multimodal</b>: three or more.</li></ul>",
    },
    quartiles: {
      title: "Quartiles",
      body: "Split sorted data into 4 equal parts.<div class='f'>Q1 = P25, Q2 = P50 = median, Q3 = P75</div>",
    },
    quintiles: { title: "Quintiles", body: "Split sorted data into 5 equal parts: P20, P40, P60, P80." },
    deciles: { title: "Deciles", body: "Split sorted data into 10 equal parts: D1 = P10, D2 = P20, … D9 = P90." },
    "min-max": { title: "Minimum / maximum", body: "The smallest and largest values — the ends of the box plot's whiskers." },
    iqr: { title: "Box (interquartile range)", body: "The box runs from Q1 to Q3 and holds the middle 50% of the data.<div class='f'>IQR = Q3 − Q1</div>" },
    "geo-mean": {
      title: "Geometric mean",
      body: "Multiply all n values, then take the nth root.<div class='f'>ⁿ√(x₁ × x₂ × … × xₙ)</div>Used for growth rates and ratios (investment returns, population growth). Needs all values > 0.",
    },
    "harm-mean": {
      title: "Harmonic mean",
      body: "Divide n by the sum of the reciprocals.<div class='f'>n ÷ (1/x₁ + 1/x₂ + … + 1/xₙ)</div>Used for averaging rates, e.g. speed over equal distances.",
    },
    midrange: {
      title: "Midrange",
      body: "<div class='f'>(Max + Min) ÷ 2</div>Simple, but very sensitive to outliers.",
    },
    trimean: {
      title: "Trimean",
      body: "A weighted average of the quartiles:<div class='f'>(Q1 + 2 × Q2 + Q3) ÷ 4</div>More robust than the mean, less than the median.",
    },
    winsor: {
      title: "Winsorized mean",
      body: "<ol><li>Sort the data.</li><li>k = n × percent, rounded down.</li><li>Replace the k smallest values with the next smallest kept value, and the k largest with the next largest.</li><li>Take the ordinary mean.</li></ol>Reduces the effect of outliers without discarding data.",
    },
    "skew-shape": {
      title: "Mean, median and mode by shape",
      body: "<ul><li><b>Symmetric</b>: mean = median = mode (center).</li><li><b>Skewed right</b> (tail right): Mode → Median → Mean, left to right.</li><li><b>Skewed left</b> (tail left): Mean → Median → Mode.</li></ul>The mean is always pulled toward the tail; the mode is at the peak.",
    },
    "skew-letters": {
      title: "Letters on your graph",
      body: "Type the letters exactly as they appear on the graph from left to right. The app tells you which letter is the mean, median and mode.",
    },

    // ----- Averages -----
    weighted: {
      title: "Weighted mean",
      body: "<ol><li>Multiply each value by its weight (w × x).</li><li>Add the products: Σ(w × x).</li><li>Add the weights: Σw.</li><li>Divide: Σ(w × x) ÷ Σw.</li></ol>Used for GPAs, graded categories, etc.",
    },
    weight: { title: "Weight (w)", body: "How much each value counts (credits, percentage of grade, quantity…). Bigger weight = more influence." },
    "wm-x": { title: "Data value (x)", body: "The value being averaged (grade, score, price…)." },
    wx: { title: "w × x", body: "Multiply the weight by its data value. Add this column for the numerator." },
    "moving-avg": {
      title: "Moving average",
      body: "Average a period with the periods right before it.<ul><li><b>2-period</b>: (this + previous) ÷ 2</li><li><b>3-period</b>: (this + 2 previous) ÷ 3</li></ul>Example: 2007 3-period = (18,828 + 15,677 + 13,780) ÷ 3 = 16,095. It smooths out ups and downs to show the trend.",
    },
    "ma-k": { title: "Period k", body: "How many consecutive periods to average. The first k − 1 periods have no moving average because they lack earlier data." },
    "ma-target": { title: "Which period", body: "The period (e.g. year) you want the moving average for. It uses that period and the k − 1 before it." },
    "ma-label": { title: "Period label", body: "The time label, such as a year or month. Periods must be in time order." },
    "ma-value": { title: "Value", body: "The measurement for that period (e.g. number of deaths that year)." },
    missing: {
      title: "Missing value from the mean",
      body: "<ol><li>Total of all values = mean × n.</li><li>Add the known values.</li><li>Missing value = total − known sum.</li></ol>Example: 39.04 × 6 = 234.24; 234.24 − 187.12 = 47.12",
    },
    "missing-mean": { title: "Mean of all values", body: "The average of the complete data set, including the missing value." },
    "missing-n": { title: "Total number of values", body: "How many values there are in total, including the missing one. Total sum = mean × n." },
    "missing-known": { title: "Known values", body: "The values you already know. They're added and subtracted from the total." },

    // ----- Data types -----
    discrete: {
      title: "Discrete or continuous?",
      body: "<b>Discrete</b> = countable values from <em>counting</em> (cars, people, die rolls — you can't have 2.5 cars).<br><b>Continuous</b> = any value in a range from <em>measuring</em> (height, time, temperature).<br>Ask: “Did I count it or measure it?”",
    },
    "why-discrete": {
      title: "Why recorded data looks discrete",
      body: "Tools have limited resolution, computers store finite bits, we group values into categories, signals are sampled at intervals, and storage is finite. So reality may be continuous, but the numbers we write down are separate, finite pieces.",
    },

    // ----- Frequency table -----
    "freq-preset": {
      title: "Example tables",
      body: "Loads one of the worked examples: hours of TV per week, or test scores.",
    },
    "lower-limit": {
      title: "Lower class limit",
      body: "The smallest value that can belong to the class. In 48 – 65 the lower limit is 48.",
    },
    "upper-limit": {
      title: "Upper class limit",
      body: "The largest value that can belong to the class. In 48 – 65 the upper limit is 65.",
    },
    frequency: {
      title: "Frequency (f)",
      body: "How many data values fall in the class. Count the values between its lower and upper limits.",
    },
    "class-width": {
      title: "Class width",
      body: "Subtract the lower limit of one class from the lower limit of the next:<div class='f'>width = next lower − this lower</div>Check with upper limits: next upper − this upper should match.<br>Example: 48 − 30 = 18",
    },
    gap: {
      title: "Gap between classes",
      body: "<div class='f'>gap = next lower limit − this upper limit</div>Example: 102 − 101 = 1. Half the gap (0.5) is used to find the boundaries.",
    },
    "lower-boundary": {
      title: "Lower class boundary",
      body: "<ol><li>Find the gap: this lower limit − previous upper limit.</li><li>Divide the gap by 2.</li><li>Subtract that from the lower limit.</li></ol><div class='f'>LB = lower limit − gap ÷ 2</div>Example: 102 − 1 ÷ 2 = 101.5",
    },
    "upper-boundary": {
      title: "Upper class boundary",
      body: "<ol><li>Find the gap: next lower limit − this upper limit.</li><li>Divide the gap by 2.</li><li>Add that to the upper limit.</li></ol><div class='f'>UB = upper limit + gap ÷ 2</div>Example: 65 + 1 ÷ 2 = 65.5",
    },
    midpoint: {
      title: "Midpoint (class mark)",
      body: "Average the two class limits:<div class='f'>midpoint = (lower + upper) ÷ 2</div>Example: (48 + 65) ÷ 2 = 56.5",
    },
    "cum-freq": {
      title: "Cumulative frequency",
      body: "Add the frequency of this class and every class before it.<div class='f'>CF = f₁ + f₂ + … + this f</div>Example: 12 + 3 + 4 = 19. The last class's CF equals the total.",
    },
    "rel-freq": {
      title: "Relative frequency",
      body: "The class's share of all the data:<div class='f'>relative f = f ÷ n</div>Relative frequencies add up to 1 (100%).",
    },
    "total-freq": {
      title: "Total (n)",
      body: "Add every class frequency. This is the number of data values, and equals the last cumulative frequency.",
    },
    "build-classes": {
      title: "Building classes from raw data",
      body: "<ol><li>Range = max − min.</li><li>Width = range ÷ number of classes, rounded <b>up</b> (if it divides evenly, add one unit so the max still fits).</li><li>First lower limit = min; each next lower limit = previous + width.</li><li>Upper limit = next lower limit − one unit.</li><li>Tally values into each class.</li></ol>",
    },
    "freq-question": {
      title: "Answer a question",
      body: "Pick what the problem asks for and which class; the full step-by-step solution appears below.",
    },
    "freq-bar": {
      title: "Histogram bar",
      body: "Each bar spans from the class's lower boundary to its upper boundary (so bars touch), and its height is the class frequency.",
    },

    "use-data": {
      title: "Use my data",
      body: "Copies the mean and standard deviation calculated on the Spread tab (rounded per the rounding rule) into this calculator.",
    },
  };

  const tipEl = document.createElement("div");
  tipEl.className = "tooltip";
  tipEl.setAttribute("role", "tooltip");
  tipEl.hidden = true;
  document.body.appendChild(tipEl);

  let current = null;
  let enabled = localStorage.getItem("hoverTips") !== "off";

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function render(target) {
    const tip = TIPS[target.dataset.tip];
    if (!tip) return false;
    const calc = target.dataset.tipCalc;
    tipEl.innerHTML =
      `<div class="tt-title">${tip.title}</div><div class="tt-body">${tip.body}</div>` +
      (calc ? `<div class="tt-calc"><span>With your numbers:</span>${esc(calc).replace(/\n/g, "<br>")}</div>` : "");
    return true;
  }

  function place(x, y) {
    const pad = 14;
    const r = tipEl.getBoundingClientRect();
    let left = x + pad;
    let top = y + pad;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
    tipEl.style.left = `${Math.max(8, left)}px`;
    tipEl.style.top = `${Math.max(8, top)}px`;
  }

  function show(target, x, y) {
    if (!enabled || !render(target)) return;
    current = target;
    tipEl.hidden = false;
    place(x, y);
  }

  function hide() {
    current = null;
    tipEl.hidden = true;
  }

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t === current) return;
    if (t) show(t, e.clientX, e.clientY);
    else hide();
  });
  document.addEventListener("mousemove", (e) => {
    if (current) place(e.clientX, e.clientY);
  });
  document.addEventListener("mouseleave", hide);
  document.addEventListener("scroll", hide, true);

  document.addEventListener("focusin", (e) => {
    const t = e.target.closest("[data-tip]");
    if (!t) return;
    const r = t.getBoundingClientRect();
    show(t, r.left, r.bottom);
  });
  document.addEventListener("focusout", hide);

  function setEnabled(on) {
    enabled = on;
    localStorage.setItem("hoverTips", on ? "on" : "off");
    document.body.classList.toggle("tips-off", !on);
    if (!on) hide();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("tips-toggle");
    if (toggle) {
      toggle.checked = enabled;
      toggle.addEventListener("change", () => setEnabled(toggle.checked));
    }
    document.body.classList.toggle("tips-off", !enabled);
  });

  root.Tips = { TIPS, setEnabled };
})(typeof globalThis !== "undefined" ? globalThis : this);
