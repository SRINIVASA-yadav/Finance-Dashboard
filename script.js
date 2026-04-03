// Assuming data is loaded from data.js as an array named transactions
// In a real setup, this would be from a file or API

let transactions = [];
let currentRole = 'viewer';
let currentTheme = 'light';
let balanceChartInstance = null;
let spendingChartInstance = null;
let currentSort = 'date_desc';

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyThemeFromStorage();
  renderAll();
  setupEventListeners();
});

function loadData() {
  // load from localStorage or default from data.js
  const saved = localStorage.getItem('transactions');
  if (saved) {
    try {
      transactions = JSON.parse(saved);
    } catch (error) {
      console.error('Invalid saved transaction data', error);
      transactions = window.transactions || [];
    }
  } else {
    transactions = window.transactions || [];
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }
}

function renderAll() {
  calculateTotals();
  renderCards();
  renderCharts();
  filterTransactions();
  renderInsights();
  updateRoleUI();
}

function calculateTotals() {
  let totalIncome = 0;
  let totalExpenses = 0;
  transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpenses += Math.abs(t.amount);
  });
  window.totalBalance = totalIncome - totalExpenses;
  window.totalIncome = totalIncome;
  window.totalExpenses = totalExpenses;
}

function renderCards() {
  document.getElementById('totalBalance').textContent = `Total Balance: $${window.totalBalance}`;
  document.getElementById('totalIncome').textContent = `Total Income: $${window.totalIncome}`;
  document.getElementById('totalExpenses').textContent = `Total Expenses: $${window.totalExpenses}`;
}

function renderCharts() {
  const balanceCanvas = document.getElementById('balanceChart');
  const spendingCanvas = document.getElementById('spendingChart');

  if (balanceChartInstance) {
    balanceChartInstance.destroy();
    balanceChartInstance = null;
  }
  if (spendingChartInstance) {
    spendingChartInstance.destroy();
    spendingChartInstance = null;
  }

  if (transactions.length === 0) {
    balanceCanvas.style.display = 'none';
    spendingCanvas.style.display = 'none';
    return;
  }

  balanceCanvas.style.display = '';
  spendingCanvas.style.display = '';

  // Balance trend - simple line chart with cumulative balance
  const dates = [...new Set(transactions.map(t => t.date))].sort();
  const balances = [];
  let balance = 0;
  dates.forEach(date => {
    transactions.filter(t => t.date === date).forEach(t => {
      balance += t.amount;
    });
    balances.push(balance);
  });

  balanceChartInstance = new Chart(balanceCanvas, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Balance',
        data: balances,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {legend: {display: false}}
    }
  });

  // Spending breakdown - pie chart
  const categories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
  });

  const catKeys = Object.keys(categories);
  const catValues = Object.values(categories);
  if (catKeys.length === 0) {
    spendingCanvas.style.display = 'none';
  } else {
    spendingCanvas.style.display = '';
    spendingChartInstance = new Chart(spendingCanvas, {
      type: 'pie',
      data: {
        labels: catKeys,
        datasets: [{
          data: catValues,
          backgroundColor: ['#f94144', '#90be6d', '#577590', '#f9c74f', '#43aa8b', '#f3722c']
        }]
      },
      options: {
        responsive: true,
        plugins: {legend: {position: 'bottom'}}
      }
    });
  }
}

