const API_URL = '/api/debtors';
let debtors = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchDebtors();

    const addDebtorForm = document.getElementById('addDebtorForm');
    if (addDebtorForm) {
        addDebtorForm.addEventListener('submit', handleAddDebtor);
    }
});

// Fetch all debtors from backend
async function fetchDebtors() {
    try {
        const response = await fetch(API_URL);
        debtors = await response.json();
        renderDebtors(debtors);
        updateSummary(debtors);
    } catch (error) {
        console.error('Error fetching debtors:', error);
    }
}

// Render debtors list to DOM with Overdue check
function renderDebtors(data) {
    const tbody = document.getElementById('debtorsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No debtors found.</td></tr>`;
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    data.forEach(debtor => {
        const tr = document.createElement('tr');
        const isCleared = debtor.balance <= 0;
        const isOverdue = !isCleared && debtor.dueDate < today;

        let statusBadge = '';
        if (isCleared) {
            statusBadge = `<span style="color: #22c55e; font-weight: bold;">Cleared ✓</span>`;
        } else if (isOverdue) {
            statusBadge = `<span style="color: #f97316; font-weight: bold;">⚠️ Overdue</span>`;
        } else {
            statusBadge = `<span style="color: #ef4444; font-weight: bold;">Active</span>`;
        }

        tr.innerHTML = `
            <td><strong>${debtor.name}</strong></td>
            <td>${debtor.phone}</td>
            <td>KSh ${Number(debtor.total).toLocaleString()}</td>
            <td>
                KSh ${Number(debtor.balance).toLocaleString()}<br>
                <small>${statusBadge}</small>
            </td>
            <td>${debtor.dueDate}</td>
            <td>
                <button class="btn-sm btn-pay" onclick="openPayModal(${debtor.id})">Pay</button>
                <button class="btn-sm btn-danger" onclick="deleteDebtor(${debtor.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Search / Filter Debtors
function filterDebtors() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = debtors.filter(d => 
        d.name.toLowerCase().includes(query) || d.phone.toLowerCase().includes(query)
    );
    renderDebtors(filtered);
}

// Update dashboard summary metrics
function updateSummary(data) {
    const totalDebtEl = document.getElementById('totalDebt');
    const totalCollectedEl = document.getElementById('totalCollected');
    const totalActiveEl = document.getElementById('activeDebtorsCount');

    let totalDebt = 0;
    let totalCollected = 0;

    data.forEach(d => {
        totalDebt += Number(d.balance);
        totalCollected += (Number(d.total) - Number(d.balance));
    });

    if (totalDebtEl) totalDebtEl.innerText = `KSh ${totalDebt.toLocaleString()}`;
    if (totalCollectedEl) totalCollectedEl.innerText = `KSh ${totalCollected.toLocaleString()}`;
    if (totalActiveEl) totalActiveEl.innerText = data.filter(d => d.balance > 0).length;
}

// Add new debtor handler
async function handleAddDebtor(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const total = parseFloat(document.getElementById('total').value);
    const dueDate = document.getElementById('dueDate').value;

    if (!name || !phone || isNaN(total) || !dueDate) {
        alert('Please fill out all required fields correctly.');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, total, dueDate })
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('addDebtorForm').reset();
            fetchDebtors();
        } else {
            alert('Failed to add debtor: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding debtor:', error);
        alert('Network error while saving debtor.');
    }
}

// Open Payment Modal
function openPayModal(id) {
    const debtor = debtors.find(d => Number(d.id) === Number(id));
    if (!debtor) return;

    document.getElementById('payDebtorId').value = debtor.id;
    document.getElementById('payDebtorName').value = debtor.name;
    document.getElementById('payDebtorPhone').value = debtor.phone || '';
    document.getElementById('payCurrentBalance').value = `KSh ${Number(debtor.balance).toLocaleString()}`;
    document.getElementById('paymentAmount').max = debtor.balance;
    document.getElementById('paymentAmount').value = '';
    
    document.getElementById('payModal').style.display = 'flex';
}

// Close Payment Modal
function closePayModal() {
    document.getElementById('payModal').style.display = 'none';
    document.getElementById('payForm').reset();
}

// Handle Cash Payment Submission
async function handleLogPayment(e) {
    e.preventDefault();
    const id = document.getElementById('payDebtorId').value;
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);

    try {
        const response = await fetch(`${API_URL}/${id}/pay`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentAmount })
        });

        if (response.ok) {
            closePayModal();
            fetchDebtors();
        } else {
            alert('Failed to record cash payment.');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
    }
}

// Handle M-Pesa STK Push Payment
async function handleMpesaPayment() {
    const id = document.getElementById('payDebtorId').value;
    let phone = document.getElementById('payDebtorPhone').value.trim();
    const amount = parseFloat(document.getElementById('paymentAmount').value);

    if (!amount || amount <= 0) {
        alert('Please enter a valid payment amount.');
        return;
    }

    try {
        alert('Initiating M-Pesa STK Push... Check phone prompt.');
        const response = await fetch('/api/mpesa/stkpush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, amount, debtorId: id })
        });

        const result = await response.json();
        if (response.ok) {
            alert('STK Push sent successfully!');
            closePayModal();
            fetchDebtors();
        } else {
            alert('M-Pesa request failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('M-Pesa payment error:', error);
        alert('Network error connecting to M-Pesa API.');
    }
}

// Delete Debtor
async function deleteDebtor(id) {
    if (!confirm('Are you sure you want to delete this debtor?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchDebtors();
        }
    } catch (error) {
        console.error('Error deleting debtor:', error);
    }
}