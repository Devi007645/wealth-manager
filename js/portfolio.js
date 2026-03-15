/* ============================================================
   portfolio.js
   Everything related to the investment portfolio:
   - Dashboard render
   - Net Worth page
   - SIP Planner
   - Mutual Funds CRUD
   - Dividend Stocks CRUD
   ============================================================ */

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */

function renderDashboard() {
  const now        = new Date();
  const portfolio  = totalPortfolio();
  const monthSpend = totalSpendMonth();
  const savings    = (S.income || 0) - monthSpend;
  const savingsRate = S.income ? Math.round((savings / S.income) * 100) : 0;

  // Date subtitle
  document.getElementById('dash-date').textContent =
    now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Sidebar net worth
  document.getElementById('sb-nw').textContent     = fmt(portfolio + (S.cash || 0));
  document.getElementById('sb-nw-sub').textContent = `Portfolio ${fmt(portfolio)} · Spend ${fmt(monthSpend)}`;

  // Metric cards
  document.getElementById('dash-metrics').innerHTML = `
    <div class="mc">
      <div class="mc-label">Portfolio Value</div>
      <div class="mc-val">${fmt(portfolio)}</div>
      <div class="mc-sub">${S.funds.length} funds · ${S.stocks.length} stocks</div>
    </div>
    <div class="mc">
      <div class="mc-label">This Month Spent</div>
      <div class="mc-val" style="color:var(--red)">${fmt(monthSpend)}</div>
      <div class="mc-sub">${thisMonthExpenses().length} transactions</div>
    </div>
    <div class="mc">
      <div class="mc-label">Monthly Savings</div>
      <div class="mc-val" style="color:${savings >= 0 ? 'var(--green)' : 'var(--red)'}">
        ${fmt(savings)}
      </div>
      <div class="mc-sub">Savings rate ${savingsRate}%</div>
    </div>
    <div class="mc">
      <div class="mc-label">Net Worth</div>
      <div class="mc-val" style="color:var(--gold)">${fmt(portfolio + (S.cash || 0))}</div>
      <div class="mc-sub">Investments + cash</div>
    </div>`;

  // Daily spend line chart for current month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayLabels   = [];
  const dayData     = [];
  for (let d = 1; d <= Math.min(now.getDate(), daysInMonth); d++) {
    const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayLabels.push(d);
    dayData.push(S.expenses.filter(e => e.date === ds).reduce((s, e) => s + (+e.amt || 0), 0));
  }
  mkLineChart('spendChart', dayLabels, dayData, '#f05252');

  // Category pie chart
  const cats    = catSpend(thisMonthExpenses());
  const catKeys = Object.keys(cats).filter(k => cats[k] > 0);
  mkDoughnut('catPieChart', catKeys, catKeys.map(k => cats[k]), catKeys.map(k => CAT_COLORS[k] || '#8a93aa'));

  // Category legend
  const totalCat = Object.values(cats).reduce((a, b) => a + b, 0);
  document.getElementById('cat-legend').innerHTML = catKeys.slice(0, 5).map(k => `
    <div style="display:flex; align-items:center; gap:7px; font-size:12px">
      <div class="cat-dot" style="background:${CAT_COLORS[k] || '#8a93aa'}"></div>
      <span style="flex:1; color:var(--text2)">${k}</span>
      <span style="font-weight:500">${totalCat ? pct(cats[k] / totalCat * 100) : '0%'}</span>
    </div>`).join('');

  // Recent transactions
  const recent = [...S.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  document.getElementById('recent-txns').innerHTML =
    recent.length ? recent.map(e => expRow(e)).join('') :
    '<div style="font-size:13px; color:var(--text3); padding:8px 0">No expenses yet</div>';

  // UPI breakdown bars
  const upi    = upiSpend(thisMonthExpenses());
  const upiKeys = Object.keys(upi).sort((a, b) => upi[b] - upi[a]);
  const upiMax = Math.max(...Object.values(upi), 1);
  document.getElementById('upi-dash').innerHTML = upiKeys.map(k => `
    <div style="margin-bottom:12px">
      <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px">
        <span>${k}</span>
        <span style="font-weight:500">${fmt(upi[k])}</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill" style="width:${(upi[k] / upiMax) * 100}%; background:${UPI_COLORS[k] || '#8a93aa'}"></div>
      </div>
    </div>`).join('') || '<div style="font-size:13px; color:var(--text3)">No data yet</div>';
}

/* ════════════════════════════════════════
   NET WORTH PAGE
════════════════════════════════════════ */

function renderNetWorth() {
  const pv         = totalPortfolio();
  const cash       = S.cash || 0;
  const total      = pv + cash;
  const monthSpend = totalSpendMonth();
  const income     = S.income || 0;
  const savings    = income - monthSpend;
  const savingsRate = income ? Math.round((savings / income) * 100) : 0;

  document.getElementById('nw-big').textContent      = fmt(total);
  document.getElementById('nw-sub-line').textContent = `Portfolio ${fmt(pv)} + Cash ${fmt(cash)}`;

  // Donut chart
  const segments = ['Mutual Funds', 'Dividend Stocks', 'Cash Available'];
  const vals     = [totalFunds(), totalStocks(), cash];
  const cols     = ['#c9a84c', '#4f8ef7', '#3ecf8e'];
  mkDoughnut('nwDonut', segments, vals, cols);

  document.getElementById('nw-legend').innerHTML = segments.map((s, i) => `
    <div style="display:flex; align-items:center; gap:8px; font-size:13px">
      <div class="cat-dot" style="background:${cols[i]}"></div>
      <span style="flex:1; color:var(--text2)">${s}</span>
      <span style="font-weight:500">${fmt(vals[i])}</span>
      <span style="color:var(--text3); font-size:11px">${total ? pct(vals[i] / total * 100) : '0%'}</span>
    </div>`).join('');

  // Summary table
  const rows = [
    ['Total Investments', fmt(pv),          'var(--gold)'],
    ['Mutual Funds',      fmt(totalFunds()), 'var(--text)'],
    ['Dividend Stocks',   fmt(totalStocks()),'var(--text)'],
    ['Cash Available',    fmt(cash),         'var(--text)'],
    ['Monthly Income',    fmt(income),       'var(--text)'],
    ['Monthly Spend',     fmt(monthSpend),   'var(--red)'],
    ['Monthly Savings',   fmt(savings),      savings >= 0 ? 'var(--green)' : 'var(--red)'],
    ['Savings Rate',      savingsRate + '%', savingsRate >= 20 ? 'var(--green)' : 'var(--orange)'],
  ];
  document.getElementById('nw-summary').innerHTML =
    '<div style="display:flex; flex-direction:column; gap:14px">' +
    rows.map(([l, v, c]) => `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13.5px">
        <span style="color:var(--text2)">${l}</span>
        <span style="font-weight:500; color:${c}">${v}</span>
      </div>`).join('') +
    '</div>';

  // Savings rate chip
  document.getElementById('savings-rate-chip').innerHTML =
    `<span class="chip ${savingsRate >= 20 ? 'c-green' : savingsRate >= 10 ? 'c-gold' : 'c-red'}">
       ${savingsRate}% savings rate
     </span>`;

  // Last 6 months income vs spend
  const labels    = [];
  const incData   = [];
  const spendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    labels.push(MONTHS[d.getMonth()]);
    const sp = monthExpenses(d.getFullYear(), d.getMonth()).reduce((s, e) => s + (+e.amt || 0), 0);
    spendData.push(sp);
    incData.push(income);
  }
  mkSavingsChart('savingsChart', labels, incData, spendData);
}

