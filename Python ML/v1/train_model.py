
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split


df = pd.read_csv('fiber_customers_realistic.csv')

# Feature engineering for more realistic telecom churn detection.
df['service_stress'] = df['outages'] + df['complaints'] + df['supportCalls']
df['billing_risk'] = df['latePayments'] * df['monthlyPrice'] / 100.0
df['price_per_mbps'] = df['monthlyPrice'] / df['speedMbps'].replace(0, 1)
df['usage_drop'] = (df['avgMonthlyUsageGb'] < 80).astype(int)
df['tenure_bucket'] = pd.cut(df['tenureMonths'], bins=[0, 6, 12, 24, 60], labels=['new', 'short', 'mid', 'long'], include_lowest=True)

# One-hot encode categorical fields.
df = pd.get_dummies(df, columns=['plan', 'region', 'tenure_bucket'], dtype=int)

X = df.drop(['churn', 'customerId', 'customerName', 'createdMonth', 'churnProbability'], axis=1, errors='ignore')
y = df['churn']

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

search_spaces = {
    'random_forest': {
        'model': RandomForestClassifier(random_state=42, n_jobs=-1),
        'params': {
            'n_estimators': [150, 250, 350],
            'max_depth': [None, 8, 12],
            'min_samples_leaf': [1, 2, 4],
            'class_weight': ['balanced', 'balanced_subsample'],
        },
    },
    'extra_trees': {
        'model': ExtraTreesClassifier(random_state=42, n_jobs=-1),
        'params': {
            'n_estimators': [200, 300],
            'max_depth': [None, 8, 12],
            'min_samples_leaf': [1, 2],
            'class_weight': ['balanced'],
        },
    },
}

best_model_name = None
best_model = None
best_score = -1.0
best_metrics = None

for name, cfg in search_spaces.items():
    search = RandomizedSearchCV(
        estimator=cfg['model'],
        param_distributions=cfg['params'],
        scoring='f1',
        n_iter=2,
        cv=cv,
        random_state=42,
        n_jobs=-1,
    )
    search.fit(X_train, y_train)

    best_est = search.best_estimator_
    pred = best_est.predict(X_test)
    f1 = f1_score(y_test, pred)
    roc_auc = roc_auc_score(y_test, best_est.predict_proba(X_test)[:, 1])
    combined_score = 0.7 * f1 + 0.3 * roc_auc

    print(f'[{name}] best_params={search.best_params_}')
    print(f'[{name}] F1={f1:.4f} ROC_AUC={roc_auc:.4f} combined_score={combined_score:.4f}')
    print(classification_report(y_test, pred, target_names=['No Churn', 'Churn']))

    if combined_score > best_score:
        best_score = combined_score
        best_model_name = name
        best_model = best_est
        best_metrics = {
            'f1': f1,
            'roc_auc': roc_auc,
            'combined_score': combined_score,
            'best_params': search.best_params_,
        }

print(f'BEST_MODEL={best_model_name} combined_score={best_score:.4f}')

# Threshold tuning for retention campaigns and other business use cases.
probs = best_model.predict_proba(X_test)[:, 1]
threshold_candidates = np.linspace(0.1, 0.9, 17)
threshold_results = []

for threshold in threshold_candidates:
    pred = (probs >= threshold).astype(int)
    threshold_results.append({
        'threshold': round(float(threshold), 2),
        'precision': round(float(precision_score(y_test, pred, zero_division=0)), 4),
        'recall': round(float(recall_score(y_test, pred, zero_division=0)), 4),
        'f1': round(float(f1_score(y_test, pred, zero_division=0)), 4),
    })

retention = max(
    [item for item in threshold_results if item['precision'] >= 0.45],
    key=lambda item: (item['recall'], item['f1']),
    default={'threshold': 0.5, 'precision': 0.0, 'recall': 0.0, 'f1': 0.0},
)
balanced = max(threshold_results, key=lambda item: item['f1'])
conservative = max(threshold_results, key=lambda item: (item['precision'], item['f1']))

threshold_tuning = {
    'retention_campaign': retention,
    'balanced': balanced,
    'conservative': conservative,
    'all_thresholds': threshold_results,
}

print('Threshold tuning summary:')
for name, item in threshold_tuning.items():
    if name == 'all_thresholds':
        continue
    print(f'  {name}: threshold={item["threshold"]:.2f} precision={item["precision"]:.4f} recall={item["recall"]:.4f} f1={item["f1"]:.4f}')

joblib.dump(best_model, 'churn_model.pkl')
joblib.dump(X.columns.tolist(), 'model_columns.pkl')

with open('training_summary.json', 'w', encoding='utf-8') as f:
    json.dump({
        'best_model': best_model_name,
        'combined_score': round(best_score, 4),
        'feature_count': int(X.shape[1]),
        'metrics': best_metrics,
        'dataset': 'fiber_customers_realistic.csv',
    }, f, indent=2)

with open('threshold_tuning.json', 'w', encoding='utf-8') as f:
    json.dump(threshold_tuning, f, indent=2)

print('model trained and evaluated on realistic dataset')
