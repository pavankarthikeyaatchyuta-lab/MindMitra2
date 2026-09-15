import sys
import os
sys.path.append(os.path.dirname(__file__))

import joblib
import json
import numpy as np

def export():
    model_pkl = os.path.join(os.path.dirname(__file__), 'model.pkl')
    p = joblib.load(model_pkl)
    model = p['model']
    scaler = p['engineer'].scaler
    features = p['engineer'].features

    trees_data = []
    for est in model.estimators_[:35]:
        t = est.tree_
        vals = t.value[:, 0, :]
        sums = vals.sum(axis=1, keepdims=True)
        sums[sums == 0] = 1.0
        probs = (vals / sums).tolist()
        
        tree_dict = {
            'children_left': t.children_left.tolist(),
            'children_right': t.children_right.tolist(),
            'feature': t.feature.tolist(),
            'threshold': [round(float(th), 5) for th in t.threshold],
            'value': [[round(v, 4) for v in row] for row in probs]
        }
        trees_data.append(tree_dict)

    export_obj = {
        'features': features,
        'classes': [0, 1, 2],
        'class_labels': ['DECREASE', 'MAINTAIN', 'INCREASE'],
        'scaler': {
            'mean': [round(float(m), 5) for m in scaler.mean_],
            'scale': [round(float(s), 5) for s in scaler.scale_]
        },
        'n_estimators': len(trees_data),
        'trees': trees_data
    }

    # Verify with sample
    sample = {
        'accuracy': 0.92,
        'mean_response_time_ms': 1800.0,
        'response_time_variance': 0.12,
        'repeat_error_rate': 0.02,
        'correction_rate': 0.05,
        'completion_time_ms': 25000.0,
        'current_difficulty': 3,
        'previous_session_accuracy': 0.90,
        'recent_trend': 0.2
    }

    x_raw = np.array([[sample[f] for f in features]])
    x_scaled = (x_raw - scaler.mean_) / scaler.scale_
    sk_pred = model.predict(x_scaled)[0]
    sk_prob = model.predict_proba(x_scaled)[0]

    tree_probs = []
    for t in trees_data:
        node = 0
        while t['children_left'][node] != -1:
            feat_idx = t['feature'][node]
            th = t['threshold'][node]
            if x_scaled[0, feat_idx] <= th:
                node = t['children_left'][node]
            else:
                node = t['children_right'][node]
        tree_probs.append(t['value'][node])

    sim_prob = np.mean(tree_probs, axis=0)
    sim_pred = int(np.argmax(sim_prob))

    print(f"Sklearn pred: {sk_pred}, probs: {sk_prob}")
    print(f"Simulated pred: {sim_pred} ({export_obj['class_labels'][sim_pred]}), probs: {sim_prob}")

    # Also test degraded performance sample
    degraded_sample = {
        'accuracy': 0.45,
        'mean_response_time_ms': 6200.0,
        'response_time_variance': 0.45,
        'repeat_error_rate': 0.35,
        'correction_rate': 0.40,
        'completion_time_ms': 75000.0,
        'current_difficulty': 4,
        'previous_session_accuracy': 0.85,
        'recent_trend': -0.4
    }
    x_deg_raw = np.array([[degraded_sample[f] for f in features]])
    x_deg_scaled = (x_deg_raw - scaler.mean_) / scaler.scale_
    deg_sk_pred = model.predict(x_deg_scaled)[0]
    deg_sk_prob = model.predict_proba(x_deg_scaled)[0]
    print(f"Degraded Sklearn pred: {deg_sk_pred} ({export_obj['class_labels'][deg_sk_pred]}), probs: {deg_sk_prob}")

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'services', 'onDeviceModel.json'))
    with open(out_path, 'w') as f:
        json.dump(export_obj, f)
    
    file_size_kb = os.path.getsize(out_path) / 1024
    print(f"Exported on-device model to {out_path} ({file_size_kb:.1f} KB)")

if __name__ == '__main__':
    export()
