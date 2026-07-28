const express = require('express');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const fetch = require('node-fetch');

const app = express();
const port = 4000;
const BASE_DIR = path.resolve(__dirname, '..');
const CSV_PATH = path.join(BASE_DIR, 'fiber_customers_realistic.csv');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function readCustomers() {
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  return parse(csvText, { columns: true, skip_empty_lines: true });
}

app.get('/api/customers', (req, res) => {
  const offset = parseInt(req.query.offset || '0', 10) || 0;
  const limit = parseInt(req.query.limit || '50', 10) || 50;

  // Prefer FastAPI backend if available (supports pagination)
  const backendUrl = `http://127.0.0.1:8000/api/customers?offset=${offset}&limit=${limit}`;
  fetch(backendUrl)
    .then((r) => {
      if (!r.ok) throw new Error('Backend returned ' + r.status);
      return r.json();
    })
    .then((data) => res.json(data))
    .catch((err) => {
      // Fallback: read local CSV and return a slice to avoid huge payloads
      try {
        const all = readCustomers();
        const start = Math.max(0, offset);
        const end = Math.min(all.length, start + Math.min(limit, 500));
        const slice = all.slice(start, end);
        res.json(slice);
      } catch (error) {
        res.status(500).json({ error: 'Unable to read customer data file.', details: error.message, backendError: err.message });
      }
    });
});

app.get('/api/feature-importance', async (req, res) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/feature-importance');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'FastAPI service is unavailable', details: error.message });
  }
});

app.post('/api/customer-feature-importance', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/customer-feature-importance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'FastAPI service is unavailable', details: error.message });
  }
});

app.get('/api/churn/getchurndata', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3333/api/churn/getchurndata');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Spring Boot service is unavailable', details: error.message });
  }
});

app.post('/api/predict', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3333/api/churn/predict-by-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Spring Boot prediction service is unavailable', details: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`UI service is running on http://localhost:${port}`);
});
