
Enterprise Telecom Fiber Churn Intelligence POC

Features:
- Synthetic customer generator (10000 customers)
- Fiber plan catalog
- Complaint history
- Outage history
- Billing behavior
- Contract type
- Competitor availability
- Churn prediction API
- Feature importance endpoint

Run:
pip install -r requirements.txt
python generate_dataset.py
python train_model.py
uvicorn app.main:app --reload
