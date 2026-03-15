/* ============================================================
   expenses.js
   Everything related to expenses / transactions:
   - Rendering the transactions list
   - Manual entry
   - SMS parser
   - Screenshot OCR via Claude API
   - Budget page rendering
   - UPI breakdown rendering
   ============================================================ */

/* ── Formatting helpers ── */
const fmt     = n   => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');
const pct     = n   => n.toFixed(1) + '%';
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = d   => { const dt = new Date(d); return dt.getDate() + ' ' + MONTHS[dt.getMonth()]; };

/** Emoji for each spending category */
function catEmoji(cat) {
  const map = {
    'Food & Dining': '🍽', 'Groceries': '🛒', 'Shopping': '🛍',
    'Transport': '🚗', 'Entertainment': '🎬', 'Health': '💊',
    'Utilities': '⚡', 'Education': '📚', 'Travel': '✈',
    'Retail': '🏪', 'Fuel': '⛽', 'Recharge': '📱', 'Other': '💸',
  };
  return map[cat] || '💸';
}

/**
 * Build the HTML for a single expense row.
 * Used in Dashboard (recent), Transactions page, and UPI page.
 */
function expRow(e) {
  const col = CAT_COLORS[e.cat] || '#8a93aa';
  return `
    <div class="exp-item">
      <div class="exp-icon" style="background:${col}18; color:${col}">${catEmoji(e.cat)}</div>
      <div style="flex:1; min-width:0">
        <div class="exp-name">${e.desc}</div>
        <div class="exp-meta">${e.cat} · ${fmtDate(e.date)}</div>
      </div>
      <div style="text-align:right; flex-shrink:0">
        <div class="exp-amt">-${fmt(e.amt)}</div>
        <div class="exp-upi">${e.upi}</div>
      </div>
    </div>`;
}

/* ════════════════════════════════════════
   TRANSACTIONS PAGE
════════════════════════════════════════ */

/** Month currently selected in the transactions tab strip */
let selectedMonth = '';

function renderExpenses() {
  const now = new Date();
  if (!selectedMonth) {
    selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Build month tab strip
  const months = availableMonths();
  const allMonths = [...new Set([...months, selectedMonth])].sort().reverse().slice(0, 6);
  document.getElementById('exp-month-tabs').innerHTML = allMonths.map(m => {
    const [yr, mo] = m.split('-');
    return `<button class="tab ${m === selectedMonth ? 'active' : ''}"
              onclick="selectedMonth='${m}'; renderExpenses()">
              ${MONTHS[+mo - 1]} ${yr.slice(2)}
            </button>`;
  }).join('');

  const [yr, mo] = selectedMonth.split('-');
  const exps = monthExpenses(+yr, +mo - 1);

  // Category filter dropdown
  const catEl  = document.getElementById('exp-cat-filter');
  const prevCat = catEl.value;
  catEl.innerHTML = '<option value="">All Categories</option>' +
    S.categories.map(c => `<option ${c === prevCat ? 'selected' : ''}>${c}</option>`).join('');

  const catFilter = catEl.value;
  const filtered  = catFilter ? exps.filter(e => e.cat === catFilter) : exps;
  const total     = filtered.reduce((s, e) => s + (+e.amt || 0), 0);
  const topCat    = Object.entries(catSpend(filtered)).sort((a, b) => b[1] - a[1])[0];
  const daysInMo  = new Date(+yr, +mo, 0).getDate();

  // Metric cards
  document.getElementById('exp-metrics').innerHTML = `
    <div class="mc">
      <div class="mc-label">Total Spent</div>
      <div class="mc-val" style="color:var(--red)">${fmt(total)}</div>
      <div class="mc-sub">${filtered.length} transactions</div>
    </div>
    <div class="mc">
      <div class="mc-label">Top Category</div>
      <div class="mc-val" style="font-size:16px">${topCat ? topCat[0] : '—'}</div>
      <div class="mc-sub">${topCat ? fmt(topCat[1]) : ''}</div>
    </div>
    <div class="mc">
      <div class="mc-label">Daily Average</div>
      <div class="mc-val" style="font-size:18px">${fmt(total / Math.max(1, daysInMo))}</div>
      <div class="mc-sub">Per day</div>
    </div>`;

  // Transaction list (newest first, with delete button)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('exp-list').innerHTML = sorted.length
    ? sorted.map(e => `
        <div style="position:relative">
          ${expRow(e)}
          <button onclick="deleteExpense(${e.id})"
            style="position:absolute; top:50%; right:8px; transform:translateY(-50%);
                   background:var(--red-bg); border:none; color:var(--red);
                   border-radius:4px; padding:3px 7px; font-size:11px; cursor:pointer">✕</button>
        </div>`).join('')
    : '<div style="font-size:13px; color:var(--text3); padding:16px 0; text-align:center">No transactions this month</div>';
}

function deleteExpense(id) {
  S.expenses = S.expenses.filter(e => e.id !== id);
  saveState();
  renderExpenses();
  renderDashboard();
}

/* ════════════════════════════════════════
   ADD EXPENSE — MANUAL ENTRY
════════════════════════════════════════ */

/** Initialise the Add Expense page (set today's date, populate category dropdowns). */
function initAddExpense() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('m-date').value = today;

  // Populate all category selects on the page
  ['m-cat', 'sr-cat', 'ocr-cat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = S.categories.map(c => `<option>${c}</option>`).join('');
  });
}

