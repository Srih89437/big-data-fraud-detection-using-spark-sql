from pathlib import Path
import pandas as pd
import random
from datetime import datetime, timedelta

def ensure_demo_data():
    base = Path("data/demo")
    base.mkdir(parents=True, exist_ok=True)
    tx_path = base / "transactions.csv"
    crime_path = base / "crime_records.csv"
    random.seed(17)
    if not tx_path.exists():
        cities = ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"]
        rows = []
        start = datetime(2026, 1, 1, 8, 0)
        for i in range(1, 1001):
            amount = round(random.uniform(100, 12000), 2)
            if i % 83 == 0:
                amount = round(random.uniform(70000, 150000), 2)
            rows.append({
                "transaction_id": f"TX{i:05d}", "account_id": f"AC{random.randint(1,150):04d}",
                "amount": amount, "transaction_time": (start + timedelta(minutes=i*7)).isoformat(sep=" "),
                "city": random.choice(cities)
            })
        # Include one duplicate ID for demonstrating SQL duplicate detection.
        rows.append({**rows[30], "amount": 99000.0})
        pd.DataFrame(rows).to_csv(tx_path, index=False)
    if not crime_path.exists():
        types = ["Theft", "Cybercrime", "Fraud", "Assault", "Burglary", "Vehicle Theft"]
        cities = ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"]
        rows = []
        start = datetime(2025, 1, 1)
        for i in range(1, 601):
            d = start + timedelta(days=random.randint(0, 330))
            rows.append({
                "case_id": f"CR{i:05d}", "crime_type": random.choice(types),
                "city": random.choice(cities), "report_date": d.strftime("%Y-%m-%d"),
                "latitude": round(12.0 + random.random(), 5),
                "longitude": round(76.0 + random.random(), 5)
            })
        pd.DataFrame(rows).to_csv(crime_path, index=False)
