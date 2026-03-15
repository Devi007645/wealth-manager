/* ============================================================
   ui.js
   UI interaction helpers:
   - Modal open/close
   - Navigation (go function)
   - Settings page render & save
   ============================================================ */

/* ════════════════════════════════════════
   MODALS
════════════════════════════════════════ */

function openModal(id)  { document.getElementById('modal-' + id).classList.add('open');    }
function closeModal(id) { document.getElementById('modal-' + id).classList.remove('open'); }

/** Close any modal when the user clicks the dark overlay behind it */
document.querySelectorAll('.overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */

/**
 * Map of page IDs → render functions.
 * Add new pages here when extending the app.
 */
const PAGE_RENDERERS = {
  dashboard:    renderDashboard,
  networth:     renderNetWorth,
  expenses:     renderExpenses,
  budget:       renderBudget,
  upi:          renderUPI,
  'add-expense': initAddExpense,
  sip:          renderSIP,
  funds:        renderFunds,
  stocks:       renderStocks,
  settings:     renderSettings,
};

/**
 * Navigate to a page.
 * @param {string}      page   - Page ID (matches 'page-{id}' in HTML)
 * @param {HTMLElement} navEl  - The nav button that was clicked (to mark active)
 */
function go(page, navEl) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target page
  document.getElementById('page-' + page).classList.add('active');

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) {
    navEl.classList.add('active');
  } else {
    // If called programmatically (no nav element), find the matching button by onclick
    document.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(`'${page}'`)) {
        btn.classList.add('active');
      }
    });
  }

  // Call the page's render function
  if (PAGE_RENDERERS[page]) PAGE_RENDERERS[page]();
}

/* ════════════════════════════════════════
   SETTINGS PAGE
════════════════════════════════════════ */

function renderSettings() {
  // Populate config inputs with current state
  document.getElementById('cfg-sip').value    = S.sip;
  document.getElementById('cfg-cash').value   = S.cash;
  document.getElementById('cfg-review').value = S.reviewDate;
  document.getElementById('cfg-income').value = S.income || 0;

  renderModeButtons();

  // Category chip list
  document.getElementById('cat-list-settings').innerHTML =
    S.categories.map(c => `<span class="chip c-blue">${c}</span>`).join('');
}

/** Highlight the correct rebalance mode button */
function renderModeButtons() {
  document.getElementById('mb-bal').className = 'btn ' + (S.mode === 'balanced'   ? 'btn-gold' : 'btn-outline');
  document.getElementById('mb-cor').className = 'btn ' + (S.mode === 'correction' ? 'btn-gold' : 'btn-outline');
  document.getElementById('mode-desc').textContent = S.mode === 'balanced'
    ? 'Distributes SIP proportionally across all funds based on their target allocation.'
    : 'Focuses entire SIP on underweight funds only — faster rebalancing.';
}

function setMode(mode) {
  S.mode = mode;
  saveState();
  renderModeButtons();
}

function saveConfig() {
  S.sip        = +document.getElementById('cfg-sip').value    || 0;
  S.cash       = +document.getElementById('cfg-cash').value   || 0;
  S.reviewDate =  document.getElementById('cfg-review').value;
  S.income     = +document.getElementById('cfg-income').value || 0;
  saveState();
  alert('Settings saved ✓');
  renderDashboard();
}

function addCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) return;
  if (!S.categories.includes(name)) S.categories.push(name);
  saveState();
  renderSettings();
  document.getElementById('new-cat-name').value = '';
}
