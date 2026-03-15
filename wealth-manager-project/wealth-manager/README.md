# 💰 WealthMgr — Personal Portfolio & Expense Tracker

A fully offline, mobile-friendly personal finance app built with pure HTML, CSS, and JavaScript. No frameworks. No backend. No accounts. Your data stays on your device.

> Live demo: [yourusername.github.io/wealth-manager](https://yourusername.github.io/wealth-manager)

---

## ✨ Features

### 📊 Portfolio Management
- Track **mutual funds** with target allocation % and current values
- Track **dividend stocks** ranked by most underweight
- **SIP Planner** — monthly breakdown in Balanced or Correction mode
- **Net Worth** dashboard — portfolio + cash + savings rate

### 💸 Expense Tracking (3 ways to log)
| Method | How it works |
|---|---|
| ✏ Manual entry | Type amount, category, UPI app in seconds |
| 📩 SMS parser | Paste a bank SMS — auto-extracts amount, merchant, date |
| 📷 Screenshot OCR | Upload a GPay/PhonePe screenshot — Claude AI reads it |

### 📈 Analytics
- Daily spending line chart
- Category breakdown pie chart
- UPI app usage (PhonePe, Google Pay, Paytm, Amazon Pay, BHIM)
- Monthly budget vs actual with progress bars
- 6-month income vs spend history

---

## 🗂 Project Structure

```
wealth-manager/
│
├── index.html          ← App structure (HTML only, no logic)
│
├── css/
│   ├── base.css        ← CSS variables, reset, typography
│   ├── layout.css      ← Sidebar, content area, grid systems
│   ├── components.css  ← Cards, buttons, forms, modals, tables
│   └── pages.css       ← Page-specific styles
│
├── js/
│   ├── state.js        ← App data, localStorage, computed values
│   ├── charts.js       ← All Chart.js chart builders
│   ├── expenses.js     ← Transactions, SMS parser, OCR, budgets, UPI
│   ├── portfolio.js    ← Dashboard, net worth, SIP, funds, stocks
│   ├── ui.js           ← Navigation, modals, settings
│   └── app.js          ← Entry point (boots the app)
│
└── README.md
```

---

## 🚀 Getting Started

### Run locally
Just open `index.html` in any browser. No server or build step needed.

### Host on GitHub Pages (free)
1. Fork or upload this repo to your GitHub
2. Go to **Settings → Pages**
3. Set Source to **Deploy from branch → main → / (root)**
4. Visit `https://yourusername.github.io/wealth-manager/`

### Install as mobile app
1. Open the live URL in **Chrome on Android**
2. Tap ⋮ → **Add to Home Screen**
3. Done — it works like a native app with no browser bar

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | App structure |
| CSS3 (custom properties, grid, flexbox) | Styling & layout |
| Vanilla JavaScript ES6+ | All app logic |
| [Chart.js 4.4](https://chartjs.org) | Charts and data visualisation |
| [Claude API](https://anthropic.com) | Screenshot OCR (vision model) |
| localStorage | Data persistence (no backend) |
| Google Fonts (Playfair Display + DM Sans) | Typography |

---

## 📱 Screenshots

*(Add screenshots of the app here once deployed)*

---

## 🔒 Privacy

All data is stored locally in your browser's `localStorage`. Nothing is sent to any server except when using the Screenshot OCR feature, which sends the image to the Anthropic Claude API to extract payment details.

---

## 📄 License

MIT — free to use, modify, and distribute.
