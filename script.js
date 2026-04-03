const { useState, useEffect, useRef } = React;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [currentRole, setCurrentRole] = useState('viewer');
  const [currentTheme, setCurrentTheme] = useState('light');
  const [currentSort, setCurrentSort] = useState('date_desc');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const balanceChartRef = useRef(null);
  const spendingChartRef = useRef(null);
  const balanceChartInstance = useRef(null);
  const spendingChartInstance = useRef(null);

  useEffect(() => {
    loadData();
    applyThemeFromStorage();
  }, []);

  useEffect(() => {
    renderCharts();
  }, [transactions]);

  const loadData = () => {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (error) {
        console.error('Invalid saved transaction data', error);
        setTransactions(window.transactions || []);
      }
    } else {
      setTransactions(window.transactions || []);
      localStorage.setItem('transactions', JSON.stringify(window.transactions || []));
    }
  };

  const saveTransactions = (newTransactions) => {
    setTransactions(newTransactions);
    localStorage.setItem('transactions', JSON.stringify(newTransactions));
  };

  const calculateTotals = () => {
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpenses += Math.abs(t.amount);
    });
    return {
      balance: totalIncome - totalExpenses,
      income: totalIncome,
      expenses: totalExpenses
    };
  };

  const renderCharts = () => {
    if (balanceChartInstance.current) {
      balanceChartInstance.current.destroy();
      balanceChartInstance.current = null;
    }
    if (spendingChartInstance.current) {
      spendingChartInstance.current.destroy();
      spendingChartInstance.current = null;
    }

    if (transactions.length === 0) return;

    // Balance trend
    const dates = [...new Set(transactions.map(t => t.date))].sort();
    const balances = [];
    let balance = 0;
    dates.forEach(date => {
      transactions.filter(t => t.date === date).forEach(t => {
        balance += t.amount;
      });
      balances.push(balance);
    });

    balanceChartInstance.current = new Chart(balanceChartRef.current, {
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
        plugins: { legend: { display: false } }
      }
    });

    // Spending breakdown
    const categories = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
    });

    const catKeys = Object.keys(categories);
    const catValues = Object.values(categories);
    if (catKeys.length > 0) {
      spendingChartInstance.current = new Chart(spendingChartRef.current, {
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
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  };

  const getFilteredTransactions = () => {
    let filtered = transactions.filter(t =>
      t.category.toLowerCase().includes(searchInput.toLowerCase()) &&
      (typeFilter === '' || t.type === typeFilter)
    );
    return sortTransactions(filtered);
  };

  const sortTransactions = (items) => {
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
  };

  const applyThemeFromStorage = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setMenuOpen(false);
  };

  const changeRole = (role) => {
    setCurrentRole(role);
  };

  const addTransaction = (newTrans) => {
    const updated = [...transactions, { ...newTrans, id: transactions.length + 1 }];
    saveTransactions(updated);
  };

  const exportToJson = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (data) => {
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

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    const filtered = getFilteredTransactions();
    if (format === 'csv') {
      exportToCsv(filtered);
    } else {
      exportToJson(filtered);
    }
  };

  const totals = calculateTotals();
  const filteredTransactions = getFilteredTransactions();

  return (
    <div>
      <Header
        currentRole={currentRole}
        onRoleChange={changeRole}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onThemeToggle={toggleTheme}
        currentTheme={currentTheme}
      />
      <main>
        <Overview totals={totals} balanceChartRef={balanceChartRef} spendingChartRef={spendingChartRef} />
        <Transactions
          transactions={filteredTransactions}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          currentSort={currentSort}
          setCurrentSort={setCurrentSort}
          currentRole={currentRole}
          onAddTransaction={addTransaction}
          onExport={handleExport}
        />
        <Insights transactions={transactions} totals={totals} />
      </main>
    </div>
  );
}

