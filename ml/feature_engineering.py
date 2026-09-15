import pandas as pd
from sklearn.preprocessing import StandardScaler

class FeatureEngineer:
    def __init__(self):
        self.scaler = StandardScaler()
        self.features = [
            'accuracy', 
            'mean_response_time_ms', 
            'response_time_variance',
            'repeat_error_rate', 
            'correction_rate', 
            'completion_time_ms',
            'current_difficulty', 
            'previous_session_accuracy', 
            'recent_trend'
        ]

    def fit_transform(self, df):
        X = df[self.features]
        X_scaled = self.scaler.fit_transform(X)
        return pd.DataFrame(X_scaled, columns=self.features)

    def transform(self, df):
        if isinstance(df, dict):
            df = pd.DataFrame([df])
        X = df[self.features]
        X_scaled = self.scaler.transform(X)
        return pd.DataFrame(X_scaled, columns=self.features)
