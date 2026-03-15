/* ============================================================
   app.js
   Application entry point.
   Runs after all other JS files have loaded.
   Initialises state and renders the default page.
   ============================================================ */

/**
 * Boot sequence:
 * 1. Load saved state from localStorage (or use defaults)
 * 2. Ensure required fields have sensible defaults
 * 3. Render the dashboard (first visible page)
 */
function boot() {
  // Load persisted data
  loadState();

  // Set a default review date if none exists (3 months from today)
  if (!S.reviewDate) {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    S.reviewDate = d.toISOString().split('T')[0];
  }

  // Render the default (dashboard) page
  renderDashboard();

  console.log('WealthMgr loaded ✓', {
    funds:    S.funds.length,
    stocks:   S.stocks.length,
    expenses: S.expenses.length,
  });
}

// Run when the DOM is ready
document.addEventListener('DOMContentLoaded', boot);
