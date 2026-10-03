const test = require("node:test");
const assert = require("node:assert/strict");
const Stats = require("./stats.js");

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("range: 3, 7, 15 -> 12", () => {
  assert.equal(Stats.range([3, 7, 15]), 12);
});

test("sample variance and SD divide by n - 1", () => {
  const r = Stats.spread([4, 8, 12], "sample");
  close(r.mean, 8);
  close(r.sumSquares, 32);
  assert.equal(r.divisor, 2);
  close(r.variance, 16);
  close(r.sd, 4);
});

test("population variance and SD divide by N", () => {
  const r = Stats.spread([4, 8, 12], "population");
  assert.equal(r.divisor, 3);
  close(r.variance, 32 / 3);
  assert.equal(Stats.fmt(r.sd, 1), "3.3");
});

test("sample needs at least 2 values", () => {
  assert.throws(() => Stats.spread([5], "sample"));
});

test("rounding rule counts decimals in original data", () => {
  assert.equal(Stats.maxDecimalPlaces(["4", "8", "12"]) + 1, 1);
  assert.equal(Stats.maxDecimalPlaces(["4.5", "8.2"]) + 1, 2);
  assert.equal(Stats.maxDecimalPlaces(["1.25", "3"]), 2);
});

test("parseData handles commas, spaces, newlines and junk", () => {
  const p = Stats.parseData("1, 2.5\n3 abc;4");
  assert.deepEqual(p.values, [1, 2.5, 3, 4]);
  assert.deepEqual(p.invalid, ["abc"]);
});

test("coefficient of variation", () => {
  close(Stats.coefficientOfVariation(5, 50), 10);
  close(Stats.coefficientOfVariation(12, 200), 6);
});

test("empirical rule tail questions", () => {
  assert.equal(Stats.empirical(100, 15, "below", 130).percent, 97.5);
  assert.equal(Stats.empirical(100, 15, "above", 130).percent, 2.5);
  assert.equal(Stats.empirical(100, 15, "below", 85).percent, 16);
  assert.equal(Stats.empirical(100, 15, "above", 55).percent, 99.85);
  assert.equal(Stats.empirical(100, 15, "between", 85, 115).percent, 68);
  assert.equal(Stats.empirical(100, 15, "between", 70, 130).percent, 95);
  assert.equal(Stats.empirical(100, 15, "between", 100, 145).percent, 49.85);
});

test("empirical rule rejects non-whole z", () => {
  assert.throws(() => Stats.empirical(100, 15, "below", 120));
});

test("chebyshev memorized values", () => {
  close(Stats.chebyshevPercent(2), 75);
  close(Stats.chebyshevPercent(4), 93.75);
  assert.equal(Stats.round(Stats.chebyshevPercent(3), 1), 88.9);
  assert.equal(Math.round(Stats.chebyshevK(88.9)), 3);
  close(Stats.chebyshevK(75), 2);
  assert.throws(() => Stats.chebyshevPercent(1));
});

const TV = [
  { lower: 7, upper: 14, freq: 12 },
  { lower: 15, upper: 22, freq: 3 },
  { lower: 23, upper: 30, freq: 4 },
  { lower: 31, upper: 38, freq: 6 },
  { lower: 39, upper: 46, freq: 11 },
];
const SCORES = [
  { lower: 30, upper: 47, freq: 3 },
  { lower: 48, upper: 65, freq: 10 },
  { lower: 66, upper: 83, freq: 14 },
  { lower: 84, upper: 101, freq: 11 },
  { lower: 102, upper: 119, freq: 4 },
];

test("cumulative frequency of the 3rd class (TV hours) = 19", () => {
  assert.equal(Stats.frequencyTable(TV).rows[2].cumFreq, 19);
});

test("lower boundary of 5th class (test scores) = 101.5", () => {
  assert.equal(Stats.frequencyTable(SCORES).rows[4].lowerBoundary, 101.5);
});

test("upper boundary of 2nd class (test scores) = 65.5", () => {
  assert.equal(Stats.frequencyTable(SCORES).rows[1].upperBoundary, 65.5);
});

test("class width (test scores) = 18", () => {
  const t = Stats.frequencyTable(SCORES);
  assert.equal(t.width, 18);
  assert.ok(t.uniformWidth);
});