function addManualExpense() {
  const amt  = +document.getElementById('m-amt').value;
  const desc = document.getElementById('m-desc').value.trim();
  if (!amt || !desc) { alert('Amount and description are required'); return; }

  S.expenses.push({
    id:       S.nextId++,
    amt,
    desc,
    cat:      document.getElementById('m-cat').value,
    upi:      document.getElementById('m-upi').value,
    merchant: document.getElementById('m-merchant').value.trim() || '',
    date:     document.getElementById('m-date').value,
  });

  saveState();
  document.getElementById('m-amt').value      = '';
  document.getElementById('m-desc').value     = '';
  document.getElementById('m-merchant').value = '';
  alert('Expense added! ✓');
  go('expenses', null);
}

/* ── Tab switcher on Add Expense page ── */
function switchAddTab(tab, el) {
  ['manual', 'sms', 'screenshot'].forEach(t => {
    document.getElementById('add-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

/* ════════════════════════════════════════
   ADD EXPENSE — SMS PARSER
════════════════════════════════════════ */

function parseSMS() {
  const sms = document.getElementById('sms-text').value.trim();
  if (!sms) { alert('Paste an SMS first'); return; }

  const result = extractFromSMS(sms);
  if (!result.amt) {
    alert('Could not extract amount. Try a different SMS format.');
    return;
  }

  document.getElementById('sr-amt').value  = result.amt;
  document.getElementById('sr-desc').value = result.desc;
  document.getElementById('sr-date').value = result.date;
  document.getElementById('sr-cat').innerHTML = S.categories.map(c => `<option>${c}</option>`).join('');
  guessCatForSelect('sr-cat', result.desc);

  document.getElementById('sms-result').style.display = 'block';
}

/**
 * Use regex patterns to pull amount, description, and date from bank SMS text.
 * Handles HDFC, SBI, ICICI, Axis and most common Indian bank formats.
 */
function extractFromSMS(sms) {
  // Amount: look for INR / Rs. / ₹ followed by digits
  const amtPatterns = [
    /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:INR|Rs\.?|₹)/i,
    /debited.*?(?:INR|Rs\.?|₹)\s*([\d,]+)/i,
  ];
  let amt = 0;
  for (const p of amtPatterns) {
    const m = sms.match(p);
    if (m) { amt = parseFloat(m[1].replace(',', '')); break; }
  }

  // Merchant / description
  let desc = 'UPI Payment';
  const upiMatch  = sms.match(/(?:UPI|to|at)\s+([A-Za-z0-9\s@._-]{3,30}?)(?:\s*\.|,|for|Avl|Ref|\.)/i);
  const merMatch  = sms.match(/(?:to|at|for)\s+([A-Z][A-Za-z0-9\s]{2,20})/);
  if (upiMatch) desc = upiMatch[1].trim().replace(/^\d+/, '').trim() || desc;
  else if (merMatch) desc = merMatch[1].trim();

  // Date: DD-MM-YY or DD/MM/YYYY
  let date = new Date().toISOString().split('T')[0];
  const dateMatch = sms.match(/(\d{2})[-\/](\d{2})[-\/](\d{2,4})/);
  if (dateMatch) {
    let [, d, m, y] = dateMatch;
    if (y.length === 2) y = '20' + y;
    date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return { amt, desc, date };
}

function loadSMSSample() {
  const samples = [
    'INR 500.00 debited from A/c **4321 on 15-03-2026 for UPI/SWIGGY FOOD/9876543210@ybl. Avl Bal INR 12,450.00',
    'Rs.1200 debited from SBI A/c **5678 on 14-Mar-26 to BIGBASKET@UPI. Avl Bal Rs.45,000',
    'HDFC Bank: INR 850.00 debited from A/c XX2345 on 13/03/2026 via UPI ZOMATO/order@oksbi. Ref No 123456789',
  ];
  document.getElementById('sms-text').value = samples[Math.floor(Math.random() * samples.length)];
}

function saveParsedSMS() {
  const amt  = +document.getElementById('sr-amt').value;
  const desc = document.getElementById('sr-desc').value.trim();
  if (!amt || !desc) { alert('Amount and description required'); return; }

  S.expenses.push({
    id:       S.nextId++,
    amt, desc,
    cat:  document.getElementById('sr-cat').value,
    upi:  document.getElementById('sr-upi').value,
    merchant: '',
    date: document.getElementById('sr-date').value,
  });

  saveState();
  document.getElementById('sms-result').style.display = 'none';
  document.getElementById('sms-text').value = '';
  alert('Expense saved from SMS ✓');
  go('expenses', null);
}

/* ════════════════════════════════════════
   ADD EXPENSE — SCREENSHOT OCR (Claude AI)
════════════════════════════════════════ */

function handleImageUpload(e) {
  const f = e.target.files[0];
  if (f) processImage(f);
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) processImage(f);
}

function processImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('ocr-img').src      = e.target.result;
    document.getElementById('ocr-preview').style.display = 'block';
    document.getElementById('ocr-status').textContent    = '🔍 Analysing screenshot with AI...';
    document.getElementById('ocr-result').style.display  = 'none';
    runOCR(e.target.result.split(',')[1], file.type);
  };
  reader.readAsDataURL(file);
}

/**
 * Send the image to Claude's vision API and extract payment details.
 * Claude returns JSON: { amount, merchant, date, upi_app }
 */
async function runOCR(base64, mediaType) {
  const statusEl = document.getElementById('ocr-status');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text',  text: 'This is a UPI payment screenshot (PhonePe, Google Pay, Paytm or similar). Extract: 1) amount paid in rupees (number only), 2) merchant/payee name, 3) payment date if visible. Reply ONLY with JSON: {"amount":500,"merchant":"Swiggy","date":"2026-03-15","upi_app":"Google Pay"}. If unknown, use null.' },
          ],
        }],
      }),
    });

    const data   = await res.json();
    const text   = data.content.find(c => c.type === 'text')?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch (e) { parsed = {}; }

    if (parsed.amount) {
      document.getElementById('ocr-amt').value  = parsed.amount;
      document.getElementById('ocr-desc').value = parsed.merchant ? `Payment to ${parsed.merchant}` : 'UPI Payment';
      document.getElementById('ocr-date').value = parsed.date || new Date().toISOString().split('T')[0];
      document.getElementById('ocr-cat').innerHTML = S.categories.map(c => `<option>${c}</option>`).join('');
      if (parsed.merchant) guessCatForSelect('ocr-cat', parsed.merchant);

      // Try to match upi_app to a dropdown option
      if (parsed.upi_app) {
        const sel = document.getElementById('ocr-upi');
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.toLowerCase().includes(parsed.upi_app.toLowerCase())) {
            sel.selectedIndex = i; break;
          }
        }
      }

      statusEl.textContent = '✅ Extracted — review and save';
      document.getElementById('ocr-result').style.display = 'block';
    } else {
      statusEl.textContent = '⚠ Could not extract data. Fill in manually below.';
      showOCRManual();
    }
  } catch (err) {
    statusEl.textContent = '⚠ AI extraction failed — fill in manually.';
    showOCRManual();
  }
}

