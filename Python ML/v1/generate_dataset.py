
import random

import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

plans = [('Basic', 699), ('Plus', 999), ('Premium', 1499), ('Ultra', 2499)]
regions = ['North', 'South', 'East', 'West']
first_names = ['Avery', 'Jordan', 'Taylor', 'Morgan', 'Reese', 'Alex', 'Casey', 'Riley', 'Quinn', 'Jamie']
last_names = ['Patel', 'Garcia', 'Smith', 'Nguyen', 'Brown', 'Lee', 'Johnson', 'Khan', 'Martinez', 'Davis']

rows = []
months = [f'2024-{month:02d}' for month in range(1, 13)]

for idx in range(8000):
    plan, price = random.choice(plans)
    speed = {'Basic': 100, 'Plus': 200, 'Premium': 500, 'Ultra': 1000}[plan]
    tenure = random.randint(1, 60)
    outages = random.randint(0, 8)
    complaints = random.randint(0, 7)
    support_calls = random.randint(0, 8)
    late_payments = random.randint(0, 5)
    competitor = random.randint(0, 1)
    monthly_contract = random.randint(0, 1)
    recent_plan_change = random.random() < 0.18
    contract_renewal_due = random.random() < 0.25
    avg_usage = max(20, int(np.random.normal(180, 70)))
    region = random.choice(regions)
    created_month = random.choice(months)

    # Realistic churn drivers used in telecom retention models.
    churn_score = 0.0
    churn_score += 0.12 * min(outages, 6)
    churn_score += 0.10 * min(complaints, 6)
    churn_score += 0.08 * min(support_calls, 6)
    churn_score += 0.14 * min(late_payments, 5)
    churn_score += 0.15 * competitor
    churn_score += 0.10 * (1 if tenure < 6 else 0)
    churn_score += 0.08 * (1 if price > 1200 else 0)
    churn_score += 0.12 * recent_plan_change
    churn_score += 0.10 * contract_renewal_due
    churn_score += 0.10 * (1 if avg_usage < 80 else 0)
    churn_score += 0.03 * (1 if monthly_contract == 1 and tenure < 12 else 0)

    churn_score += np.random.normal(0, 0.15)
    if random.random() < 0.28:
        churn_score -= 1.4

    churn_probability = 1 / (1 + np.exp(-churn_score))
    churn = 0 if churn_probability < 0.50 else (1 if random.random() < churn_probability else 0)

    customer_name = f"{random.choice(first_names)} {random.choice(last_names)}"
    rows.append([
        idx + 1,
        customer_name,
        plan,
        price,
        tenure,
        outages,
        complaints,
        support_calls,
        late_payments,
        competitor,
        monthly_contract,
        speed,
        avg_usage,
        recent_plan_change,
        contract_renewal_due,
        region,
        created_month,
        round(float(churn_probability), 4),
        churn,
    ])

pd.DataFrame(
    rows,
    columns=[
        'customerId',
        'customerName',
        'plan',
        'monthlyPrice',
        'tenureMonths',
        'outages',
        'complaints',
        'supportCalls',
        'latePayments',
        'competitorAvailable',
        'monthlyContract',
        'speedMbps',
        'avgMonthlyUsageGb',
        'recentPlanChange',
        'contractRenewalDue',
        'region',
        'createdMonth',
        'churnProbability',
        'churn',
    ],
).to_csv('fiber_customers_realistic.csv', index=False)

print('realistic dataset generated: fiber_customers_realistic.csv')