function renderTable(filtered = transactions) {
  const tbody = document.querySelector('#transactionsTable tbody');
  tbody.innerHTML = '';

  if (!filtered || filtered.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4" style="text-align:center;">No transactions found.</td>';
    tbody.appendChild(row);
    return;
  }

  filtered.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.date}</td>
      <td>$${t.amount.toFixed(2)}</td>
      <td>${t.category}</td>
      <td>${t.type}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderInsights() {
  if (transactions.length === 0) {
    document.getElementById('highestSpending').textContent = 'Highest spending category: N/A';
    document.getElementById('monthlyComparison').textContent = 'Monthly comparison: No data';
    document.getElementById('additionalInsight').textContent = 'No insights available yet';
    return;
  }

  const expenses = transactions.filter(t => t.type === 'expense');
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
  });

  const highest = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, 'N/A');
  const highestSpendingAmount = categoryTotals[highest] || 0;
  document.getElementById('highestSpending').textContent = `Highest spending category: ${highest} ($${highestSpendingAmount.toFixed(2)})`;

  // Simple comparison
  const income = window.totalIncome;
  const expense = window.totalExpenses;
  document.getElementById('monthlyComparison').textContent = `Monthly comparison: Income $${income.toFixed(2)} vs Expenses $${expense.toFixed(2)}`;

  // Additional insight
  const balance = window.totalBalance;
  const insight = balance >= 0 ? 'Good job staying positive.' : 'Net loss; cut some expenses.';
  document.getElementById('additionalInsight').textContent = `Overall trend: ${insight}`;
}

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', filterTransactions);
  document.getElementById('typeFilter').addEventListener('change', filterTransactions);
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    filterTransactions();
  });
  document.getElementById('roleSelect').addEventListener('change', changeRole);
  document.getElementById('menuButton').addEventListener('click', toggleMenu);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('profileButton').addEventListener('click', () => {
    alert('Profile feature coming soon!');
    document.querySelector('.menu-container').classList.remove('open');
  });
  document.getElementById('helpButton').addEventListener('click', () => {
    alert('Help: Use filters to search transactions. Admin can add new ones.');
    document.querySelector('.menu-container').classList.remove('open');
  });
  document.getElementById('logoutButton').addEventListener('click', () => {
    alert('Logged out! (Placeholder)');
    document.querySelector('.menu-container').classList.remove('open');
  });
  document.getElementById('exportButton').addEventListener('click', () => {
    const filtered = getFilteredTransactions();
    const format = document.getElementById('exportFormat').value;
    if (format === 'csv') {
      exportToCsv(filtered);
    } else {
      exportToJson(filtered);
    }
  });
}


function getFilteredTransactions() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;
  let filtered = transactions.filter(t =>
    t.category.toLowerCase().includes(search) &&
    (type === '' || t.type === type)
  );
  return sortTransactions(filtered);
}

function sortTransactions(items) {
  const sorted = [...items];
  switch (currentSort) {
    case 'date_asc':
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'date_desc':
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'amount_asc':
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case 'amount_desc':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
  }
  return sorted;
}

function applyThemeFromStorage() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    currentTheme = savedTheme;
  }
  applyTheme(currentTheme);
}

function toggleMenu() {
  const menuContainer = document.querySelector('.menu-container');
  menuContainer.classList.toggle('open');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  const menuContainer = document.querySelector('.menu-container');
  if (!menuContainer.contains(e.target)) {
    menuContainer.classList.remove('open');
  }
});

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
  localStorage.setItem('theme', theme);
}


function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  document.querySelector('.menu-container').classList.remove('open');
}


function filterTransactions() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;
  let filtered = transactions.filter(t => 
    t.category.toLowerCase().includes(search) &&
    (type === '' || t.type === type)
  );

  filtered = sortTransactions(filtered);
  renderTable(filtered);
}

function changeRole() {
  currentRole = document.getElementById('roleSelect').value;
  updateRoleUI();
}

function exportToJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToCsv(data) {
  if (!data || data.length === 0) {
    alert('No transactions to export');
    return;
  }
  const headers = ['id', 'date', 'amount', 'category', 'type'];
  const rows = data.map(t => [t.id, t.date, t.amount, t.category, t.type]);
  const csvContent = [headers, ...rows].map(r => r.map(value => {
    const escaped = ('' + value).replace(/"/g, '""');
    return `"${escaped}"`;
  }).join(',')).join('\n');

  const blob = new Blob([csvContent], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function updateRoleUI() {
  const addForm = document.getElementById('addForm');
  if (currentRole === 'admin') {
    if (!addForm) {
      const form = document.createElement('form');
      form.id = 'addForm';
      form.innerHTML = `
        <h3>Add Transaction</h3>
        <input type="date" id="newDate" required>
        <input type="number" id="newAmount" placeholder="Amount" required>
        <input type="text" id="newCategory" placeholder="Category" required>
        <select id="newType">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <button type="submit">Add</button>
      `;
      form.addEventListener('submit', addTransaction);
      document.getElementById('transactions').appendChild(form);
    }
  } else {
    if (addForm) addForm.remove();
  }
}

function addTransaction(e) {
  e.preventDefault();
  const newTrans = {
    id: transactions.length + 1,
    date: document.getElementById('newDate').value,
    amount: parseFloat(document.getElementById('newAmount').value),
    category: document.getElementById('newCategory').value,
    type: document.getElementById('newType').value
  };
  transactions.push(newTrans);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  renderAll();
  e.target.reset();
}