/* ════════════════════════════════════════
   SIP PLANNER
════════════════════════════════════════ */

function renderSIP() {
  document.getElementById('sip-hdr').textContent      = S.sip.toLocaleString('en-IN');
  document.getElementById('sip-mode-hdr').textContent = S.mode === 'balanced' ? '⚖ Balanced Mode' : '🎯 Correction Mode';

  const bd    = sipBreakdown();
  const total = bd.reduce((s, f) => s + f.sipAmt, 0);

  document.getElementById('sip-metrics').innerHTML = `
    <div class="mc"><div class="mc-label">Monthly SIP</div><div class="mc-val">${fmt(S.sip)}</div></div>
    <div class="mc"><div class="mc-label">Allocated</div><div class="mc-val" style="color:var(--green)">${fmt(total)}</div></div>
    <div class="mc"><div class="mc-label">Unallocated</div>
      <div class="mc-val" style="color:${S.sip - total ? 'var(--red)' : 'var(--green)'}">
        ${fmt(S.sip - total)}
      </div>
    </div>`;

  document.getElementById('sip-list').innerHTML = bd.map((f, i) => `
    <div class="exp-item">
      <div style="width:10px; height:10px; border-radius:50%; background:${PALETTE[i % 7]}; flex-shrink:0"></div>
      <div style="flex:1">
        <div style="font-size:13.5px; font-weight:500">${f.name}</div>
        <div style="font-size:11px; color:var(--text3)">Target ${pct(f.target)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px; font-weight:600">${fmt(f.sipAmt)}</div>
        <div style="font-size:11px; color:var(--text3)">${S.sip ? pct(f.sipAmt / S.sip * 100) : '0%'}</div>
      </div>
    </div>`).join('');

  mkDoughnut('sipChart', bd.map(f => f.name.split(' ').slice(0, 2).join(' ')), bd.map(f => f.sipAmt), PALETTE.slice(0, bd.length));
}

/* ════════════════════════════════════════
   MUTUAL FUNDS
════════════════════════════════════════ */