/** Show OCR result form pre-filled with blank values for manual completion */
function showOCRManual() {
  document.getElementById('ocr-amt').value  = '';
  document.getElementById('ocr-desc').value = 'UPI Payment';
  document.getElementById('ocr-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('ocr-cat').innerHTML = S.categories.map(c => `<option>${c}</option>`).join('');
  document.getElementById('ocr-result').style.display = 'block';
}

function saveOCRExpense() {
  const amt  = +document.getElementById('ocr-amt').value;
  const desc = document.getElementById('ocr-desc').value.trim();
  if (!amt || !desc) { alert('Amount and description required'); return; }

  S.expenses.push({
    id: S.nextId++, amt, desc,
    cat:  document.getElementById('ocr-cat').value,
    upi:  document.getElementById('ocr-upi').value,
    merchant: '',
    date: document.getElementById('ocr-date').value,
  });

  saveState();
  document.getElementById('ocr-preview').style.display = 'none';
  document.getElementById('img-input').value = '';
  alert('Expense saved from screenshot ✓');
  go('expenses', null);
}

/* ════════════════════════════════════════
   CATEGORY GUESSING
════════════════════════════════════════ */

/**
 * Given a description/merchant string, attempt to guess the category
 * and pre-select it in the specified <select> element.
 */
function guessCatForSelect(selectId, text) {
  const t = text.toLowerCase();
  const keywords = {
    'Food & Dining':  ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'eat', 'pizza', 'burger', 'biryani'],
    'Groceries':      ['bigbasket', 'grofers', 'blinkit', 'dmart', 'grocery', 'vegetables', 'milk', 'fresh'],
    'Shopping':       ['amazon', 'flipkart', 'myntra', 'shopping', 'mall', 'cloth', 'meesho', 'nykaa'],
    'Transport':      ['uber', 'ola', 'auto', 'cab', 'rapido', 'metro', 'bus', 'irctc'],
    'Entertainment':  ['netflix', 'hotstar', 'prime', 'movie', 'cinema', 'spotify', 'youtube'],
    'Health':         ['apollo', 'medplus', 'pharma', 'hospital', 'doctor', 'medicine', '1mg'],
    'Utilities':      ['electricity', 'water', 'gas', 'bill', 'broadband', 'internet', 'wifi'],
    'Fuel':           ['petrol', 'fuel', 'diesel', 'pump', 'hp', 'ioc', 'bpcl'],
    'Retail':         ['reliance', 'big bazaar', 'supermarket', 'store', 'mart'],
    'Recharge':       ['airtel', 'jio', 'vi ', 'vodafone', 'recharge', 'mobile', 'dtv', 'tataplay'],
  };

  const el = document.getElementById(selectId);
  if (!el) return;

  for (const [cat, kws] of Object.entries(keywords)) {
    if (kws.some(k => t.includes(k))) {
      for (let i = 0; i < el.options.length; i++) {
        if (el.options[i].value === cat) { el.selectedIndex = i; return; }
      }
    }
  }
}

