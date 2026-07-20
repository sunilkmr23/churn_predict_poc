
import json
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / 'churn_model.pkl'
COLS_PATH = BASE_DIR / 'model_columns.pkl'
THRESHOLD_PATH = BASE_DIR / 'threshold_tuning.json'

app = FastAPI(title='Fiber Churn Intelligence', version='1.1.0')

model = joblib.load(MODEL_PATH)
cols = joblib.load(COLS_PATH)
threshold_tuning = json.loads(THRESHOLD_PATH.read_text(encoding='utf-8')) if THRESHOLD_PATH.exists() else {}

# Load customer dataset for API listing (used for UI customer picker)
CUSTOMERS_CSV = BASE_DIR / 'fiber_customers_realistic.csv'
if not CUSTOMERS_CSV.exists():
    # fallback to alternate datasets if realistic file missing
    alt = BASE_DIR / 'fiber_customers.csv'
    CUSTOMERS_CSV = alt if alt.exists() else None

_customers_df = None
if CUSTOMERS_CSV and CUSTOMERS_CSV.exists():
    try:
        _customers_df = pd.read_csv(CUSTOMERS_CSV)
    except Exception:
        _customers_df = None


class Customer(BaseModel):
    plan: str = Field(..., description='Fiber plan name')
    monthlyPrice: float = Field(..., ge=0, description='Monthly price in currency units')
    tenureMonths: int = Field(..., ge=0, description='Customer tenure in months')
    outages: int = Field(..., ge=0, description='Number of outages')
    complaints: int = Field(..., ge=0, description='Number of complaints')
    supportCalls: int = Field(..., ge=0, description='Support calls made')
    latePayments: int = Field(..., ge=0, description='Late payment incidents')
    competitorAvailable: int = Field(..., ge=0, le=1, description='Competitor available (0/1)')
    monthlyContract: int = Field(..., ge=0, le=1, description='Monthly contract (0/1)')
    speedMbps: int = Field(..., ge=0, description='Internet speed in Mbps')
    avgMonthlyUsageGb: int = Field(..., ge=0, description='Average monthly usage in GB')
    recentPlanChange: int = Field(..., ge=0, le=1, description='Recent plan change (0/1)')
    contractRenewalDue: int = Field(..., ge=0, le=1, description='Contract renewal due (0/1)')
    region: str = Field(..., description='Customer region')

@app.get('/', response_class=HTMLResponse)
def root():
    return """
    <html>
      <head><title>Fiber Churn Intelligence</title></head>
      <body style='font-family: Arial, sans-serif; margin: 30px;'>
        <h1>Fiber Churn Intelligence</h1>
        <p>This API predicts churn risk for telecom customers using a trained machine learning model.</p>
        <ul>
          <li><a href='/docs'>Swagger docs</a></li>
          <li><a href='/health'>Health check</a></li>
          <li><a href='/feature-importance'>Feature importance</a></li>
        </ul>
        <p>Try the <code>/predict</code> endpoint with JSON input to score a customer.</p>
      </body>
    </html>
    """


@app.get('/health')
def health():
    return {'status': 'ok', 'model_loaded': True, 'feature_count': len(cols)}


@app.post('/predict')
def predict(c: Customer, threshold: float | None = None, campaign: str = 'balanced'):
    try:
        df = pd.DataFrame([c.model_dump()])
        df['tenure_bucket'] = pd.cut(df['tenureMonths'], bins=[0, 6, 12, 24, 60], labels=['new', 'short', 'mid', 'long'], include_lowest=True)
        df = pd.get_dummies(df, columns=['plan', 'region', 'tenure_bucket'], dtype=int)
        df = df.reindex(columns=cols, fill_value=0)

        prob = float(model.predict_proba(df)[0][1])

        if threshold is None and threshold_tuning:
            threshold = threshold_tuning.get(campaign, threshold_tuning.get('balanced', {})).get('threshold', 0.5)
        if threshold is None:
            threshold = 0.5

        pred = int(prob >= threshold)
        risk = 'HIGH' if prob >= max(threshold, 0.70) else 'MEDIUM' if prob >= max(threshold * 0.8, 0.40) else 'LOW'

        return {
            'churn_prediction': pred,
            'churn_probability': round(prob, 4),
            'threshold_used': round(float(threshold), 2),
            'campaign': campaign,
            'risk': risk,
            'risk_reason': 'High churn likelihood based on the selected campaign threshold.' if risk == 'HIGH' else 'Moderate churn likelihood.' if risk == 'MEDIUM' else 'Low churn likelihood.'
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail='Prediction failed') from exc


@app.get('/threshold-tuning')
def threshold_tuning_endpoint():
    return threshold_tuning


@app.get('/feature-importance')
def feature_importance():
    return dict(zip(cols, model.feature_importances_.tolist()))


@app.post('/api/customer-feature-importance')
def customer_feature_importance(c: Customer):
    """Compute feature importance scores weighted by customer's specific values."""
    try:
        df = pd.DataFrame([c.model_dump()])
        df['tenure_bucket'] = pd.cut(df['tenureMonths'], bins=[0, 6, 12, 24, 60], labels=['new', 'short', 'mid', 'long'], include_lowest=True)
        df = pd.get_dummies(df, columns=['plan', 'region', 'tenure_bucket'], dtype=int)
        df = df.reindex(columns=cols, fill_value=0)
        
        # Get feature importances
        importances = model.feature_importances_
        
        # Weight importances by normalized feature values for this customer
        features_values = df.iloc[0].values
        normalized_values = (features_values - features_values.min()) / (features_values.max() - features_values.min() + 1e-6)
        
        # Combine: importance * feature_value gives customer-specific contribution
        weighted_importance = importances * normalized_values
        weighted_importance = weighted_importance / (weighted_importance.sum() + 1e-6)
        
        # Sort and get top features
        result = dict(zip(cols, weighted_importance.tolist()))
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail='Feature importance computation failed') from exc


@app.get('/api/customers')
def customers_list(offset: int = 0, limit: int = 50):
    """Return a paginated list of customers for the UI.

    Query params:
    - offset: zero-based index to start from
    - limit: number of items to return (max 500)
    """
    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500

    if _customers_df is None:
        raise HTTPException(status_code=404, detail='Customers dataset not found')

    total = len(_customers_df)
    start = max(0, int(offset))
    end = min(total, start + int(limit))

    rows = _customers_df.iloc[start:end].to_dict(orient='records')

    # Return array (client supports both array and {items:[]})
    return rows
