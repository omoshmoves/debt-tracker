Kanyakla Debts
Kanyakla Debts is a lightweight, full-stack debt tracking and automated collection platform designed for a business and personal account management. It provides a simple dashboard to manage active debtors, process cash or M-Pesa STK Push payments, and feature a fast, contextual AI chat assistant powered by Google's Gemini API.

Features
Debtor Management: Track debtor records including contact info, total amounts owed, remaining balances, and due dates.

Automated Overdue Tracking: Automatic visual indicators highlighting active, overdue, and fully cleared debts.

M-Pesa STK Push Integration: Direct M-Pesa prompt integration via Safaricom Daraja API for immediate mobile payments.

AI Financial Assistant: Integrated Google Gemini AI assistant capable of analyzing live database records to summarize totals, identify top debtors, and draft collection reminders.

Local SQLite Persistence: Lightweight, serverless local database requiring zero external setup.

Tech Stack
Backend: Node.js, Express.js

Database: SQLite3

AI Engine: @google/genai (Google GenAI SDK)

HTTP Client: Axios (for Safaricom Daraja M-Pesa API integration)

Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3
debt-tracker/
├── .env                  # Environment variables (API Keys, Secrets)
├── package.json          # Node dependencies and scripts
├── server/
│   ├── server.js         # Express server, SQLite schema, & API endpoints
│   ├── debtors.db        # SQLite database file (auto-generated)
│   └── client/           # Static frontend assets
│       ├── index.html    # Dashboard UI
│       ├── app.js        # DOM handling, modal handlers, and AI chat parser
│       └── style.css     # Dashboard styling
└── README.md
