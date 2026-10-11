(function (root) {
  "use strict";

  // letters: [first letter/word of the phrase, what it stands for]
  const MNEMONICS = [
    {
      id: "noir",
      name: "NOIR",
      letters: [["N", "Nominal"], ["O", "Ordinal"], ["I", "Interval"], ["R", "Ratio"]],
      formula: "Nominal → Ordinal → Interval → Ratio (each level adds something)",
      triggers: ["level of measurement", "levels of measurement", "nominal", "ordinal", "interval", "ratio", "classify the data", "type of data"],
      weak: ["interval", "ratio"],
      when: "The question asks you to categorize what <em>type</em> of data you're looking at (like “Year,” “Temperature,” or “Eye Color”).",
      steps: [
        "No order, just names/labels → <b>Nominal</b> (eye color, jersey numbers)",
        "Has an order, but differences aren't meaningful → <b>Ordinal</b> (rankings, letter grades)",
        "Differences are meaningful, but no true zero → <b>Interval</b> (year, temperature in °F/°C)",
        "Has a true zero, so ratios make sense → <b>Ratio</b> (height, weight, time, money)",
      ],
      goto: "levels",
      gotoLabel: "Levels",
    },
    {
      id: "variance",
      name: "My Silly Sister Sings Daily",
      letters: [["My", "Mean"], ["Silly", "Subtract"], ["Sister", "Square"], ["Sings", "Sum"], ["Daily", "Divide (by n − 1)"]],
      formula: "s² = Σ(x − x̄)² ÷ (n − 1)    then    s = √s²",
      triggers: ["sample variance", "sample standard deviation", "variance", "standard deviation", "calculate the spread", "sum of squares"],
      weak: ["variance", "standard deviation"],
      when: "You're given a list of raw numbers (like 12, 16, 16, 17…) and asked for the variance or standard deviation.",
      steps: [
        "<b>Mean</b>: find x̄ = Σx ÷ n",
        "<b>Subtract</b>: x − x̄ for every value",
        "<b>Square</b>: (x − x̄)²",
        "<b>Sum</b>: add the squares, Σ(x − x̄)²",
        "<b>Divide</b>: by n − 1 for a sample (by N for a population) → variance",
      ],
      note: "If it asks for <b>standard deviation</b>, do the mnemonic steps, then take the <b>square root</b> at the very end.",
      goto: "spread",
      gotoLabel: "Spread",
    },
    {
      id: "cv",
      name: "Sandwich over Meat",
      letters: [["Sandwich", "s (standard deviation)"], ["over", "÷"], ["Meat", "mean (x̄)"]],
      formula: "CV = (s ÷ x̄) × 100%",
      triggers: ["coefficient of variation", "compare variability", "relative variability", "higher variability", "more variability", "more consistent", "cv"],
      when: "You're comparing two datasets that have very different means or units. Usually you find the standard deviation and mean for both first.",
      steps: ["Find s and x̄ for each dataset", "Divide s by x̄", "Multiply by 100 and add %", "Bigger CV = more relative variability; smaller CV = more consistent"],
      goto: "cv",
      gotoLabel: "Coefficient of Variation",
    },
    {
      id: "zscore",
      name: "X-men Under Siege",
      letters: [["X", "x (the data value)"], ["men", "minus μ (the mean)"], ["Under", "divided by (fraction bar)"], ["Siege", "σ or s (standard deviation)"]],
      formula: "z = (x − μ) ÷ σ",
      triggers: ["z-score", "z score", "zscore", "standardized score", "standard score", "standard deviations away", "standard deviations from the mean", "how many standard deviations"],
      when: "The question gives a specific data point (x), the mean (μ) and the standard deviation (s or σ) and asks for the z-score.",
      steps: ["Subtract the mean from x", "Divide by the standard deviation", "Positive = above the mean; negative = below"],
      goto: "zscore",
      gotoLabel: "Z-Score",
    },
    {
      id: "percentile",
      name: "Kindly Offer Nice People One",
      letters: [["Kindly", "k (the percentile)"], ["Offer", "over 100"], ["Nice", "n (number of values)"], ["People", "plus"], ["One", "1"]],
      formula: "position L = (k ÷ 100) × (n + 1)",
      triggers: ["percentile", "percentile cutoff", "percentiles"],
      when: "You're given a dataset and asked to find a specific percentile cutoff.",
      steps: [
        "Sort the data from smallest to largest",
        "Compute the position L = (k ÷ 100)(n + 1)",
        "Whole number → that position's value is the answer",
        "Decimal → <b>interpolate</b> between the two neighboring values",
      ],
      note: "This formula gives you the <b>position</b> in the ordered list, not the final value. On the Location tab, choose the “(n + 1) — interpolate” percentile method to match it.",
      goto: "location",
      gotoLabel: "Location",
    },
    {
      id: "skew-right",
      name: "Mean is Right of the Median",
      letters: [["Mean", "the mean"], ["Right", "is pulled right"], ["Median", "of the median"]],
      formula: "Skewed right (positive, tail right): Mode < Median < Mean",
      triggers: ["skewed to the right", "skewed right", "right-skewed", "right skewed", "positively skewed", "positive skew", "heavy right tail", "long right tail", "tail to the right"],
      when: "The question asks about the relationship between the mean, median and mode, or which is larger/smaller, in a right-skewed distribution.",
      steps: ["The tail points right and drags the mean with it", "Mean > Median", "The mode sits at the peak, farthest left"],
      goto: "location",
      gotoLabel: "Location",
    },
    {
      id: "skew-left",
      name: "Mean is Left of the Median",
      letters: [["Mean", "the mean"], ["Left", "is pulled left"], ["Median", "of the median"]],
      formula: "Skewed left (negative, tail left): Mean < Median < Mode",
      triggers: ["skewed to the left", "skewed left", "left-skewed", "left skewed", "negatively skewed", "negative skew", "heavy left tail", "long left tail", "tail to the left"],
      when: "The question asks about the relationship between the mean, median and mode, or which is larger/smaller, in a left-skewed distribution.",
      steps: ["The tail points left and drags the mean with it", "Mean < Median", "The mode sits at the peak, farthest right"],
      goto: "location",
      gotoLabel: "Location",
    },
    {
      id: "cumrel",
      name: "Cats Really Fear Dogs",
      letters: [["Cats", "Cumulative"], ["Really", "Relative"], ["Fear", "Frequency"], ["Dogs", "Divide (by the total)"]],
      formula: "cumulative relative frequency = cumulative frequency ÷ total n",
      triggers: ["cumulative relative frequency", "cumulative frequency", "relative cumulative", "at or below", "proportion of data at or below", "or less", "or fewer"],
      weak: ["or less", "or fewer", "at or below"],
      when: "You're given a frequency table (like a Weekly Sales table) and asked for a cumulative or relative cumulative number.",
      steps: [
        "<b>Cumulative</b>: add the frequencies of this class and every class before it",
        "<b>Relative / Frequency / Divide</b>: divide that running total by the total n",
        "The last class always comes out to 1 (100%)",
      ],
      goto: "freq",
      gotoLabel: "Frequency Table",
    },
    {
      id: "grouped",
      name: "Mix For Mean",
      letters: [["Mix", "Midpoint (×)"], ["For", "Frequency"], ["Mean", "→ Mean"]],
      formula: "x̄ = Σ(midpoint × f) ÷ Σf",
      triggers: ["grouped data", "frequency table", "estimated mean", "estimate the mean", "approximate mean", "average shelf life", "frequency distribution"],
      weak: ["frequency table", "frequency distribution"],
      when: "You're NOT given a list of raw numbers, but a table with ranges/classes (like 1–6, 7–12) and frequencies, and asked for the average.",
      steps: [
        "Find each class <b>midpoint</b> = (lower + upper) ÷ 2",
        "Multiply each midpoint by its <b>frequency</b>",
        "Add the products, then divide by the total frequency → <b>mean</b>",
      ],
      goto: "freq",
      gotoLabel: "Frequency Table",
    },
  ];

  const CHEAT_SHEET = [
    ["a table with ranges", "grouped"],
    ["a table with frequencies and want a cumulative total", "cumrel"],
    ["a raw list of numbers and want variance", "variance"],
    ["two datasets and want to compare spread", "cv"],
    ["a specific x value and want to standardize it", "zscore"],
    ["“percentile”", "percentile"],
    ["“skewed”", "skew-right"],
    ["“level of measurement”", "noir"],
  ];

  /** Rank mnemonics by the trigger words found in a question. Longer (more specific) matches score higher. */
  function findMnemonics(text) {
    const t = ` ${String(text).toLowerCase().replace(/[^a-z0-9%\- ]+/g, " ").replace(/\s+/g, " ")} `;
    const results = [];
    for (const m of MNEMONICS) {
      const hits = m.triggers.filter((trig) => {
        const pattern = trig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z])${pattern}([^a-z]|$)`).test(t);
      });
      if (!hits.length) continue;
      // Ignore generic matches that are fully contained in a more specific matched trigger.
      const specific = hits.filter((h) => !hits.some((o) => o !== h && o.includes(h)));
      const score = specific.reduce((s, h) => s + ((m.weak || []).includes(h) ? 1 : 10) + h.split(" ").length, 0);
      results.push({ mnemonic: m, hits: specific, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  const Mnemonics = { MNEMONICS, CHEAT_SHEET, findMnemonics };
  if (typeof module !== "undefined" && module.exports) module.exports = Mnemonics;
  root.Mnemonics = Mnemonics;

  if (typeof document === "undefined") return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const byId = (id) => MNEMONICS.find((m) => m.id === id);

  function cardHtml(m) {
    const letters = m.letters
      .map(([w, meaning]) => `<span class="mn-letter"><b>${esc(w)}</b><small>${esc(meaning)}</small></span>`)
      .join("");
    return `
      <div class="card mn-card" id="mn-${m.id}">
        <h2>${esc(m.name)}</h2>
        <div class="mn-letters" data-tip="mn-letters">${letters}</div>
        <p class="formula">${esc(m.formula)}</p>
        <p><strong>When to use:</strong> ${m.when}</p>
        <p class="mn-triggers" data-tip="mn-triggers"><strong>Trigger words:</strong> ${m.triggers.map((t) => `<span class="chip static">${esc(t)}</span>`).join(" ")}</p>
        <ol class="steps">${m.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
        ${m.note ? `<p class="note">${m.note}</p>` : ""}
        <button type="button" class="secondary" data-goto="${m.goto}">Open the ${esc(m.gotoLabel)} calculator →</button>
      </div>`;
  }

  function render() {
    const cards = document.getElementById("mn-cards");
    const cheat = document.getElementById("mn-cheat");
    if (!cards || !cheat) return;
    cards.innerHTML = MNEMONICS.map(cardHtml).join("");
    cheat.innerHTML = CHEAT_SHEET.map(([see, id]) => {
      const m = byId(id);
      const name = id === "skew-right" ? "Mean is Right/Left of the Median" : m.name;
      return `<tr><td>See ${esc(see)}?</td><td><a href="#mn-${id}" class="mn-jump"><b>${esc(name)}</b></a></td></tr>`;
    }).join("");

    const input = document.getElementById("mn-question");
    const out = document.getElementById("mn-result");
    const update = () => {
      const text = input.value.trim();
      if (!text) { out.innerHTML = `<p class="hint">Paste or type a test question to see which mnemonic it calls for.</p>`; return; }
      const res = findMnemonics(text);
      if (!res.length) {
        out.innerHTML = `<p class="warning">No trigger words found. Check the cheat sheet below, or look for words like “percentile,” “skewed,” “z-score,” or “frequency table.”</p>`;
        return;
      }
      out.innerHTML = res
        .map((r, i) => `
          <div class="mn-match${i === 0 ? " best" : ""}">
            <div><b>${i === 0 ? "Use: " : "Also possible: "}${esc(r.mnemonic.name)}</b>
              <span class="hint">— found ${r.hits.map((h) => `“${esc(h)}”`).join(", ")}</span></div>
            <div class="mn-formula">${esc(r.mnemonic.formula)}</div>
            <div class="row" style="margin-top:6px">
              <a href="#mn-${r.mnemonic.id}" class="mn-jump">See the steps</a>
              <button type="button" class="link-tab" data-goto="${r.mnemonic.goto}">Open the ${esc(r.mnemonic.gotoLabel)} calculator →</button>
            </div>
          </div>`)
        .join("");
    };
    input.addEventListener("input", update);
    update();

    document.getElementById("tab-mnemonics").addEventListener("click", (e) => {
      const go = e.target.closest("[data-goto]");
      if (go) {
        const tab = document.querySelector(`.tab[data-tab="${go.dataset.goto}"]`);
        if (tab) { tab.click(); window.scrollTo(0, 0); }
        return;
      }
      const jump = e.target.closest(".mn-jump");
      if (jump) {
        e.preventDefault();
        const target = document.querySelector(jump.getAttribute("href"));
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          target.classList.add("flash");
          setTimeout(() => target.classList.remove("flash"), 1200);
        }
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})(typeof globalThis !== "undefined" ? globalThis : this);
