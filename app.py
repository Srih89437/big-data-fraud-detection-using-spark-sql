import streamlit as st
import pandas as pd
import plotly.express as px
from pathlib import Path
from src.spark_engine import get_spark, analyze_transactions, analyze_crimes, load_csv_spark
from src.demo_data import ensure_demo_data

st.set_page_config(page_title="Crime & Fraud Intelligence", page_icon="🛡️", layout="wide")
st.markdown("""
<style>
.block-container{padding-top:1.5rem;max-width:1450px}
[data-testid="stMetric"]{background:#111827;padding:16px;border:1px solid #263449;border-radius:12px}
div[data-testid="stDataFrame"]{border:1px solid #263449;border-radius:10px}
</style>
""", unsafe_allow_html=True)

ensure_demo_data()
st.title("🛡️ Crime & Fraud Intelligence")
st.caption("Big Data Fraud Detection for Crime and Law Enforcement using Apache Spark SQL")
st.info("Educational analytics prototype. A flagged record is an anomaly for human review, not proof of fraud or criminal conduct.")

with st.sidebar:
    st.header("Data sources")
    tx_file = st.file_uploader("Upload transactions CSV", type="csv", key="tx")
    crime_file = st.file_uploader("Upload crime records CSV", type="csv", key="crime")
    use_demo = st.toggle("Use built-in demo datasets", value=True)
    st.divider()
    st.caption("Expected transaction fields: transaction_id, account_id, amount, transaction_time, city, label (optional).")
    st.caption("Expected crime fields: case_id, crime_type, city, report_date, latitude (optional), longitude (optional).")

@st.cache_resource
def spark_session():
    return get_spark()

spark = spark_session()

def save_upload(upload, fallback):
    if upload is None:
        return fallback
    target = Path("data/uploads") / upload.name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(upload.getbuffer())
    return str(target)

tx_path = save_upload(tx_file, "data/demo/transactions.csv") if (tx_file or use_demo) else None
crime_path = save_upload(crime_file, "data/demo/crime_records.csv") if (crime_file or use_demo) else None

if not tx_path and not crime_path:
    st.warning("Upload at least one CSV or enable the demo datasets.")
    st.stop()

tabs = st.tabs(["Overview", "Financial Fraud", "Crime Analytics", "SQL & Data Quality"])

tx_result = None
crime_result = None
if tx_path:
    with st.spinner("Processing transactions with Apache Spark..."):
        tx_result = analyze_transactions(spark, tx_path)
if crime_path:
    with st.spinner("Processing crime records with Apache Spark..."):
        crime_result = analyze_crimes(spark, crime_path)

with tabs[0]:
    st.subheader("Operational overview")
    c1,c2,c3,c4 = st.columns(4)
    if tx_result:
        c1.metric("Transactions", f"{tx_result['total']:,}")
        c2.metric("Flagged transactions", f"{tx_result['flagged']:,}")
    else:
        c1.metric("Transactions","—"); c2.metric("Flagged transactions","—")
    if crime_result:
        c3.metric("Crime records", f"{crime_result['total']:,}")
        c4.metric("Crime categories", f"{crime_result['categories']:,}")
    else:
        c3.metric("Crime records","—"); c4.metric("Crime categories","—")
    if tx_result:
        st.markdown("#### Transaction review queue")
        st.dataframe(tx_result["flagged_df"].head(15), use_container_width=True)
    if crime_result:
        st.markdown("#### Crime reports by category")
        st.dataframe(crime_result["by_type"], use_container_width=True)

with tabs[1]:
    st.subheader("Financial transaction anomaly analysis")
    if not tx_result:
        st.warning("Upload a transactions CSV or enable demo data.")
    else:
        a,b,c = st.columns(3)
        a.metric("Total transactions", f"{tx_result['total']:,}")
        b.metric("Potential anomalies", f"{tx_result['flagged']:,}")
        c.metric("Flag rate", f"{tx_result['flag_rate']:.2f}%")
        st.caption("Rules: amount outlier using mean + 3 standard deviations, repeated account activity within a short time window, and duplicated transaction IDs. Thresholds are configurable in src/spark_engine.py.")
        st.dataframe(tx_result["flagged_df"], use_container_width=True)
        if not tx_result["by_city"].empty:
            fig = px.bar(tx_result["by_city"], x="city", y="transactions", title="Transactions by city")
            st.plotly_chart(fig, use_container_width=True)
        st.download_button("Download flagged transactions CSV",
            tx_result["flagged_df"].to_csv(index=False).encode("utf-8"),
            "flagged_transactions.csv", "text/csv")

with tabs[2]:
    st.subheader("Crime pattern analytics")
    if not crime_result:
        st.warning("Upload a crime records CSV or enable demo data.")
    else:
        x,y,z = st.columns(3)
        x.metric("Crime reports", f"{crime_result['total']:,}")
        y.metric("Crime categories", f"{crime_result['categories']:,}")
        z.metric("Cities / areas", f"{crime_result['cities']:,}")
        left,right = st.columns(2)
        with left:
            fig = px.bar(crime_result["by_type"], x="crime_type", y="reports", title="Reports by crime category")
            st.plotly_chart(fig, use_container_width=True)
        with right:
            fig = px.bar(crime_result["by_city"], x="city", y="reports", title="Reports by city / area")
            st.plotly_chart(fig, use_container_width=True)
        if not crime_result["by_month"].empty:
            fig = px.line(crime_result["by_month"], x="month", y="reports", markers=True, title="Reports over time")
            st.plotly_chart(fig, use_container_width=True)
        st.dataframe(crime_result["records"], use_container_width=True)
        st.download_button("Download crime analytics CSV",
            crime_result["records"].to_csv(index=False).encode("utf-8"),
            "crime_records_cleaned.csv", "text/csv")

with tabs[3]:
    st.subheader("Data quality and processing")
    if tx_result:
        st.markdown("**Transaction data schema**")
        st.code(tx_result["schema"], language="text")
        st.write({"duplicate_transaction_ids": tx_result["duplicate_ids"],
                  "missing_amount_rows": tx_result["missing_amounts"]})
    if crime_result:
        st.markdown("**Crime data schema**")
        st.code(crime_result["schema"], language="text")
        st.write({"missing_case_ids": crime_result["missing_case_ids"],
                  "missing_city_rows": crime_result["missing_city"]})
    st.success("Spark SQL executed locally through PySpark. See the source files for the SQL queries.")

st.divider()
st.caption("Prototype only • Use lawfully obtained, de-identified data • Human review required for all flagged records")
