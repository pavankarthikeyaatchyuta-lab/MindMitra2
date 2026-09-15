import argparse
import os
import numpy as np
import pandas as pd

def generate_synthetic_data(num_samples=5000, output_path="data/synthetic_gameplay.csv"):
    np.random.seed(42)

    # Generate features with some realistic distributions
    accuracy = np.random.beta(a=5, b=2, size=num_samples) # Skewed towards higher accuracy
    mean_response_time_ms = np.random.uniform(500, 10000, size=num_samples)
    response_time_variance = np.random.uniform(0.0, 1.0, size=num_samples)
    repeat_error_rate = np.random.beta(a=2, b=5, size=num_samples) # Skewed towards lower error rate
    correction_rate = np.random.uniform(0.0, 1.0, size=num_samples)
    completion_time_ms = np.random.uniform(10000, 180000, size=num_samples)
    current_difficulty = np.random.randint(1, 6, size=num_samples)
    previous_session_accuracy = np.random.beta(a=5, b=2, size=num_samples)
    recent_trend = np.random.uniform(-1.0, 1.0, size=num_samples)

    labels = np.zeros(num_samples, dtype=int)
    
    for i in range(num_samples):
        # Determine labels based on realistic rules
        # Add some random noise
        noise = np.random.uniform(-0.1, 0.1)
        
        acc = accuracy[i] + noise
        latency = mean_response_time_ms[i]
        errors = repeat_error_rate[i] + noise
        
        if acc > 0.8 and latency < 3000 and errors < 0.2:
            labels[i] = 2 # INCREASE
        elif acc < 0.5 or latency > 7000 or errors > 0.5:
            labels[i] = 0 # DECREASE
        else:
            labels[i] = 1 # MAINTAIN
            
        # Add some edge cases or pure noise for realism (5% of data)
        if np.random.rand() < 0.05:
            labels[i] = np.random.randint(0, 3)

    data = {
        'accuracy': accuracy,
        'mean_response_time_ms': mean_response_time_ms,
        'response_time_variance': response_time_variance,
        'repeat_error_rate': repeat_error_rate,
        'correction_rate': correction_rate,
        'completion_time_ms': completion_time_ms,
        'current_difficulty': current_difficulty,
        'previous_session_accuracy': previous_session_accuracy,
        'recent_trend': recent_trend,
        'label': labels
    }
    
    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} samples and saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic gameplay data")
    parser.add_argument("--samples", type=int, default=5000, help="Number of samples to generate")
    args = parser.parse_args()
    
    output_file = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_gameplay.csv')
    generate_synthetic_data(num_samples=args.samples, output_path=output_file)