test("first lower and last upper boundaries use the same gap", () => {
  const t = Stats.frequencyTable(SCORES);
  assert.equal(t.rows[0].lowerBoundary, 29.5);
  assert.equal(t.rows[4].upperBoundary, 119.5);
  assert.equal(t.rows[1].midpoint, 56.5);
  assert.equal(t.total, 42);
});

test("buildClasses rounds width up and covers the max", () => {
  const vals = [30, 35, 47, 50, 60, 72, 88, 95, 110, 119];
  const b = Stats.buildClasses(vals, vals.map(String), 5);
  assert.equal(b.width, 18);
  assert.equal(b.classes[0].lower, 30);
  assert.equal(b.classes[0].upper, 47);
  assert.equal(b.classes[4].upper, 119);
  assert.equal(Stats.sum(b.classes.map((c) => c.freq)), vals.length);
});

test("buildClasses adds a unit when the range divides evenly", () => {
  const vals = [0, 10];
  const b = Stats.buildClasses(vals, ["0", "10"], 5);
  assert.equal(b.width, 3);
  assert.ok(b.classes[4].upper >= 10);
});

const LOC = [0, 0, 9, 9, -13, 0, 9];

test("mean of 0,0,9,9,-13,0,9 = 2", () => {
  assert.equal(Stats.mean(LOC), 2);
});

test("median of 0,0,9,9,-13,0,9 = 0 at position 4", () => {
  const m = Stats.medianSteps(LOC);
  assert.equal(m.median, 0);
  assert.equal(m.pos, 4);
  assert.equal(Stats.medianSteps([1, 2, 3, 4]).median, 2.5);
});

test("mode classification", () => {
  const m = Stats.mode(LOC);
  assert.deepEqual(m.modes, [0, 9]);
  assert.equal(m.type, "Bimodal");
  assert.equal(Stats.mode([1, 2, 2, 3]).type, "Unimodal");
  assert.equal(Stats.mode([1, 2, 3]).type, "No mode");
  assert.equal(Stats.mode([1, 1, 2, 2, 3, 3, 4]).type, "Multimodal");
});

test("percentiles: locator method", () => {
  const d = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(Stats.percentile(d, 25, "locator").value, 3);
  assert.equal(Stats.percentile(d, 50, "locator").value, 5.5);
  assert.equal(Stats.percentile(d, 90, "locator").value, 9.5);
});

test("percentiles: (n+1) interpolation", () => {
  const d = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(Stats.percentile(d, 25, "interp").value, 2.75);
  assert.equal(Stats.percentile(d, 50, "interp").value, 5.5);
});

test("percentile rank", () => {
  assert.equal(Stats.percentileRank([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 8).rank, 70);
});

test("other means", () => {
  close(Stats.geometricMean([2, 8]), 4);
  close(Stats.harmonicMean([40, 60]), 48);
  assert.equal(Stats.midrange(LOC), -2);
  const w = Stats.winsorize([1, 2, 3, 4, 100], 20);
  assert.deepEqual(w.winsorized, [2, 2, 3, 4, 4]);
  assert.throws(() => Stats.geometricMean([0, 1]));
});

test("weighted mean example = 6.316", () => {
  const w = [4.77, 2.53, 2.36, 5.1, 3.28, 4.22, 7.15, 4.72];
  const x = [8, 6, 7, 10, 4, 3, 7, 4];
  const r = Stats.weightedMean(w.map((wi, i) => ({ w: wi, x: x[i] })));
  close(r.sumWX, 215.57, 1e-9);
  close(r.sumW, 34.13, 1e-9);
  assert.equal(Stats.fmt(r.mean, 3), "6.316");
});

test("moving averages for 2007", () => {
  const deaths = [18828, 15677, 13780];
  assert.equal(Stats.movingAverage(deaths, 2, 2).value, 14728.5);
  assert.equal(Stats.movingAverage(deaths, 3, 2).value, 16095);
  assert.equal(Stats.movingAverage(deaths, 3, 1), null);
});

test("missing 6th charge = 47.12", () => {
  const r = Stats.missingValue(39.04, 6, [36.73, 35.78, 37.25, 34.59, 42.77]);
  assert.equal(Stats.fmt(r.value, 2), "47.12");
});

test("chebyshev bounds", () => {
  assert.deepEqual(Stats.chebyshevBounds(50, 5, 3), { lower: 35, upper: 65 });
});