/* ════════════════════════════════════════
   BUDGET PAGE
════════════════════════════════════════ */

function renderBudget() {
  const now  = new Date();
  document.getElementById('budget-month').textContent = MONTHS[now.getMonth()] + ' ' + now.getFullYear();

  const exps        = thisMonthExpenses();
  const spent       = catSpend(exps);
  const totalBudget = Object.values(S.budgets).reduce((a, b) => a + (+b || 0), 0);
  const totalSpent  = Object.values(spent).reduce((a, b) => a + b, 0);
  const overCount   = Object.entries(S.budgets).filter(([k, v]) => (spent[k] || 0) > v).length;

  // Metrics
  document.getElementById('budget-metrics').innerHTML = `
    <div class="mc"><div class="mc-label">Total Budget</div><div class="mc-val">${fmt(totalBudget)}</div></div>
    <div class="mc"><div class="mc-label">Total Spent</div><div class="mc-val" style="color:var(--red)">${fmt(totalSpent)}</div></div>
    <div class="mc"><div class="mc-label">Remaining</div>
      <div class="mc-val" style="color:${totalBudget - totalSpent >= 0 ? 'var(--green)' : 'var(--red)'}">
        ${fmt(totalBudget - totalSpent)}
      </div>
    </div>
    <div class="mc"><div class="mc-label">Over Budget</div>
      <div class="mc-val" style="color:${overCount ? 'var(--red)' : 'var(--green)'}">
        ${overCount} cats
      </div>
    </div>`;

  // Progress bars
  const budgetCats = Object.keys(S.budgets).filter(k => S.budgets[k] > 0);
  document.getElementById('budget-bars').innerHTML = budgetCats.map(k => {
    const s = spent[k] || 0;
    const b = +S.budgets[k] || 1;
    const p = Math.min(100, (s / b) * 100);
    const over = s > b;
    return `
      <div class="budget-item">
        <div class="bi-head">
          <span style="color:var(--text)">${k}</span>
          <span style="color:${over ? 'var(--red)' : 'var(--text2)'}">${fmt(s)} / ${fmt(b)}</span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill ${over ? 'bg-red' : 'bg-green'}" style="width:${p}%"></div>
        </div>
        <div class="bi-pct" style="color:${over ? 'var(--red)' : 'var(--text3)'}">
          ${p.toFixed(0)}% used${over ? ' — Over budget!' : ''}
        </div>
      </div>`;
  }).join('');

  // Budget vs Actual chart
  mkGroupedBar(
    'budgetChart',
    budgetCats.map(k => k.split(' ')[0]),
    budgetCats.map(k => +S.budgets[k] || 0),
    budgetCats.map(k => spent[k] || 0)
  );

  // Populate budget modal inputs
  document.getElementById('budget-inputs').innerHTML = S.categories.map(k => `
    <div class="fg" style="margin-bottom:10px">
      <label class="fl">${k}</label>
      <input class="fi" id="bi-${k.replace(/\W/g, '_')}"
             type="number" placeholder="0" value="${S.budgets[k] || ''}">
    </div>`).join('');
}

