/* ============================================================
   state.js
   Single source of truth for all app data.
   Handles: default state, localStorage persistence,
   and all computed/derived values.
   ============================================================ */

/* ── Colour Maps (used by charts & UI) ── */
const CAT_COLORS = {
  'Food & Dining': '#f97316',
  'Groceries':     '#22d3ee',
  'Shopping':      '#9b6dff',
  'Transport':     '#4f8ef7',
  'Entertainment': '#f05252',
  'Health':        '#3ecf8e',
  'Utilities':     '#c9a84c',
  'Education':     '#e8c97a',
  'Travel':        '#a78bfa',
  'Retail':        '#fb923c',
  'Fuel':          '#60a5fa',
  'Recharge':      '#34d399',
  'Other':         '#8a93aa',
};

const UPI_COLORS = {
  'PhonePe':      '#5f259f',
  'Google Pay':   '#4285f4',
  'Paytm':        '#00baf2',
  'Amazon Pay':   '#ff9900',
  'BHIM':         '#00b9f1',
  'Other / Cash': '#8a93aa',
};

/* Chart colour palette for fund/stock lists */
const PALETTE = ['#c9a84c', '#4f8ef7', '#3ecf8e', '#9b6dff', '#f97316', '#f05252', '#22d3ee'];

/* ── Default State ── */
const DEFAULT_STATE = {
  sip:        30000,
  cash:       0,
  mode:       'balanced',  // 'balanced' | 'correction'
  reviewDate: '',
  income:     60000,

  funds: [
    { name: 'Nifty 50 Index Fund',      category: 'Large Cap', target: 30, value: 145000 },
    { name: 'Parag Parikh Flexi Cap',   category: 'Flexi Cap', target: 25, value: 112000 },
    { name: 'Mirae Asset Mid Cap',      category: 'Mid Cap',   target: 20, value: 78000  },
    { name: 'Axis Small Cap Fund',      category: 'Small Cap', target: 15, value: 52000  },
    { name: 'HDFC Hybrid Equity',       category: 'Hybrid',    target: 10, value: 31000  },
  ],

  stocks: [
    { name: 'HDFC Bank',  sector: 'Banking', target: 35, value: 28000 },
    { name: 'ITC Ltd',    sector: 'FMCG',    target: 25, value: 22000 },
    { name: 'Infosys',    sector: 'IT',       target: 20, value: 14000 },
    { name: 'Coal India', sector: 'Energy',   target: 20, value: 8000  },
  ],

  expenses: [
    { id:1,  amt: 450,  desc: 'Swiggy Order',         cat: 'Food & Dining', upi: 'Google Pay',  merchant: 'Swiggy',           date: '2026-03-14' },
    { id:2,  amt: 1200, desc: 'Big Basket Groceries',  cat: 'Groceries',     upi: 'PhonePe',     merchant: 'Big Basket',        date: '2026-03-13' },
    { id:3,  amt: 299,  desc: 'Netflix Subscription',  cat: 'Entertainment', upi: 'Amazon Pay',  merchant: 'Netflix',           date: '2026-03-12' },
    { id:4,  amt: 2500, desc: 'Decathlon Shopping',    cat: 'Shopping',      upi: 'PhonePe',     merchant: 'Decathlon',         date: '2026-03-11' },
    { id:5,  amt: 85,   desc: 'Auto Rickshaw',         cat: 'Transport',     upi: 'Google Pay',  merchant: 'Local',             date: '2026-03-10' },
    { id:6,  amt: 500,  desc: 'Medical Store',         cat: 'Health',        upi: 'Paytm',       merchant: 'Apollo Pharmacy',   date: '2026-03-09' },
    { id:7,  amt: 1800, desc: 'Electricity Bill',      cat: 'Utilities',     upi: 'PhonePe',     merchant: 'BESCOM',            date: '2026-03-08' },
    { id:8,  amt: 350,  desc: 'Petrol',                cat: 'Fuel',          upi: 'BHIM',        merchant: 'HP Petrol Pump',    date: '2026-03-07' },
    { id:9,  amt: 699,  desc: 'Zomato Order',          cat: 'Food & Dining', upi: 'Google Pay',  merchant: 'Zomato',            date: '2026-03-06' },
    { id:10, amt: 3200, desc: 'Reliance Retail',       cat: 'Retail',        upi: 'PhonePe',     merchant: 'Reliance Smart',    date: '2026-03-05' },
  ],

  budgets: {
    'Food & Dining': 2000,
    'Groceries':     3000,
    'Shopping':      4000,
    'Transport':     1500,
    'Entertainment': 1000,
    'Health':        2000,
    'Utilities':     2500,
    'Fuel':          1000,
    'Other':         2000,
  },

  categories: [
    'Food & Dining', 'Groceries', 'Shopping', 'Transport',
    'Entertainment', 'Health', 'Utilities', 'Education',
    'Travel', 'Retail', 'Fuel', 'Recharge', 'Other',
  ],

  nextId: 11,
};

