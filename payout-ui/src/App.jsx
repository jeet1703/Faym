import React, { useState, useEffect } from 'react';

const API_BASE = 'https://faym.onrender.com'; // Production API
// const API_BASE = 'http://localhost:3000'; // Local API
const ACTIVE_USER = 'john_doe';

function App() {
  const [brands, setBrands] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalAdvances, setTotalAdvances] = useState(0);
  const [transactions, setTransactions] = useState([]);
  
  const [apiOnline, setApiOnline] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  // Form states
  const [saleForm, setSaleForm] = useState({ brandId: '', earning: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Base API caller
  const apiCall = async (path, method = 'GET', body = null) => {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'API Request failed');
      }
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Check backend health
  const checkHealth = async () => {
    try {
      const data = await apiCall('/status');
      if (data.status === 'ok') {
        setApiOnline(true);
      }
    } catch (e) {
      setApiOnline(false);
    }
  };

  // Load setup data
  const loadBrands = async () => {
    try {
      const b = await apiCall('/brands');
      setBrands(b);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGlobalSales = async () => {
    try {
      // Filter sales for john_doe
      const s = await apiCall(`/users/${ACTIVE_USER}/sales`);
      setSales(s);
    } catch (e) {
      console.error(e);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const w = await apiCall(`/users/${ACTIVE_USER}/withdrawals`);
      setWithdrawals(w);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserWallet = async () => {
    try {
      const bal = await apiCall(`/users/${ACTIVE_USER}/balance`);
      setWalletBalance(bal.walletBalance);

      const userSales = await apiCall(`/users/${ACTIVE_USER}/sales`);
      const earningsSum = userSales.reduce((sum, s) => sum + Number(s.earning), 0);
      const advancesSum = userSales.reduce((sum, s) => sum + Number(s.advance_paid || 0), 0);
      setTotalEarnings(earningsSum);
      setTotalAdvances(advancesSum);

      const txs = await apiCall(`/users/${ACTIVE_USER}/transactions`);
      setTransactions([...txs].reverse()); // Show newest first
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = () => {
    checkHealth();
    loadBrands();
    loadGlobalSales();
    loadWithdrawals();
    loadUserWallet();
  };

  // Initial load
  useEffect(() => {
    refreshAll();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Seed default worked example: 3 sales of ₹40 each
  const handleSeedDemo = async (e) => {
    e.target.disabled = true;
    try {
      showToast('Seeding assignment worked example: 3 sales of ₹40 each...', 'info');
      
      // Log three sales of ₹40
      await apiCall('/sales', 'POST', { userId: ACTIVE_USER, brandId: 'brand_1', earning: 40.00 });
      await apiCall('/sales', 'POST', { userId: ACTIVE_USER, brandId: 'brand_1', earning: 40.00 });
      await apiCall('/sales', 'POST', { userId: ACTIVE_USER, brandId: 'brand_1', earning: 40.00 });
      
      showToast('Assignment example data seeded!', 'success');
      refreshAll();
    } catch (e) {
      showToast('Failed to seed demo data', 'error');
    } finally {
      e.target.disabled = false;
    }
  };

  // Trigger advance payouts
  const handleRunAdvanceJob = async (e) => {
    e.target.disabled = true;
    try {
      const result = await apiCall('/admin/advance-payout/run', 'POST', { userId: ACTIVE_USER });
      const advancedCount = result[ACTIVE_USER]?.length || 0;
      showToast(`Advance Payout job finished. Advanced ${advancedCount} sales!`, 'success');
      refreshAll();
    } catch (e) {
    } finally {
      e.target.disabled = false;
    }
  };

  // Reconcile a single sale
  const handleReconcileSale = async (saleId, status, e) => {
    e.target.disabled = true;
    try {
      await apiCall(`/admin/sales/${saleId}/reconcile`, 'POST', { status });
      showToast(`Sale #${saleId} successfully reconciled: ${status}`, 'success');
      refreshAll();
    } catch (e) {
      e.target.disabled = false;
    }
  };

  // Submit withdrawal request
  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Amount must be positive', 'error');
      return;
    }
    
    try {
      await apiCall(`/users/${ACTIVE_USER}/withdrawals`, 'POST', { amount });
      showToast(`Withdrawal of ₹${amount.toFixed(2)} requested successfully!`, 'success');
      setWithdrawAmount('');
      refreshAll();
    } catch (e) {}
  };

  // Simulation status updates
  const handleSettleWithdrawal = async (wId, status, e) => {
    e.target.disabled = true;
    try {
      await apiCall(`/withdrawals/${wId}/status`, 'POST', { status });
      showToast(`Withdrawal #${wId} settled as ${status}`, 'success');
      refreshAll();
    } catch (e) {
      e.target.disabled = false;
    }
  };

  // Form submission: Create Sale
  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (!saleForm.brandId || !saleForm.earning) return;
    const earning = parseFloat(saleForm.earning);
    try {
      await apiCall('/sales', 'POST', {
        userId: ACTIVE_USER,
        brandId: saleForm.brandId,
        earning
      });
      showToast(`New sale record of ₹${earning.toFixed(2)} logged!`, 'success');
      setSaleForm({ brandId: '', earning: '' });
      refreshAll();
    } catch (e) {}
  };

  return (
    <>
      <div className="glass-bg"></div>
      
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo-area">
            <span className="logo-icon">✦</span>
            <h1>Payout Management <span className="accent-text">Hub</span></h1>
          </div>
          <div className="header-actions">
            <div id="system-health" className={`health-pill ${!apiOnline ? 'error' : ''}`}>
              <span className="pulse-dot"></span>
              <span className="health-text">{apiOnline ? 'API Online' : 'API Offline'}</span>
            </div>
            <button onClick={handleSeedDemo} className="btn btn-secondary">
              <span className="btn-icon">⚡</span> Seed 3x ₹40 Sales
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <main className="app-grid">
          
          {/* LEFT SECTION: User Info & Wallet Metrics & Log Sale */}
          <section className="grid-left">
            
            {/* User Session Info Card */}
            <div className="card glass-card user-selector-card">
              <div className="card-header">
                <h3>Active Session</h3>
                <span className="card-tag" style={{ color: 'var(--primary)' }}>SDE Candidate</span>
              </div>
              <div style={{ padding: '8px 0', fontSize: '0.95rem' }}>
                <div style={{ marginBottom: '8px' }}>User ID: <strong>{ACTIVE_USER}</strong></div>
                <div>Name: <strong>John Doe</strong></div>
              </div>
            </div>

            {/* Wallet Balance Card */}
            <div id="wallet-card" className="card glass-card balance-card">
              <div className="balance-title">Withdrawable Balance</div>
              <div id="wallet-balance-val" className="balance-value">₹{Number(walletBalance).toFixed(2)}</div>
              
              <div className="balance-details-grid">
                <div className="detail-box">
                  <div className="detail-label">Total Earnings</div>
                  <div id="total-earnings-val" className="detail-val">₹{Number(totalEarnings).toFixed(2)}</div>
                </div>
                <div className="detail-box">
                  <div className="detail-label">Advances Received</div>
                  <div id="total-advances-val" className="detail-val">₹{Number(totalAdvances).toFixed(2)}</div>
                </div>
              </div>

              {/* Request Withdrawal Form */}
              <form id="withdrawal-form" className="withdrawal-form" onSubmit={handleRequestWithdrawal}>
                <div className="form-group">
                  <label htmlFor="withdraw-amount">Request Payout Withdrawal</label>
                  <div className="input-with-symbol">
                    <span className="currency-symbol">₹</span>
                    <input 
                      type="number" 
                      id="withdraw-amount" 
                      className="form-control" 
                      placeholder="0.00" 
                      min="0.01" 
                      step="0.01" 
                      required 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" id="withdraw-btn" className="btn btn-primary btn-full">
                  Request Withdrawal
                </button>
              </form>
            </div>

            {/* Log Sale Card */}
            <div className="card glass-card creator-card">
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <h3>Log Affiliate Sale</h3>
                <span className="card-tag">Reference Schema</span>
              </div>
              
              <div className="tabs-content">
                <form id="create-sale-form" onSubmit={handleSubmitSale}>
                  <div className="form-group">
                    <label htmlFor="sale-brand">Brand</label>
                    <select 
                      id="sale-brand" 
                      className="form-control" 
                      required
                      value={saleForm.brandId}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, brandId: e.target.value }))}
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="sale-earning">Earning Amount (₹)</label>
                    <input 
                      type="number" 
                      id="sale-earning" 
                      className="form-control" 
                      placeholder="40.00" 
                      min="0" 
                      step="0.01" 
                      required
                      value={saleForm.earning}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, earning: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full">Submit Sale Record</button>
                </form>
              </div>
            </div>
          </section>

          {/* RIGHT SECTION: Tables and Ledger Timeline */}
          <section className="grid-right">
            
            {/* Sales Table */}
            <div className="card glass-card data-card">
              <div className="card-header-actions">
                <h3>John Doe's Affiliate Sales</h3>
                <div className="header-btns">
                  <button onClick={handleRunAdvanceJob} id="run-advance-btn" className="btn btn-accent">
                    <span className="btn-icon">⚙</span> Run Advance Payout Job
                  </button>
                </div>
              </div>
              
              <div className="table-wrapper">
                <table className="data-table" id="sales-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Brand</th>
                      <th>Earning</th>
                      <th>Advance Paid</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="sales-tbody">
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-row">No sales loaded. Click "Seed 3x ₹40 Sales" in the header to replicate the assignment worked example.</td>
                      </tr>
                    ) : (
                      sales.map(sale => (
                        <tr key={sale.id}>
                          <td>{sale.id}</td>
                          <td>{sale.brand_id}</td>
                          <td>₹{Number(sale.earning).toFixed(2)}</td>
                          <td>₹{Number(sale.advance_paid || 0).toFixed(2)}</td>
                          <td>
                            {sale.status === 'pending' && <span className="badge badge-pending">Pending</span>}
                            {sale.status === 'approved' && <span className="badge badge-success">Approved</span>}
                            {sale.status === 'rejected' && <span className="badge badge-failed">Rejected</span>}
                          </td>
                          <td>
                            {sale.status === 'pending' ? (
                              <div className="row-actions">
                                <button 
                                  onClick={(e) => handleReconcileSale(sale.id, 'approved', e)}
                                  className="btn btn-success"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={(e) => handleReconcileSale(sale.id, 'rejected', e)}
                                  className="btn btn-danger"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">Reconciled</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Withdrawals Table */}
            <div className="card glass-card data-card">
              <div className="card-header">
                <h3>Withdrawal Logs</h3>
                <span className="card-tag">24h Cooldown Rule</span>
              </div>
              
              <div className="table-wrapper">
                <table className="data-table" id="withdrawals-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Settle Manually / Queue Simulation</th>
                    </tr>
                  </thead>
                  <tbody id="withdrawals-tbody">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-row">No withdrawal requests found.</td>
                      </tr>
                    ) : (
                      withdrawals.map(w => (
                        <tr key={w.id}>
                          <td>{w.id}</td>
                          <td>₹{Number(w.amount).toFixed(2)}</td>
                          <td>
                            {w.status === 'PENDING' && <span className="badge badge-pending">Pending</span>}
                            {w.status === 'SUCCESS' && <span className="badge badge-success">Success</span>}
                            {['FAILED', 'CANCELLED', 'REJECTED'].includes(w.status) && (
                              <span className="badge badge-failed">{w.status}</span>
                            )}
                          </td>
                          <td>
                            {w.status === 'PENDING' ? (
                              <div className="row-actions">
                                <button 
                                  onClick={(e) => handleSettleWithdrawal(w.id, 'SUCCESS', e)}
                                  className="btn btn-success"
                                >
                                  Success
                                </button>
                                <button 
                                  onClick={(e) => handleSettleWithdrawal(w.id, 'FAILED', e)}
                                  className="btn btn-danger"
                                >
                                  Fail
                                </button>
                                <button 
                                  onClick={(e) => handleSettleWithdrawal(w.id, 'CANCELLED', e)}
                                  className="btn btn-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Wallet Audit Ledger timeline */}
            <div id="ledger-card" className="card glass-card data-card">
              <div className="card-header">
                <h3>Wallet Transaction Ledger</h3>
                <span className="card-tag" id="ledger-user-name">
                  john_doe's Audit Trail
                </span>
              </div>

              <div className="timeline-ledger" id="ledger-timeline">
                {transactions.length === 0 ? (
                  <div className="empty-timeline">No transactions logged for this wallet yet.</div>
                ) : (
                  transactions.map(t => {
                    const isCredit = Number(t.amount) >= 0;
                    const amtClass = isCredit ? 'credit' : 'debit';
                    const amtPrefix = isCredit ? '+' : '';
                    return (
                      <div className="timeline-item" key={t.id}>
                        <div className="timeline-info">
                          <span className="timeline-reason">{t.reason.replace(/_/g, ' ')}</span>
                          <span className="timeline-ref">
                            Ref: {t.ref_type} #{t.ref_id} | {new Date(t.created_at || Date.now()).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="timeline-amount-col">
                          <span className={`timeline-amount ${amtClass}`}>
                            {amtPrefix}₹{Number(t.amount).toFixed(2)}
                          </span>
                          <div className="timeline-balance">Bal: ₹{Number(t.balance_after).toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </section>

        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>Affiliate Payout & Reconciliation Management System &copy; 2026. Made with ✦</p>
        </footer>
      </div>

      {/* Notification Toast */}
      <div id="toast" className={`toast ${toast.type} ${!toast.visible ? 'hidden' : ''}`}>
        {toast.message}
      </div>
    </>
  );
}

export default App;
