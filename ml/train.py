import os
import json
import joblib
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from feature_engineering import FeatureEngineer

def train_model():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_gameplay.csv')
    if not os.path.exists(data_path):
        print(f"Data not found at {data_path}. Please generate synthetic data first.")
        return

    print("Loading data...")
    df = pd.read_csv(data_path)
    
    # Feature Engineering
    print("Engineering features...")
    engineer = FeatureEngineer()
    X = engineer.fit_transform(df)
    y = df['label']
    
    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Model
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    # Evaluate
    print("\n--- Prototype model evaluation on synthetic gameplay data ---")
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['DECREASE', 'MAINTAIN', 'INCREASE']))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Feature Importances
    importances = model.feature_importances_
    feat_imp = sorted(zip(engineer.features, importances), key=lambda x: x[1], reverse=True)
    print("\nFeature Importances:")
    for feat, imp in feat_imp:
        print(f"  {feat}: {imp:.4f}")
        
    # Save Model and Metadata
    model_dir = os.path.dirname(__file__)
    model_path = os.path.join(model_dir, 'model.pkl')
    metadata_path = os.path.join(model_dir, 'model_metadata.json')
    
    pipeline = {
        'model': model,
        'engineer': engineer
    }
    joblib.dump(pipeline, model_path)
    print(f"\nSaved model to {model_path}")
    
    metadata = {
        'timestamp': datetime.now().isoformat(),
        'features': engineer.features,
        'accuracy': acc,
        'description': 'Prototype model evaluation on synthetic gameplay data'
    }
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)
    print(f"Saved metadata to {metadata_path}")

if __name__ == "__main__":
    train_model()
