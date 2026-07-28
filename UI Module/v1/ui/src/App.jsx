import { useEffect, useMemo, useState, useRef } from 'react';

function InfoModal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function TableInfoButton({ onClick }) {
  return (
    <button className="info-btn" onClick={onClick} aria-label="More info">i</button>
  );
}

function CustomerDropdown({ customers, selectedIndex, onSelect, loadMore, hasMore, loadingMore }) {
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!hasMore || loadingMore) return;
      const threshold = 120; // px from bottom
      if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
        loadMore();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [open, hasMore, loadingMore, loadMore]);

  return (
    <div className="customer-dropdown">
      <button className="customer-dropdown-toggle" onClick={() => setOpen((s) => !s)}>
        {customers[selectedIndex]?.customerName || 'Select customer'}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="customer-dropdown-list" ref={listRef} role="listbox">
          {customers.length === 0 && <div className="customer-dropdown-item">Loading...</div>}
          {customers.map((c, idx) => (
            <div
              key={c.customerId || idx}
              className={`customer-dropdown-item ${idx === selectedIndex ? 'selected' : ''}`}
              onClick={() => { onSelect(idx); setTimeout(() => setOpen(false), 70); }}
              role="option"
              aria-selected={idx === selectedIndex}
            >
              {c.customerName || `Customer ${idx + 1}`}
            </div>
          ))}
          {loadingMore && <div className="customer-dropdown-item">Loading more…</div>}
          {!hasMore && <div className="customer-dropdown-item muted">End of list</div>}
        </div>
      )}
    </div>
  );
}


const infoContent = {
  customer: 'Customer profile, plan, tenure, and churn statistics for the selected user.',
  risk: 'Churn prediction score and risk rating for the selected customer.',
  trend: 'Churn probability trend over recent months for the sample dataset.',
  factors: 'Top features that most influence the churn prediction model.',
  usage: 'Summary of selected customer usage across their plan and behavior.',
};