function Header({ currentRole, onRoleChange, menuOpen, setMenuOpen, onThemeToggle, currentTheme }) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.menu-container')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header>
      <div className="header-left">
        <div className="menu-container">
          <button id="menuButton" type="button" onClick={() => setMenuOpen(!menuOpen)}>☰ Menu</button>
          <div className={`menu-dropdown ${menuOpen ? 'open' : ''}`}>
            <button onClick={() => { alert('Profile feature coming soon!'); setMenuOpen(false); }}>Profile</button>
            <button onClick={() => { alert('Help: Use filters to search transactions. Admin can add new ones.'); setMenuOpen(false); }}>Help</button>
            <button onClick={() => { alert('Logged out! (Placeholder)'); setMenuOpen(false); }}>Logout</button>
            <button onClick={onThemeToggle}>{currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
          </div>
        </div>
      </div>
      <h1>Finance Dashboard</h1>
      <div className="header-right">
        <select id="roleSelect" value={currentRole} onChange={(e) => onRoleChange(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </header>
  );
}

function Overview({ totals, balanceChartRef, spendingChartRef }) {
  return (
    <section id="overview">
      <h2>Overview</h2>
      <div className="cards">
        <div className="card">Total Balance: ${totals.balance.toFixed(2)}</div>
        <div className="card">Total Income: ${totals.income.toFixed(2)}</div>
        <div className="card">Total Expenses: ${totals.expenses.toFixed(2)}</div>
      </div>
      <div className="chart-container">
        <canvas ref={balanceChartRef}></canvas>
      </div>
      <div className="chart-container">
        <canvas ref={spendingChartRef}></canvas>
      </div>
    </section>
  );
}

function Transactions({ transactions, searchInput, setSearchInput, typeFilter, setTypeFilter, currentSort, setCurrentSort, currentRole, onAddTransaction, onExport }) {
  const [newDate, setNewDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState('income');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddTransaction({
      date: newDate,
      amount: parseFloat(newAmount),
      category: newCategory,
      type: newType
    });
    setNewDate('');
    setNewAmount('');
    setNewCategory('');
    setNewType('income');
  };

  return (
    <section id="transactions">
      <h2>Transactions</h2>
      <div className="filters">
        <input
          type="text"
          placeholder="Search by category..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={currentSort} onChange={(e) => setCurrentSort(e.target.value)}>
          <option value="date_desc">Date ↓</option>
          <option value="date_asc">Date ↑</option>
          <option value="amount_desc">Amount ↓</option>
          <option value="amount_asc">Amount ↑</option>
        </select>
        <div className="export-buttons">
          <select id="exportFormat">
            <option value="csv">Export CSV</option>
            <option value="json">Export JSON</option>
          </select>
          <button onClick={() => onExport(document.getElementById('exportFormat').value)}>Export</button>
        </div>
      </div>
      <table id="transactionsTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center' }}>No transactions found.</td>
            </tr>
          ) : (
            transactions.map(t => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>${t.amount.toFixed(2)}</td>
                <td>{t.category}</td>
                <td>{t.type}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {currentRole === 'admin' && (
        <form id="addForm" onSubmit={handleSubmit}>
          <h3>Add Transaction</h3>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          <input type="number" placeholder="Amount" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required />
          <input type="text" placeholder="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required />
          <select value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <button type="submit">Add</button>
        </form>
      )}
    </section>
  );
}

function Insights({ transactions, totals }) {
  if (transactions.length === 0) {
    return (
      <section id="insights">
        <h2>Insights</h2>
        <p>Highest spending category: N/A</p>
        <p>Monthly comparison: No data</p>
        <p>Overall trend: No insights available yet</p>
      </section>
    );
  }

  const expenses = transactions.filter(t => t.type === 'expense');
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
  });

  const highest = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, 'N/A');
  const highestSpendingAmount = categoryTotals[highest] || 0;

  const income = totals.income;
  const expense = totals.expenses;
  const balance = totals.balance;
  const insight = balance >= 0 ? 'Good job staying positive.' : 'Net loss; cut some expenses.';

  return (
    <section id="insights">
      <h2>Insights</h2>
      <p>Highest spending category: {highest} (${highestSpendingAmount.toFixed(2)})</p>
      <p>Monthly comparison: Income ${income.toFixed(2)} vs Expenses ${expense.toFixed(2)}</p>
      <p>Overall trend: {insight}</p>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
