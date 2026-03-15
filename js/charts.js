/* ============================================================
   charts.js
   All Chart.js chart creation helpers.
   Each function destroys the previous chart instance
   before creating a new one (prevents canvas conflicts).
   ============================================================ */

/* Registry of active Chart.js instances, keyed by canvas ID */
const charts = {};

/**
 * Destroy an existing chart by canvas ID (if it exists).
 * Always call this before creating a new chart on the same canvas.
 */
function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

/* ── Shared Chart.js defaults ── */
const GRID_COLOR  = 'rgba(255,255,255,0.04)';
const TICK_COLOR  = '#454d62';
const TICK_FONT   = { size: 10 };

/* Formatter: ₹12,34,567 style (Indian locale) */
const inrTick = v => '₹' + (v / 1000).toFixed(0) + 'K';
const inrTooltip = c => '₹' + c.parsed.y.toLocaleString('en-IN');

/* ── Line Chart ── */
/**
 * @param {string} id      - Canvas element ID
 * @param {Array}  labels  - X-axis labels
 * @param {Array}  data    - Y-axis values
 * @param {string} color   - Hex colour for the line
 */
function mkLineChart(id, labels, data, color = '#c9a84c') {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor:     color,
        backgroundColor: color + '18',
        fill:            true,
        tension:         0.4,
        pointRadius:     3,
        pointBackgroundColor: color,
        borderWidth:     2,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: inrTooltip } },
      },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT, callback: inrTick } },
      },
    },
  });
}

/* ── Doughnut / Pie Chart ── */
/**
 * @param {string} id     - Canvas element ID
 * @param {Array}  labels - Segment labels
 * @param {Array}  data   - Segment values
 * @param {Array}  colors - Hex colour per segment
 */
function mkDoughnut(id, labels, data, colors) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '66%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => c.label + ': ₹' + c.parsed.toLocaleString('en-IN') },
        },
      },
    },
  });
}

/* ── Vertical Bar Chart ── */
/**
 * @param {string}  id         - Canvas element ID
 * @param {Array}   labels     - Bar labels
 * @param {Array}   data       - Bar values
 * @param {Array}   colors     - Hex colour per bar
 * @param {boolean} horizontal - If true, renders as horizontal bar chart
 */
function mkBarChart(id, labels, data, colors, horizontal = false) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 5, borderWidth: 0 }],
    },
    options: {
      indexAxis:           horizontal ? 'y' : 'x',
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => '₹' + c.parsed[horizontal ? 'x' : 'y'].toLocaleString('en-IN'),
          },
        },
      },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT, callback: horizontal ? undefined : inrTick } },
      },
    },
  });
}

/* ── Grouped Bar Chart (Budget vs Actual) ── */
/**
 * @param {string} id       - Canvas element ID
 * @param {Array}  labels   - Category labels
 * @param {Array}  budget   - Budget values
 * @param {Array}  actual   - Actual spend values
 */
function mkGroupedBar(id, labels, budget, actual) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Budget', data: budget, backgroundColor: 'rgba(201,168,76,0.3)', borderRadius: 4 },
        { label: 'Spent',  data: actual,  backgroundColor: 'rgba(240,82,82,0.5)',  borderRadius: 4 },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT, callback: inrTick } },
      },
    },
  });
}

/* ── Savings Rate (Grouped Bar — Income vs Spend) ── */
/**
 * @param {string} id      - Canvas element ID
 * @param {Array}  labels  - Month labels
 * @param {Array}  income  - Income per month
 * @param {Array}  spend   - Spend per month
 */
function mkSavingsChart(id, labels, income, spend) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: income, backgroundColor: 'rgba(62,207,142,0.3)', borderRadius: 4 },
        { label: 'Spend',  data: spend,  backgroundColor: 'rgba(240,82,82,0.5)',  borderRadius: 4 },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: TICK_FONT, callback: inrTick } },
      },
    },
  });
}