function App() {
  const [customers, setCustomers] = useState([]);
  const [featureImportance, setFeatureImportance] = useState({});
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeInfoModal, setActiveInfoModal] = useState(null);
  const pageSize = 50;
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);

  async function loadCustomersPage(offset = 0) {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/customers?offset=${offset}&limit=${pageSize}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers((prev) => (offset === 0 ? data : [...prev, ...data]));
        setHasMore(data.length === pageSize);
        setPageOffset(offset + data.length);
        if (offset === 0 && data.length > 0) setSelectedIndex(0);
      } else {
        // fallback if API returns object with items
        const items = data.items || [];
        setCustomers((prev) => (offset === 0 ? items : [...prev, ...items]));
        setHasMore(items.length === pageSize);
        setPageOffset(offset + items.length);
        if (offset === 0 && items.length > 0) setSelectedIndex(0);
      }
    } catch (err) {
      console.error('Failed to load customers page', err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        await Promise.all([
          loadCustomersPage(0),
          (async () => {
            const res = await fetch('/api/feature-importance');
            const featuresData = await res.json();
            setFeatureImportance(featuresData || {});
          })(),
        ]);
      } catch (error) {
        console.error('Failed to load UI data', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedCustomer = customers[selectedIndex] || null;

  // Fetch customer-specific feature importance when selected customer changes
  useEffect(() => {
    if (!selectedCustomer) return;

    const controller = new AbortController();

    async function loadCustomerFeatures() {
      setFeaturesLoading(true);
      try {
        console.log('Fetching features for customer:', selectedCustomer.customerName);
        const res = await fetch('/api/customer-feature-importance', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: selectedCustomer.plan || 'fiber',
            monthlyPrice: selectedCustomer.monthlyPrice || 0,
            tenureMonths: selectedCustomer.tenureMonths || 0,
            outages: selectedCustomer.outages || 0,
            complaints: selectedCustomer.complaints || 0,
            supportCalls: selectedCustomer.supportCalls || 0,
            latePayments: selectedCustomer.latePayments || 0,
            competitorAvailable: selectedCustomer.competitorAvailable || 0,
            monthlyContract: selectedCustomer.monthlyContract || 0,
            speedMbps: selectedCustomer.speedMbps || 0,
            avgMonthlyUsageGb: selectedCustomer.avgMonthlyUsageGb || 0,
            recentPlanChange: selectedCustomer.recentPlanChange || 0,
            contractRenewalDue: selectedCustomer.contractRenewalDue || 0,
            region: selectedCustomer.region || 'region_a',
          }),
        });
        if (!res.ok) {
          console.error('Backend returned:', res.status);
          return;
        }
        const featuresData = await res.json();
        console.log('Received features:', Object.keys(featuresData).length, 'features');
        setFeatureImportance(featuresData || {});
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load customer-specific features', err);
        }
      } finally {
        setFeaturesLoading(false);
      }
    }

    loadCustomerFeatures();

    return () => controller.abort();
  }, [selectedCustomer?.customerId]);

  const summary = useMemo(() => {
    const churned = customers.filter((item) => Number(item.churn) === 1).length;
    const notChurned = customers.length - churned;
    const plans = customers.reduce((acc, item) => {
      acc[item.plan] = (acc[item.plan] || 0) + 1;
      return acc;
    }, {});

    return { churned, notChurned, plans };
  }, [customers]);

  const topFeatures = useMemo(() => {
    const entries = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return [
        ['High Monthly Charges', 0.35],
        ['Competitor Offer', 0.25],
        ['Poor Network Experience', 0.20],
        ['Low Data Usage', 0.10],
        ['Customer Service Issues', 0.10],
      ];
    }
    return entries.slice(0, 5);
  }, [featureImportance]);

  const churnPercent = selectedCustomer ? Math.round((Number(selectedCustomer.churnProbability) || 0) * 100) : 0;
  const churnRisk = churnPercent >= 75 ? 'High Risk' : churnPercent >= 50 ? 'Medium Risk' : 'Low Risk';
  const churnNote = churnRisk === 'High Risk'
    ? 'This customer is likely to churn in the next 30 days.'
    : churnRisk === 'Medium Risk'
      ? 'This customer has a notable churn likelihood.'
      : 'This customer appears low risk for churn.';
  const recommendedAction = churnRisk === 'High Risk'
    ? 'Recommend retention offer with priority support and plan upgrade options.'
    : churnRisk === 'Medium Risk'
      ? 'Monitor usage and engage with a targeted incentive campaign.'
      : 'Maintain service quality and keep proactive reward outreach.';

  const lineChartPoints = useMemo(() => {
    return customers.slice(0, 8).map((item, idx) => ({
      month: item.createdMonth || `M${idx + 1}`,
      value: Math.round((Number(item.churnProbability) || 0) * 100),
    }));
  }, [customers]);

  const linePath = useMemo(() => {
    if (lineChartPoints.length === 0) return '';
    return lineChartPoints.reduce((path, point, idx) => {
      const x = idx * (100 / Math.max(lineChartPoints.length - 1, 1));
      const y = 100 - point.value;
      return idx === 0 ? `M ${x},${y}` : `${path} L ${x},${y}`;
    }, '');
  }, [lineChartPoints]);

  const usageSummary = useMemo(() => {
    if (!selectedCustomer) return [];
    return [
      { label: 'Monthly Charges', value: `₹${selectedCustomer.monthlyPrice}` },
      { label: 'Data Usage', value: `${selectedCustomer.avgMonthlyUsageGb} GB` },
      { label: 'Voice Usage', value: `${selectedCustomer.speedMbps} mins` },
      { label: 'SMS Usage', value: `${selectedCustomer.outages * 4} msgs` },
      { label: 'Last Recharge', value: selectedCustomer.createdMonth || 'N/A' },
    ];
  }, [selectedCustomer]);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <div className="dashboard-title">PER CUSTOMER VIEW — CHURN PREDICTION</div>
        </div>
        <div className="dashboard-user">
          <div className="user-avatar">AD</div>
          <div className="user-meta">
            <div className="user-name">Admin</div>
            <div className="user-role">Product Owner</div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : (
        <div className="dashboard-grid">
          <section className="dashboard-top-row">
            <article className="card customer-card">
              <div className="card-top-row">
                <div>
                  <div className="small-label">Customer Details</div>
                  <h2>{selectedCustomer?.customerName || 'Customer Name'}</h2>
                  <p className="customer-id">CUST-{selectedCustomer?.customerId ?? '000'}</p>
                </div>
                <div className="customer-select-wrap">
                  <CustomerDropdown
                    customers={customers}
                    selectedIndex={selectedIndex}
                    onSelect={(idx) => setSelectedIndex(Number(idx))}
                    loadMore={() => loadCustomersPage(pageOffset)}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                  />
                </div>
              </div>
              <div className="customer-card-content">
                <div className="customer-avatar-large">👤</div>
                <div className="customer-info-grid">
                  <div><span>Name</span><strong>{selectedCustomer?.customerName || '—'}</strong></div>
                  <div><span>Mobile</span><strong>98765 43210</strong></div>
                  <div><span>Email</span><strong>{selectedCustomer ? `${selectedCustomer.customerName?.split(' ')[0].toLowerCase() || 'user'}@email.com` : 'user@email.com'}</strong></div>
                  <div><span>Plan</span><strong>{selectedCustomer?.plan || '—'}</strong></div>
                  <div><span>Tenure</span><strong>{selectedCustomer?.tenureMonths ?? '—'} Months</strong></div>
                </div>
                <div className={`status-badge ${selectedCustomer?.monthlyContract ? 'active' : 'inactive'}`}>
                  {selectedCustomer?.monthlyContract ? 'Active' : 'Inactive'}
                </div>
              </div>
            </article>

            <article className="card prediction-card">
              <div className="prediction-card-layout">
                <div className="prediction-left">
                  <div className="small-label">Churn Prediction</div>
                  <div className="churn-percent-display">{churnPercent}%</div>
                  <div className={`risk-badge ${churnRisk.replace(' ', '-').toLowerCase()}`}>{churnRisk}</div>
                  <p className="prediction-text">{churnNote}</p>
                  <div className="recommendation-bar">{recommendedAction}</div>
                </div>
                <div className="prediction-right">
                  <div className="odometer-container">
                    <svg viewBox="0 0 240 140" className="odometer-gauge">
                      <defs>
                        <linearGradient id="odometerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="33%" stopColor="#fbbf24" />
                          <stop offset="66%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                      {/* Gradient arc - half circle (semicircle) */}
                      <path d="M 30 110 A 90 90 0 0 1 210 110" stroke="url(#odometerGradient)" strokeWidth="18" fill="none" strokeLinecap="round" />
                      {/* Tick marks */}
                      <line x1="120" y1="20" x2="120" y2="35" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="184.5" y1="34" x2="197" y2="45" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="210" y1="110" x2="225" y2="110" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="184.5" y1="186" x2="197" y2="175" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="55.5" y1="34" x2="43" y2="45" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                      {/* Percentage labels positioned for half circle */}
                      <text x="28" y="120" fontSize="13" fontWeight="700" fill="#334155" textAnchor="middle">0%</text>
                      <text x="65" y="40" fontSize="13" fontWeight="700" fill="#334155" textAnchor="middle">25%</text>
                      <text x="120" y="18" fontSize="13" fontWeight="700" fill="#334155" textAnchor="middle">50%</text>
                      <text x="175" y="40" fontSize="13" fontWeight="700" fill="#334155" textAnchor="middle">75%</text>
                      <text x="212" y="120" fontSize="13" fontWeight="700" fill="#334155" textAnchor="middle">100%</text>
                      {/* Center circle */}
                      <circle cx="120" cy="110" r="8" fill="#1f2937" stroke="#ffffff" strokeWidth="2" />
                      {/* Needle */}
                      <g transform={`rotate(${-90 + (churnPercent / 100) * 180} 120 110)`}>
                        <line x1="120" y1="110" x2="120" y2="25" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
                        <circle cx="120" cy="110" r="6" fill="#1f2937" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </article>

            <article className="card trend-card">
              <div className="card-top-row space-between">
                <div>
                  <div className="small-label">Churn Probability Over Time</div>
                  <h2>Probability Trend</h2>
                </div>
                <TableInfoButton onClick={() => setActiveInfoModal('trend')} />
              </div>
              <div className="line-chart-container">
                <div className="chart-y-axis">
                  <span className="y-label">100%</span>
                  <span className="y-label">75%</span>
                  <span className="y-label">50%</span>
                  <span className="y-label">25%</span>
                  <span className="y-label">0%</span>
                </div>
                <div className="line-chart-panel">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart-svg">
                    {linePath && (
                      <path d={`${linePath} L 100,100 L 0,100 Z`} className="line-chart-area" />
                    )}
                    <path d={linePath} className="line-chart-path" />
                    {lineChartPoints.map((point, index) => {
                      const x = index * (100 / Math.max(lineChartPoints.length - 1, 1));
                      const y = 100 - point.value;
                      return <circle key={point.month} cx={x} cy={y} r="2.2" className="line-dot" />;
                    })}
                  </svg>
                </div>
              </div>
              <div className="chart-x-axis">
                {lineChartPoints.map((point, idx) => (
                  <div key={point.month} className="x-label-cell">
                    <span>{point.month}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-bottom-row">
            <article className="card feature-card">
              <div className="card-top-row space-between">
                <div>
                  <div className="small-label">Key Factors Influencing Churn</div>
                  <h3>Top drivers</h3>
                </div>
                <button className="details-btn" onClick={() => setActiveInfoModal('factors')}>View All</button>
              </div>
              {featuresLoading && <div className="loading-state">Updating factors…</div>}
              <div className="feature-list">
                {topFeatures.map(([name, score], idx) => {
                  const colorClass = ['bar-red', 'bar-orange', 'bar-yellow', 'bar-cyan', 'bar-blue'][idx % 5];
                  return (
                    <div key={name} className="feature-row">
                      <div className="feature-name">{name}</div>
                      <div className="feature-bar-track">
                        <div className={`feature-bar-fill ${colorClass}`} style={{ width: `${Math.min(score * 100, 96)}%` }} />
                      </div>
                      <div className="feature-value">{Math.round(score * 100)}%</div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="card summary-card">
              <div className="card-top-row space-between">
                <div>
                  <div className="small-label">Customer Usage Summary</div>
                  <h3>Usage details</h3>
                </div>
                <button className="details-btn" onClick={() => setActiveInfoModal('usage')}>Info</button>
              </div>
              <div className="usage-grid">
                {usageSummary.map((item) => (
                  <div key={item.label} className="usage-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="card activity-card">
              <div className="card-top-row space-between">
                <div>
                  <div className="small-label">Recent Activity</div>
                  <h3>Customer updates</h3>
                </div>
                <button className="details-btn">See More</button>
              </div>
              <div className="activity-list">
                <div className="activity-row"><span>01 Jun 2025</span><strong>Plan renewed</strong></div>
                <div className="activity-row"><span>28 May 2025</span><strong>Customer care call</strong></div>
                <div className="activity-row"><span>20 May 2025</span><strong>Viewed offer — 20% OFF</strong></div>
                <div className="activity-row"><span>10 May 2025</span><strong>Network complaint</strong></div>
              </div>
            </article>

            <article className="card action-card">
              <div className="action-label">Recommended Next Best Action</div>
              <div className="action-body">
                <p>Offer 20% discount on next 3 months plan</p>
                <button className="send-offer-btn">Send Offer</button>
              </div>
            </article>
          </section>
        </div>
      )}

      {activeInfoModal && (
        <InfoModal title="Info" onClose={() => setActiveInfoModal(null)}>
          <p>{infoContent[activeInfoModal] || 'Information not available.'}</p>
        </InfoModal>
      )}
    </main>
  );
}

export default App;
