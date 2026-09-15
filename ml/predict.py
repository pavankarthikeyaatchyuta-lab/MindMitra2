import os
import joblib
import numpy as np

def _fallback_predict(features_dict):
    acc = features_dict.get('accuracy', 0.5)
    mean_rt = features_dict.get('mean_response_time_ms', 5000)
    repeat_err = features_dict.get('repeat_error_rate', 0.5)
    
    if acc < 0.5 or mean_rt > 6000:
        return 'DECREASE'
    elif acc > 0.85 and mean_rt < 2500 and repeat_err < 0.1:
        return 'INCREASE'
    else:
        return 'MAINTAIN'

def predict_difficulty(features_dict):
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    
    try:
        pipeline = joblib.load(model_path)
        model = pipeline['model']
        engineer = pipeline['engineer']
        
        # Preprocess features
        X = engineer.transform(features_dict)
        
        # Predict
        pred_label = model.predict(X)[0]
        probas = model.predict_proba(X)[0]
        confidence = probas[pred_label]
        
        # Map label back to string
        label_map = {0: 'DECREASE', 1: 'MAINTAIN', 2: 'INCREASE'}
        recommendation = label_map[pred_label]
        
        # Get feature importances for this specific prediction (local interpretation approximation, here just global)
        feat_imp_dict = dict(zip(engineer.features, model.feature_importances_))
        
        return {
            'recommendation': recommendation,
            'confidence': float(confidence),
            'feature_importance': feat_imp_dict,
            'model_used': 'ml'
        }
    except Exception as e:
        # Fallback mechanism
        recommendation = _fallback_predict(features_dict)
        return {
            'recommendation': recommendation,
            'confidence': 1.0,  # Deterministic rule
            'feature_importance': {},
            'model_used': 'fallback'
        }
