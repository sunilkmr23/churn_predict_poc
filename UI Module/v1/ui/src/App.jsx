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

function getCustomerIdFromUrl() {
  const url = new URL(window.location.href);
  const queryId = url.searchParams.get('customerId');
  if (queryId?.trim()) return queryId.trim();

  const pathMatch = url.pathname.match(/^\/customer\/([^/]+)\/?$/);
  if (!pathMatch) return '';

  try {
    return decodeURIComponent(pathMatch[1]);
  } catch {
    return pathMatch[1];
  }
}


const infoContent = {
  customer: 'Customer profile, plan, tenure, and churn statistics for the selected user.',
  risk: 'Churn prediction score and risk rating for the selected customer.',
  trend: 'Average model churn probability grouped by month.',
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
  const [externalPrediction, setExternalPrediction] = useState(null);
  const initialCustomerId = useRef(null);
  if (initialCustomerId.current === null) {
    initialCustomerId.current = getCustomerIdFromUrl();
  }
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const pageSize = 50;
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);

  async function loadCustomersPage(offset) {
    if (offset === 0) {
      setCustomers([]);
      setSelectedIndex(0);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await fetch(`/api/customers?offset=${offset}&limit=${pageSize}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch customers: ${res.status}`);
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      setCustomers((prev) => (offset === 0 ? items : [...prev, ...items]));
      setHasMore(items.length === pageSize);
      setPageOffset(offset + items.length);
    } catch (error) {
      console.error('Failed to load customers', error);
      setHasMore(false);
    } finally {
      if (offset > 0) {
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        await loadCustomersPage(0);
      } catch (error) {
        console.error('Failed to load UI data', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedCustomer = customers[selectedIndex] || null;
  const dashboardCustomer = useMemo(() => {
    const row = externalPrediction?.customer;
    if (!row) return initialCustomerId.current ? null : selectedCustomer;

    const getValue = (field) => {
      const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === field.toLowerCase());
      return key ? row[key] : null;
    };

    return {
      customerId: getValue('customerId') || initialCustomerId.current,
      customerName: getValue('customerName'),
      plan: getValue('plan'),
      monthlyPrice: getValue('monthlyPrice'),
      tenureMonths: getValue('tenureMonths'),
      outages: getValue('outages'),
      complaints: getValue('complaints'),
      supportCalls: getValue('supportCalls'),
      latePayments: getValue('latePayments'),
      competitorAvailable: getValue('competitorAvailable'),
      monthlyContract: getValue('monthlyContract'),
      speedMbps: getValue('speedMbps'),
      avgMonthlyUsageGb: getValue('avgMonthlyUsageGb'),
      recentPlanChange: getValue('recentPlanChange'),
      contractRenewalDue: getValue('contractRenewalDue'),
      region: getValue('region'),
      churnProbability: externalPrediction.churn_probability,
    };
  }, [externalPrediction, selectedCustomer]);

  // Fetch customer-specific feature importance when selected customer changes
  useEffect(() => {
    if (!dashboardCustomer) return;

    const controller = new AbortController();

    function hasNumericScores(data) {
      return data && typeof data === 'object' && Object.entries(data).some(([, score]) => Number.isFinite(Number(score)));
    }

    async function loadCustomerFeatures() {
      setFeaturesLoading(true);
      try {
        console.log('Fetching features for customer:', dashboardCustomer.customerName);
        const res = await fetch('/api/customer-feature-importance', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: dashboardCustomer.plan || 'fiber',
            monthlyPrice: dashboardCustomer.monthlyPrice || 0,
            tenureMonths: dashboardCustomer.tenureMonths || 0,
            outages: dashboardCustomer.outages || 0,
            complaints: dashboardCustomer.complaints || 0,
            supportCalls: dashboardCustomer.supportCalls || 0,
            latePayments: dashboardCustomer.latePayments || 0,
            competitorAvailable: dashboardCustomer.competitorAvailable || 0,
            monthlyContract: dashboardCustomer.monthlyContract || 0,
            speedMbps: dashboardCustomer.speedMbps || 0,
            avgMonthlyUsageGb: dashboardCustomer.avgMonthlyUsageGb || 0,
            recentPlanChange: dashboardCustomer.recentPlanChange || 0,
            contractRenewalDue: dashboardCustomer.contractRenewalDue || 0,
            region: dashboardCustomer.region || 'region_a',
          }),
        });
        if (res.ok) {
          const featuresData = await res.json();
          if (hasNumericScores(featuresData)) {
            console.log('Received customer-specific features:', Object.keys(featuresData).length, 'features');
            setFeatureImportance(featuresData);
            return;
          }
          console.warn('Customer-specific feature response had no numeric scores, falling back to global importance');
        } else {
          console.warn('Customer-specific feature importance failed:', res.status, 'falling back to global importance');
        }

        const globalRes = await fetch('/api/feature-importance', { signal: controller.signal });
        if (!globalRes.ok) {
          throw new Error(`Global feature importance failed: ${globalRes.status}`);
        }
        const globalData = await globalRes.json();
        console.log('Received global features:', Object.keys(globalData).length, 'features');
        setFeatureImportance(hasNumericScores(globalData) ? globalData : {});
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load feature importance', err);
        }
      } finally {
        setFeaturesLoading(false);
      }
    }

    loadCustomerFeatures();

    return () => controller.abort();
  }, [dashboardCustomer]);

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
    return Object.entries(featureImportance)
      .filter(([, score]) => Number.isFinite(Number(score)))
      .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
      .slice(0, 5);
  }, [featureImportance]);
  const maxFeatureImpact = Math.max(0, ...topFeatures.map(([, score]) => Math.abs(Number(score))));

  const churnPercent = dashboardCustomer ? Math.round((Number(dashboardCustomer.churnProbability) || 0) * 100) : 0;
  const apiRisk = String(externalPrediction?.risk || '').toUpperCase();
  const churnRisk = apiRisk === 'HIGH' ? 'High Risk' : apiRisk === 'MEDIUM' ? 'Medium Risk' : apiRisk === 'LOW' ? 'Low Risk' : churnPercent >= 75 ? 'High Risk' : churnPercent >= 50 ? 'Medium Risk' : 'Low Risk';
  const churnNote = externalPrediction?.risk_reason || (churnRisk === 'High Risk'
    ? 'This customer is likely to churn in the next 30 days.'
    : churnRisk === 'Medium Risk'
      ? 'This customer has a notable churn likelihood.'
      : 'This customer appears low risk for churn.');
  const recommendedAction = churnRisk === 'High Risk'
    ? 'Recommend retention offer with priority support and plan upgrade options.'
    : churnRisk === 'Medium Risk'
      ? 'Monitor usage and engage with a targeted incentive campaign.'
      : 'Maintain service quality and keep proactive reward outreach.';

  const lineChartPoints = useMemo(() => {
    const monthTotals = new Map();
    customers.forEach((customer) => {
      const month = String(customer.createdMonth || '');
      const probability = Number(customer.churnProbability);
      if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(probability)) return;

      const totals = monthTotals.get(month) || { probability: 0, count: 0 };
      totals.probability += probability;
      totals.count += 1;
      monthTotals.set(month, totals);
    });

    return [...monthTotals.entries()]
      .sort(([firstMonth], [secondMonth]) => firstMonth.localeCompare(secondMonth))
      .slice(-8)
      .map(([month, totals]) => {
        const [year, monthNumber] = month.split('-').map(Number);
        const date = new Date(year, monthNumber - 1, 1);
        return {
          month,
          monthLabel: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
          year: String(year),
          value: Math.round((totals.probability / totals.count) * 100),
        };
      });
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
    if (!dashboardCustomer) return [];
    if (externalPrediction) {
      return [
        { label: 'Monthly Price', value: `₹${dashboardCustomer.monthlyPrice ?? '—'}` },
        { label: 'Data Usage', value: `${dashboardCustomer.avgMonthlyUsageGb ?? '—'} GB` },
        { label: 'Speed', value: `${dashboardCustomer.speedMbps ?? '—'} Mbps` },
        { label: 'Outages', value: dashboardCustomer.outages ?? '—' },
        { label: 'Complaints', value: dashboardCustomer.complaints ?? '—' },
        { label: 'Support Calls', value: dashboardCustomer.supportCalls ?? '—' },
        { label: 'Late Payments', value: dashboardCustomer.latePayments ?? '—' },
        { label: 'Region', value: dashboardCustomer.region || '—' },
      ];
    }
    return [
      { label: 'Monthly Charges', value: `₹${dashboardCustomer.monthlyPrice}` },
      { label: 'Data Usage', value: `${dashboardCustomer.avgMonthlyUsageGb} GB` },
      { label: 'Voice Usage', value: `${dashboardCustomer.speedMbps} mins` },
      { label: 'SMS Usage', value: `${dashboardCustomer.outages * 4} msgs` },
      { label: 'Last Recharge', value: dashboardCustomer.createdMonth || 'N/A' },
    ];
  }, [dashboardCustomer, externalPrediction]);

  async function requestPrediction(customerId) {
    if (!customerId) {
      setPredictionError('Enter a customer ID.');
      setExternalPrediction(null);
      return;
    }

    setPredictionLoading(true);
    setPredictionError('');
    setExternalPrediction(null);
    try {
      const res = await fetch(`/api/churn/predict-by-id/${encodeURIComponent(customerId)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || `Prediction failed (${res.status}).`);
      }
      if (!data.customer) {
        throw new Error('Prediction succeeded, but the Adapter did not return the customer record.');
      }
      setExternalPrediction(data);
    } catch (err) {
      setPredictionError(err.message || 'Unable to get a prediction for this customer.');
    } finally {
      setPredictionLoading(false);
    }
  }

  useEffect(() => {
    const customerId = initialCustomerId.current;
    if (!customerId) return;
    window.history.replaceState({}, '', `/customer/${encodeURIComponent(customerId)}`);
    requestPrediction(customerId);
  }, []);

  function formatFieldLabel(field) {
    return field
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const isContractActive = ['1', 'Y', 'YES', 'TRUE', 'ACTIVE'].includes(
    String(dashboardCustomer?.monthlyContract ?? '').toUpperCase(),
  );

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

      {!loading && predictionLoading && (
        <div className="dashboard-message" role="status">Loading customer {initialCustomerId.current} and calculating churn...</div>
      )}
      {!loading && predictionError && <div className="dashboard-message error" role="alert">{predictionError}</div>}

      {loading ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : (
        <div className="dashboard-grid">
          <section className="dashboard-top-row">
            <article className="card customer-card">
              <div className="card-top-row">
                <div>
                  <div className="small-label">Customer Details</div>
                  <h2>{dashboardCustomer?.customerName || 'Customer Name'}</h2>
                  <p className="customer-id">CUST-{dashboardCustomer?.customerId ?? '000'}</p>
                </div>
                {!externalPrediction && <div className="customer-select-wrap">
                  <CustomerDropdown
                    customers={customers}
                    selectedIndex={selectedIndex}
                    onSelect={(idx) => setSelectedIndex(Number(idx))}
                    loadMore={() => loadCustomersPage(pageOffset)}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                  />
                </div>}
              </div>
              <div className="customer-card-content">
                <div className="customer-avatar-large">👤</div>
                <div className="customer-info-grid">
                  <div><span>Customer ID</span><strong>{dashboardCustomer?.customerId || '—'}</strong></div>
                  <div><span>Plan</span><strong>{dashboardCustomer?.plan || '—'}</strong></div>
                  <div><span>Monthly Price</span><strong>{dashboardCustomer?.monthlyPrice ?? '—'}</strong></div>
                  <div><span>Tenure</span><strong>{dashboardCustomer?.tenureMonths ?? '—'} Months</strong></div>
                  <div><span>Region</span><strong>{dashboardCustomer?.region || '—'}</strong></div>
                </div>
                <div className={`status-badge ${isContractActive ? 'active' : 'inactive'}`}>
                  {isContractActive ? 'Active' : 'Inactive'}
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
                  <div className="small-label">Average Churn Probability by Month</div>
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
              <div className="chart-x-axis" style={{ gridTemplateColumns: `repeat(${Math.max(lineChartPoints.length, 1)}, minmax(0, 1fr))` }}>
                {lineChartPoints.map((point, idx) => (
                  <div key={point.month} className="x-label-cell">
                    <span className="x-label-month">{point.monthLabel}</span>
                    <span className="x-label-year">{point.year}</span>
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
                {!featuresLoading && topFeatures.length === 0 && <div className="feature-empty-state">No customer-specific driver results available.</div>}
                {topFeatures.map(([name, score]) => {
                  const impact = Number(score);
                  const colorClass = impact >= 0 ? 'bar-red' : 'bar-cyan';
                  return (
                    <div key={name} className="feature-row">
                      <div className="feature-name">{formatFieldLabel(name)}</div>
                      <div className="feature-bar-track">
                        <div className={`feature-bar-fill ${colorClass}`} style={{ width: `${maxFeatureImpact ? Math.max((Math.abs(impact) / maxFeatureImpact) * 96, 2) : 0}%` }} />
                      </div>
                      <div className="feature-value" title={impact >= 0 ? 'Raises churn probability versus the reference customer' : 'Lowers churn probability versus the reference customer'}>
                        {impact > 0 ? '+' : ''}{(impact * 100).toFixed(1)} pp
                      </div>
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
                <p>{recommendedAction}</p>
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