function saveBudgets() {
  S.categories.forEach(k => {
    const el = document.getElementById('bi-' + k.replace(/\W/g, '_'));
    if (el) S.budgets[k] = +el.value || 0;
  });
  saveState();
  closeModal('set-budget');
  renderBudget();
}

/* ════════════════════════════════════════
   UPI APPS PAGE
════════════════════════════════════════ */

function renderUPI() {
  const filter = document.getElementById('upi-filter')?.value || '';
  const exps   = thisMonthExpenses();
  const upi    = upiSpend(exps);
  const keys   = Object.keys(upi).sort((a, b) => upi[b] - upi[a]);
  const total  = Object.values(upi).reduce((a, b) => a + b, 0);

  // Metrics
  document.getElementById('upi-metrics').innerHTML = `
    <div class="mc"><div class="mc-label">Total via UPI</div><div class="mc-val">${fmt(total)}</div><div class="mc-sub">This month</div></div>
    <div class="mc"><div class="mc-label">Most Used App</div><div class="mc-val" style="font-size:15px">${keys[0] || '—'}</div><div class="mc-sub">${keys[0] ? fmt(upi[keys[0]]) : ''}</div></div>
    <div class="mc"><div class="mc-label">Transactions</div><div class="mc-val">${exps.length}</div></div>`;

  // Bar chart
  mkBarChart('upiBarChart', keys, keys.map(k => upi[k]), keys.map(k => UPI_COLORS[k] || '#8a93aa'), true);

  // App detail list
  document.getElementById('upi-app-list').innerHTML = keys.map(k => `
    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border)">
      <div style="width:10px; height:10px; border-radius:50%; background:${UPI_COLORS[k] || '#8a93aa'}; flex-shrink:0"></div>
      <div style="flex:1">
        <div style="font-size:13.5px; font-weight:500">${k}</div>
        <div style="font-size:11px; color:var(--text3)">${exps.filter(e => e.upi === k).length} transactions</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px; font-weight:600">${fmt(upi[k])}</div>
        <div style="font-size:11px; color:var(--text3)">${total ? pct(upi[k] / total * 100) : '0%'}</div>
      </div>
    </div>`).join('') || '<div style="font-size:13px; color:var(--text3)">No data this month</div>';

  // Transactions filtered by app
  const filtered = filter ? exps.filter(e => e.upi === filter) : exps;
  const sorted   = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('upi-txn-list').innerHTML =
    sorted.map(e => expRow(e)).join('') ||
    '<div style="font-size:13px; color:var(--text3); padding:8px 0">No transactions</div>';
}