/* Active state (starts as a deep copy of defaults) */
let S = JSON.parse(JSON.stringify(DEFAULT_STATE));

/* ── Persistence ── */

/** Load state from localStorage, falling back to defaults. */
function loadState() {
  const saved = localStorage.getItem('wm_state_v2');
  if (saved) {
    try {
      S = JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse saved state — using defaults.', e);
    }
  }

  // Ensure reviewDate has a value
  if (!S.reviewDate) {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    S.reviewDate = d.toISOString().split('T')[0];
  }
}

/** Save current state to localStorage. */
function saveState() {
  localStorage.setItem('wm_state_v2', JSON.stringify(S));
}

/** Wipe all data and reload. */
function resetAll() {
  localStorage.removeItem('wm_state_v2');
  location.reload();
}

/* ── Computed / Derived Values ── */

const totalFunds   = () => S.funds.reduce((sum, f) => sum + (+f.value  || 0), 0);
const totalStocks  = () => S.stocks.reduce((sum, s) => sum + (+s.value || 0), 0);
const totalPortfolio = () => totalFunds() + totalStocks();

/** Actual allocation % of a fund within the fund bucket. */
const fundActual  = (f) => { const t = totalFunds();  return t ? (f.value / t) * 100 : 0; };

/** Actual allocation % of a stock within the stock bucket. */
const stockActual = (s) => { const t = totalStocks(); return t ? (s.value / t) * 100 : 0; };

/** All expenses in the current calendar month. */
function thisMonthExpenses() {
  const now = new Date();
  return S.expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

/** All expenses in a specific year + month (0-indexed month). */
function monthExpenses(year, month) {
  return S.expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** Total spend in current month. */
const totalSpendMonth = () => thisMonthExpenses().reduce((s, e) => s + (+e.amt || 0), 0);

/**
 * Aggregate expenses by category.
 * Returns { 'Food & Dining': 1200, 'Transport': 300, ... }
 */
function catSpend(expenses) {
  return expenses.reduce((map, e) => {
    map[e.cat] = (map[e.cat] || 0) + (+e.amt || 0);
    return map;
  }, {});
}

/**
 * Aggregate expenses by UPI app.
 * Returns { 'PhonePe': 5000, 'Google Pay': 2000, ... }
 */
function upiSpend(expenses) {
  return expenses.reduce((map, e) => {
    map[e.upi] = (map[e.upi] || 0) + (+e.amt || 0);
    return map;
  }, {});
}

/** List of 'YYYY-MM' strings that have at least one expense, most recent first. */
function availableMonths() {
  const set = new Set(S.expenses.map(e => e.date.slice(0, 7)));
  return [...set].sort().reverse().slice(0, 6);
}

/** SIP breakdown — returns funds with a sipAmt property added. */
function sipBreakdown() {
  if (S.mode === 'correction') {
    const under = S.funds.filter(f => fundActual(f) < f.target);
    if (!under.length) {
      return S.funds.map(f => ({ ...f, sipAmt: Math.round(S.sip * f.target / 100) }));
    }
    const underTotal = under.reduce((s, f) => s + f.target, 0);
    return S.funds.map(f => ({
      ...f,
      sipAmt: under.includes(f) ? Math.round(S.sip * f.target / underTotal) : 0,
    }));
  }
  // Balanced mode: proportional to target
  return S.funds.map(f => ({ ...f, sipAmt: Math.round(S.sip * f.target / 100) }));
}