function renderFunds() {
  document.getElementById('funds-body').innerHTML = S.funds.map((f, i) => {
    const actual = fundActual(f);
    const dev    = actual - f.target;
    return `
      <tr>
        <td>
          <div style="font-weight:500">${f.name}</div>
          <div style="font-size:11px; color:var(--text3)">${f.category}</div>
        </td>
        <td>${fmt(f.value)}</td>
        <td>${pct(f.target)}</td>
        <td>${pct(actual)}</td>
        <td style="color:${dev > 3 ? 'var(--red)' : dev < -3 ? 'var(--green)' : 'var(--text2)'}">
          ${dev > 0 ? '+' : ''}${pct(dev)}
        </td>
        <td><button class="btn btn-outline btn-xs" onclick="openEditFund(${i})">Edit</button></td>
      </tr>`;
  }).join('');
}

/* Fund CRUD */
function addFund() {
  const name   = document.getElementById('af-name').value.trim();
  const target = +document.getElementById('af-target').value;
  if (!name || !target) { alert('Name and target % are required'); return; }

  S.funds.push({
    name,
    category: document.getElementById('af-cat').value,
    target,
    value: +document.getElementById('af-val').value || 0,
  });
  saveState(); closeModal('add-fund'); renderFunds();
}

function openEditFund(i) {
  document.getElementById('ef-idx').value    = i;
  document.getElementById('ef-name').value   = S.funds[i].name;
  document.getElementById('ef-target').value = S.funds[i].target;
  document.getElementById('ef-val').value    = S.funds[i].value;
  openModal('edit-fund');
}

function saveFund() {
  const i = +document.getElementById('ef-idx').value;
  S.funds[i].name   = document.getElementById('ef-name').value;
  S.funds[i].target = +document.getElementById('ef-target').value;
  S.funds[i].value  = +document.getElementById('ef-val').value;
  saveState(); closeModal('edit-fund'); renderFunds();
}

function delFund() {
  const i = +document.getElementById('ef-idx').value;
  if (!confirm('Delete ' + S.funds[i].name + '?')) return;
  S.funds.splice(i, 1);
  saveState(); closeModal('edit-fund'); renderFunds();
}

/* ════════════════════════════════════════
   DIVIDEND STOCKS
════════════════════════════════════════ */

function renderStocks() {
  const sorted = [...S.stocks]
    .map((s, i) => ({ ...s, orig: i }))
    .sort((a, b) => (stockActual(a) - a.target) - (stockActual(b) - b.target));

  document.getElementById('stocks-metrics').innerHTML = `
    <div class="mc"><div class="mc-label">Total Stocks</div><div class="mc-val">${fmt(totalStocks())}</div></div>
    <div class="mc">
      <div class="mc-label">Buy Next</div>
      <div class="mc-val" style="font-size:15px; color:var(--gold)">${sorted[0]?.name || '—'}</div>
      <div class="mc-sub">Most underweight</div>
    </div>`;

  document.getElementById('stocks-list').innerHTML = sorted.map((s, rank) => {
    const actual = stockActual(s);
    const dev    = actual - s.target;
    return `
      <div class="stock-row">
        <div class="stock-rank">${rank + 1}</div>
        <div style="flex:1">
          <div style="font-size:13.5px; font-weight:500">${s.name}</div>
          <div style="font-size:11px; color:var(--text3)">
            ${s.sector} · Target ${pct(s.target)} · Actual ${pct(actual)}
          </div>
        </div>
        <div style="text-align:right; margin-right:10px">
          <div style="font-size:14px; font-weight:500">${fmt(s.value)}</div>
          <div style="font-size:11px; color:${dev < -3 ? 'var(--green)' : dev > 3 ? 'var(--red)' : 'var(--text3)'}">
            ${dev > 0 ? '+' : ''}${pct(dev)}
          </div>
        </div>
        <button class="btn btn-outline btn-xs" onclick="openEditStock(${s.orig})">Edit</button>
      </div>`;
  }).join('');
}

/* Stock CRUD */
function addStock() {
  const name   = document.getElementById('as-name').value.trim();
  const target = +document.getElementById('as-target').value;
  if (!name || !target) { alert('Name and target % are required'); return; }

  S.stocks.push({
    name,
    sector: document.getElementById('as-sector').value,
    target,
    value: +document.getElementById('as-val').value || 0,
  });
  saveState(); closeModal('add-stock'); renderStocks();
}

function openEditStock(i) {
  document.getElementById('es-idx').value    = i;
  document.getElementById('es-name').value   = S.stocks[i].name;
  document.getElementById('es-target').value = S.stocks[i].target;
  document.getElementById('es-val').value    = S.stocks[i].value;
  openModal('edit-stock');
}

function saveStock() {
  const i = +document.getElementById('es-idx').value;
  S.stocks[i].name   = document.getElementById('es-name').value;
  S.stocks[i].target = +document.getElementById('es-target').value;
  S.stocks[i].value  = +document.getElementById('es-val').value;
  saveState(); closeModal('edit-stock'); renderStocks();
}

function delStock() {
  const i = +document.getElementById('es-idx').value;
  if (!confirm('Delete ' + S.stocks[i].name + '?')) return;
  S.stocks.splice(i, 1);
  saveState(); closeModal('edit-stock'); renderStocks();
}
