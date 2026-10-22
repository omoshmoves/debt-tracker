const express   = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files from the local client folder
app.use(express.static(path.join(__dirname, 'client')));

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'debtors.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Create debtors table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS debtors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    total REAL NOT NULL,
    balance REAL NOT NULL,
    dueDate TEXT NOT NULL
)`);

// --- API ROUTES ---

// Get all debtors
app.get('/api/debtors', (req, res) => {
    db.all('SELECT * FROM debtors', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Add a new debtor
app.post('/api/debtors', (req, res) => {
    const { name, phone, total, dueDate } = req.body;
    
    // Ensure total is parsed as a number
    const numericTotal = parseFloat(total);
    const balance = numericTotal;
    
    const query = `INSERT INTO debtors (name, phone, total, balance, dueDate) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [name, phone, numericTotal, balance, dueDate], function(err) {
        if (err) {
            console.error('Database insert error:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, name, phone, total: numericTotal, balance, dueDate });
        }
    });
});

// Record Cash Payment
app.put('/api/debtors/:id/pay', (req, res) => {
    const { id } = req.params;
    const { paymentAmount } = req.body;

    db.get('SELECT balance FROM debtors WHERE id = ?', [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Debtor not found' });
        }

        const newBalance = Math.max(0, row.balance - Number(paymentAmount));
        db.run('UPDATE debtors SET balance = ? WHERE id = ?', [newBalance, id], (updateErr) => {
            if (updateErr) {
                res.status(500).json({ error: updateErr.message });
            } else {
                res.json({ success: true, newBalance });
            }
        });
    });
});

// Delete debtor
app.delete('/api/debtors/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM debtors WHERE id = ?', [id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// --- M-PESA STK PUSH ROUTE ---
app.post('/api/mpesa/stkpush', async (req, res) => {
    const { phone, amount, debtorId } = req.body;

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.slice(1);
    }

    const consumerKey = '1Z7t5FR5g0PSzC6QD65wGo2hGkSm2GODn2fTBzYuy01KVpPz';
    const consumerSecret = 'k4RL8DFgiHtGI7hmTxtCYB1ShoXIUT4CI19jTEcG5fHqYZlOdAhkJ07McNFeLuJ2';
    const shortCode = '174379';
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    try {
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenResponse = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            { headers: { Authorization: `Basic ${auth}` } }
        );
        const accessToken = tokenResponse.data.access_token;

        const date = new Date();
        const timestamp = date.getFullYear() +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0') +
            String(date.getSeconds()).padStart(2, '0');

        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

        const payload = {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: 'https://mydomain.com/api/mpesa/callback',
            AccountReference: 'DebtTracker',
            TransactionDesc: 'Debt Repayment'
        };

        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            payload,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        db.get('SELECT balance FROM debtors WHERE id = ?', [debtorId], (err, debtor) => {
            if (debtor) {
                const newBalance = Math.max(0, debtor.balance - Number(amount));
                db.run('UPDATE debtors SET balance = ? WHERE id = ?', [newBalance, debtorId]);
            }
        });

        res.json({ success: true, message: 'M-Pesa STK Push sent successfully!', data: stkResponse.data });
    } catch (error) {
        console.error('M-Pesa Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to initiate M-Pesa payment.' });
    }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 