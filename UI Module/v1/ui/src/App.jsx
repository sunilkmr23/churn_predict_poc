import { useEffect, useMemo, useState } from 'react';

const initialForm = {
  plan: 'Premium',
  monthlyPrice: 1499,
  tenureMonths: 12,
  outages: 2,
  complaints: 1,
  supportCalls: 3,
  latePayments: 0,
  competitorAvailable: 0,
  monthlyContract: 1,
  speedMbps: 500,
  avgMonthlyUsageGb: 180,
  recentPlanChange: 0,
  contractRenewalDue: 0,
  region: 'North',
};

// Modal component for displaying table info and customer details
function InfoModal({ title, content, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {content}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Info button component
function TableInfoButton({ onClick }) {
  return (
    <button className="info-btn" onClick={onClick} title="Table information">
      ℹ️
    </button>
  );
}

// Info content for different tables
const infoContent = {
  dataset: (
    <div>
      <h4>Dataset Snapshot</h4>
      <p><strong>Description:</strong> Overview of the loaded customer dataset from the local CSV file.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>Total Records:</strong> Number of customer records loaded from the dataset</li>
        <li><strong>Churned:</strong> Count of customers who have churned (churn = 1)</li>
        <li><strong>Not Churned:</strong> Count of customers who have not churned (churn = 0)</li>
      </ul>
      <p><strong>Data Source:</strong> fiber_customers_realistic.csv (15 records)</p>
    </div>
  ),
  churn: (
    <div>
      <h4>Churn Distribution</h4>
      <p><strong>Description:</strong> Visual representation of the distribution of churned vs non-churned customers.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>Churn:</strong> Number and percentage of customers who churned</li>
        <li><strong>No Churn:</strong> Number and percentage of customers who did not churn</li>
      </ul>
      <p><strong>Use:</strong> Understand the churn ratio in your customer base</p>
    </div>
  ),
  planmix: (
    <div>
      <h4>Plan Mix</h4>
      <p><strong>Description:</strong> Breakdown of customers by their current fiber service plan.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>Plan Name:</strong> The fiber plan name (e.g., Basic, Standard, Premium)</li>
        <li><strong>Count:</strong> Number of customers on each plan</li>
      </ul>
      <p><strong>Use:</strong> Identify which plans have the most customers and potential churn patterns by plan</p>
    </div>
  ),
  features: (
    <div>
      <h4>Feature Importance</h4>
      <p><strong>Description:</strong> The top 8 features (variables) that have the most influence on churn predictions.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>Feature Name:</strong> Customer attribute that affects churn</li>
        <li><strong>Importance Score:</strong> Higher score = stronger impact on churn prediction</li>
      </ul>
      <p><strong>Use:</strong> Focus retention efforts on high-importance features</p>
    </div>
  ),
  confusion: (
    <div>
      <h4>Confusion Matrix</h4>
      <p><strong>Description:</strong> Shows the accuracy of the ML model by comparing actual vs predicted churn.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>TP (True Positive):</strong> Correctly predicted churned customers</li>
        <li><strong>TN (True Negative):</strong> Correctly predicted non-churned customers</li>
        <li><strong>FP (False Positive):</strong> Incorrectly predicted churn</li>
        <li><strong>FN (False Negative):</strong> Missed churned customers</li>
      </ul>
      <p><strong>Use:</strong> Evaluate model performance and identify false positives/negatives</p>
    </div>
  ),
  springboot: (
    <div>
      <h4>Spring Boot Churn Feed</h4>
      <p><strong>Description:</strong> Real-time churn prediction data from the Spring Boot microservice.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>ID:</strong> Customer identifier</li>
        <li><strong>Risk:</strong> Churn risk level (LOW, MEDIUM, HIGH)</li>
        <li><strong>Probability:</strong> Churn probability score (0-1)</li>
        <li><strong>Campaign:</strong> Campaign threshold profile used for prediction</li>
      </ul>
      <p><strong>Use:</strong> Monitor live predictions from the backend service (shows 8 records)</p>
    </div>
  ),
  customers: (
    <div>
      <h4>Customer Table</h4>
      <p><strong>Description:</strong> Detailed customer information from the local CSV file with churn status.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>Customer:</strong> Customer row number (1-15)</li>
        <li><strong>Plan:</strong> Fiber service plan name</li>
        <li><strong>Price:</strong> Monthly subscription price</li>
        <li><strong>Tenure:</strong> Customer tenure in months</li>
        <li><strong>Churn:</strong> Actual churn status (1 = churned, 0 = not churned)</li>
        <li><strong>Details:</strong> Click "View →" to see complete customer attributes and churn details</li>
      </ul>
      <p><strong>Data Source:</strong> fiber_customers_realistic.csv (15 records)</p>
    </div>
  ),
  trends: (
    <div>
      <h4>Churn by Customer Signup Date</h4>
      <p><strong>Description:</strong> Monthly churn counts for customers based on the sample dataset signup date.</p>
      <p><strong>Content:</strong></p>
      <ul>
        <li><strong>Month:</strong> Customer creation month for the dataset</li>
        <li><strong>Total Customers:</strong> All customers created in that month</li>
        <li><strong>Churned Customers:</strong> Customers labeled as churned during that month</li>
      </ul>
      <p><strong>Use:</strong> Monitor timing trends, identify churn clusters, and compare churn versus total acquisition volume.</p>
    </div>
  ),
};

function App() {
  const [customers, setCustomers] = useState([]);
  const [springData, setSpringData] = useState([]);
  const [featureImportance, setFeatureImportance] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function loadData() {
      try {
        const [customersRes, springRes, importanceRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/churn/getchurndata'),
          fetch('/api/feature-importance'),
        ]);

        const customersData = await customersRes.json();
        const springDataResponse = await springRes.json();
        const importanceData = await importanceRes.json();

        setCustomers(customersData);
        setSpringData(Array.isArray(springDataResponse) ? springDataResponse : (springDataResponse.data || []));
        setFeatureImportance(importanceData || {});
      } catch (error) {
        console.error('Failed to load UI data', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const summary = useMemo(() => {
    const churned = customers.filter((item) => Number(item.churn) === 1).length;
    const notChurned = customers.length - churned;
    const plans = customers.reduce((acc, item) => {
      acc[item.plan] = (acc[item.plan] || 0) + 1;
      return acc;
    }, {});

    return { churned, notChurned, plans };
  }, [customers]);

  const confusionMatrix = useMemo(() => {
    const actual = customers.filter((item) => item.churn !== undefined);
    const tp = actual.filter((item) => Number(item.churn) === 1 && Number(item.predictedChurn) === 1).length;
    const tn = actual.filter((item) => Number(item.churn) === 0 && Number(item.predictedChurn) === 0).length;
    const fp = actual.filter((item) => Number(item.churn) === 0 && Number(item.predictedChurn) === 1).length;
    const fn = actual.filter((item) => Number(item.churn) === 1 && Number(item.predictedChurn) === 0).length;
    return { tp, tn, fp, fn };
  }, [customers]);

  const topFeatures = useMemo(() => {
    return Object.entries(featureImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [featureImportance]);

  const customerOptions = useMemo(() => {
    return customers.map((item, index) => ({
      id: item.customerId ?? index + 1,
      label: `#${item.customerId ?? index + 1} • ${item.customerName || 'Customer'} • ${item.plan || 'Unknown'}`,
    }));
  }, [customers]);

  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((item, index) => String(item.customerId ?? index + 1) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  const churnDialPercent = selectedCustomerDetails ? Math.round((Number(selectedCustomerDetails.churnProbability) || 0) * 100) : 0;
  const churnDialColor = '#000000';
  const dialAngle = selectedCustomerDetails ? (churnDialPercent / 100) * 180 - 90 : -90;

  const monthlyStats = useMemo(() => {
    const totalByMonth = {};
    const churnByMonth = {};

    customers.forEach((item) => {
      const month = item.createdMonth || item.joinMonth || (item.createdAt ? String(item.createdAt).slice(0, 7) : '');
      if (!month) return;
      totalByMonth[month] = (totalByMonth[month] || 0) + 1;
      if (Number(item.churn) === 1) {
        churnByMonth[month] = (churnByMonth[month] || 0) + 1;
      }
    });

    return Object.keys(totalByMonth)
      .sort()
      .map((month) => ({
        month,
        total: totalByMonth[month],
        churned: churnByMonth[month] || 0,
      }));
  }, [customers]);

  const recentMonthStats = monthlyStats.slice(-8);
  const maxMonthTotal = Math.max(...recentMonthStats.map((item) => item.total), 1);

  const waveChartData = useMemo(() => {
    if (recentMonthStats.length === 0) return { curvePath: '', fillPath: '', points: [] };
    const points = recentMonthStats.map((item, index) => {
      const x = recentMonthStats.length === 1 ? 0 : (index / (recentMonthStats.length - 1)) * 100;
      const y = 90 - (item.total / maxMonthTotal) * 72;
      return { ...item, x, y };
    });

    const curvePath = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x},${point.y}`;
      const prev = points[index - 1];
      const cx = (prev.x + point.x) / 2;
      const cy = (prev.y + point.y) / 2;
      return `${path} Q ${prev.x},${prev.y} ${cx},${cy}`;
    }, '');

    const last = points[points.length - 1];
    const fillPath = `${curvePath} L ${last.x},100 L 0,100 Z`;
    return { curvePath, fillPath, points };
  }, [recentMonthStats, maxMonthTotal]);

  const onPredict = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      setPrediction(data);
    } catch (error) {
      console.error('Prediction request failed', error);
      setPrediction({ error: 'Prediction service unavailable. Verify the Spring Boot service and FastAPI service are running.' });
    }
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['monthlyPrice', 'tenureMonths', 'outages', 'complaints', 'supportCalls', 'latePayments', 'speedMbps', 'avgMonthlyUsageGb'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  return (
    <main className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Fiber Churn Intelligence</p>
          <h1>Interactive churn dashboard</h1>
          <p className="lede">This UI reads customer data from the local project file, combines it with churn prediction endpoints, and shows churn trends, model signals, and campaign-ready insight.</p>
        </div>
        <div className="pill-row">
          <span className="pill">Feature Importance</span>
          <span className="pill">Confusion Matrix</span>
          <span className="pill">Single Customer Prediction</span>
        </div>
      </header>

      {loading ? <p>Loading dashboard data...</p> : (
        <>
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              Model Performance
            </button>
            <button 
              className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              Customer Trends
            </button>
            <button 
              className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              Insights & Predictions
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <section className="grid three-up">
                <article className="card stats-card">
                  <div className="card-header">
                    <h2>Dataset Snapshot</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('dataset')} />
                  </div>
                  <p><strong>{customers.length}</strong> customer records loaded</p>
                  <p>Churned: <strong>{summary.churned}</strong></p>
                  <p>Not churned: <strong>{summary.notChurned}</strong></p>
                </article>

                <article className="card chart-card">
                  <div className="card-header">
                    <h2>Churn Distribution</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('churn')} />
                  </div>
                  <div className="bar-chart" aria-label="Churn distribution chart">
                    <div className="bar-wrap"><label>Churn</label><div className="bar"><span style={{ width: `${(summary.churned / Math.max(customers.length, 1)) * 100}%` }} /></div><strong>{summary.churned}</strong></div>
                    <div className="bar-wrap"><label>No Churn</label><div className="bar"><span style={{ width: `${(summary.notChurned / Math.max(customers.length, 1)) * 100}%` }} /></div><strong>{summary.notChurned}</strong></div>
                  </div>
                </article>

                <article className="card">
                  <div className="card-header">
                    <h2>Plan Mix</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('planmix')} />
                  </div>
                  <ul className="tag-list">
                    {Object.entries(summary.plans).map(([plan, count]) => (
                      <li key={plan}><span>{plan}</span><strong>{count}</strong></li>
                    ))}
                  </ul>
                </article>
              </section>
            )}

            {/* Model Performance Tab */}
            {activeTab === 'performance' && (
              <section className="grid two-up">
                <article className="card">
                  <div className="card-header">
                    <h2>Feature Importance</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('features')} />
                  </div>
                  <div className="stack-list">
                    {topFeatures.map(([name, value]) => (
                      <div key={name} className="stack-row">
                        <label>{name}</label>
                        <div className="progress"><span style={{ width: `${Math.max(value * 100, 6)}%` }} /></div>
                        <strong>{value.toFixed(3)}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="card">
                  <div className="card-header">
                    <h2>Confusion Matrix</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('confusion')} />
                  </div>
                  <div className="matrix-grid">
                    <div className="matrix-cell header">Actual / Pred</div>
                    <div className="matrix-cell header">Pred Churn</div>
                    <div className="matrix-cell header">Pred No Churn</div>
                    <div className="matrix-cell label">Actual Churn</div>
                    <div className="matrix-cell good">TP {confusionMatrix.tp}</div>
                    <div className="matrix-cell warn">FN {confusionMatrix.fn}</div>
                    <div className="matrix-cell label">Actual No Churn</div>
                    <div className="matrix-cell bad">FP {confusionMatrix.fp}</div>
                    <div className="matrix-cell good">TN {confusionMatrix.tn}</div>
                  </div>
                </article>
              </section>
            )}

            {/* Customer Trends Tab */}
            {activeTab === 'trends' && (
              <section className="grid two-up">
                <article className="card">
                  <div className="card-header">
                    <h2>Customers vs Month</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('trends')} />
                  </div>
                  <div className="wave-chart-panel">
                    {waveChartData.points.length === 0 ? (
                      <p>No monthly dataset date information is available.</p>
                    ) : (
                      <div className="wave-chart-wrapper">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="wave-svg">
                          <path d={waveChartData.fillPath} className="wave-fill" />
                          <path d={waveChartData.curvePath} className="wave-line" />
                          {waveChartData.points.map((point) => (
                            <circle key={point.month} cx={point.x} cy={point.y} r="1.5" className="wave-point" />
                          ))}
                        </svg>
                        <div className="wave-labels">
                          {waveChartData.points.map((point) => (
                            <div key={`label-${point.month}`} className="wave-label">
                              <span>{point.month.slice(-2)}</span>
                              <strong>{point.total}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>

                <article className="card">
                  <div className="card-header">
                    <h2>Customer Churn Dial</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('trends')} />
                  </div>
                  <div className="dial-card">
                    <label className="dropdown-control">
                      <span>Select Customer</span>
                      <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                        <option value="">Select a customer</option>
                        {customerOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="dial-wrapper">
                      <div className="dial-ring">
                        <div className="dial-arc" style={{ background: `linear-gradient(90deg, #22c55e 0%, #facc15 50%, #ef4444 100%)` }} />
                        <div className="dial-pointer" style={{ transform: `rotate(${dialAngle}deg)`, background: churnDialColor }} />
                        <div className="dial-center" style={{ background: churnDialColor }} />
                      </div>
                      <div className="dial-caption">
                        {selectedCustomerDetails ? (
                          <>
                            <strong>{churnDialPercent}%</strong>
                            <span>{selectedCustomerDetails.plan} / {selectedCustomerDetails.region || 'Unknown'}</span>
                          </>
                        ) : (
                          <span>Select a customer to see churn propensity.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            )}

            {/* Insights & Predictions Tab */}
            {activeTab === 'insights' && (
              <section className="grid two-up">
                <article className="card">
                  <h2>New Customer Prediction</h2>
                  <form onSubmit={onPredict} className="predict-form">
                    {Object.entries(form).map(([key, value]) => (
                      <label key={key}>
                        <span>{key}</span>
                        <input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          name={key}
                          value={value}
                          onChange={onChange}
                        />
                      </label>
                    ))}
                    <button type="submit">Predict churn</button>
                  </form>
                  {prediction && (
                    <pre className="result-box">{JSON.stringify(prediction, null, 2)}</pre>
                  )}
                </article>

                <article className="card">
                  <div className="card-header">
                    <h2>Spring Boot Churn Feed</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('springboot')} />
                  </div>
                  <p className="lede">This panel reads the Spring Boot endpoint for all customer churn records and shows the live data flow behind the prediction service.</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Risk</th>
                          <th>Probability</th>
                          <th>Campaign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {springData.slice(0, 8).map((row, index) => (
                          <tr key={`spring-${index}`}>
                            <td>{row.customerId || index + 1}</td>
                            <td>{row.risk || row.prediction || '—'}</td>
                            <td>{row.churnProbability ?? row.probability ?? '—'}</td>
                            <td>{row.campaign || row.thresholdProfile || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="card">
                  <div className="card-header">
                    <h2>Customer Table (15 records from local file)</h2>
                    <TableInfoButton onClick={() => setActiveInfoModal('customers')} />
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Plan</th>
                          <th>Price</th>
                          <th>Tenure</th>
                          <th>Churn</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.slice(0, 15).map((row, index) => (
                          <tr key={`${row.plan}-${index}`}>
                            <td>{row.customerName || index + 1}</td>
                            <td>{row.plan}</td>
                            <td>{row.monthlyPrice}</td>
                            <td>{row.tenureMonths}</td>
                            <td>{row.churn ?? '—'}</td>
                            <td>
                              <button 
                                className="details-btn"
                                onClick={() => {
                                  setSelectedCustomer({ ...row, id: index + 1 });
                                  setShowDetailModal(true);
                                }}
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            )}
          </div>
        </>
      )}

      {/* Customer Details Modal */}
      {showDetailModal && selectedCustomer && (
        <InfoModal
          title={`Customer #${selectedCustomer.id} - Complete Details`}
          content={
            <div className="customer-details">
              <div className="details-grid">
                {Object.entries(selectedCustomer).map(([key, value]) => (
                  <div key={key} className="detail-row">
                    <strong>{key}:</strong>
                    <span>{value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          }
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Table Info Modal */}
      {activeInfoModal && (
        <InfoModal
          title="Table Information"
          content={infoContent[activeInfoModal] || <p>Information not available</p>}
          onClose={() => setActiveInfoModal(null)}
        />
      )}
    </main>
  );
}

export default App;
