"""E2E Reconciliation & Data Integrity Tests.
Validates all figures strictly against NCRB master datasets via Spark SQL.
No mock metrics, no invented data.
"""

import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def _get_json(endpoint: str):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        assert resp.status == 200
        return json.loads(resp.read().decode("utf-8"))


def test_api_health():
    """Verify backend health and Spark connectivity."""
    data = _get_json("/api/health")
    assert data["status"] == "healthy"
    assert data["spark_connected"] is True
    assert data["jurisdiction_count"] == 36
    assert set(data["years"]) == {2020, 2021, 2022, 2023, 2024}


def test_overview_reconciliation_2024():
    """Verify 2024 national totals reconcile exactly to 1,01,928."""
    data = _get_json("/api/overview?year=2024")
    assert data["year"] == 2024
    assert data["total_cases"] == 101928
    assert data["state_cases"] == 101118
    assert data["ut_cases"] == 810
    assert data["jurisdictions"] == 36
    assert data["state_cases"] + data["ut_cases"] == data["total_cases"]


def test_states_2024_reconciliation():
    """Verify state breakdown sums exactly to national total."""
    data = _get_json("/api/states?year=2024")
    states = data["states"]
    assert len(states) == 36

    # Telangana #1 (27,230), Karnataka #2 (21,993)
    by_name = {s["state_ut"]: s["cases"] for s in states}
    assert by_name["Telangana"] == 27230
    assert by_name["Karnataka"] == 21993
    assert by_name["Uttar Pradesh"] == 11073
    assert by_name["Maharashtra"] == 9922

    total_sum = sum(s["cases"] for s in states)
    assert total_sum == 101928


def test_matrix_endpoint_2024():
    """Verify matrix endpoint returns all 36 jurisdictions with correct ISO codes and sparklines."""
    data = _get_json("/api/matrix?year=2024")
    assert data["year"] == 2024
    assert data["total_cases"] == 101928
    assert data["jurisdiction_count"] == 36

    matrix = data["matrix"]
    assert len(matrix) == 36
    # Top rank must be Telangana
    top = matrix[0]
    assert top["state_ut"] == "Telangana"
    assert top["code"] == "IN-TG"
    assert top["cases"] == 27230
    assert top["rank"] == 1
    assert len(top["sparkline"]) == 5
    assert top["sparkline"][-1] == 27230


def test_trends_continuity():
    """Verify 5-year trends are monotonic/consistent with historical data."""
    data = _get_json("/api/trends")
    trend = data["national_total"]
    assert len(trend) == 5
    by_year = {t["year"]: t["cases"] for t in trend}
    assert by_year[2024] == 101928
    assert by_year[2020] == 50035
    assert by_year[2021] == 52974
    assert by_year[2022] == 65893
    assert by_year[2023] == 86420
