
from pyspark.sql import SparkSession

spark = (
    SparkSession.builder
    .master("local[*]")
    .appName("IndiaCyberCrimeAnalysis")
    .getOrCreate()
)

df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv("data/india_cyber_crimes.csv")
)

df.createOrReplaceTempView("cyber_crimes")

print("TOTAL RECORDS:", df.count())

print("\nINDIA CYBERCRIME - 2024")

result = spark.sql("""
    SELECT
        year,
        `Crime Head`,
        value
    FROM cyber_crimes
    WHERE year = 2024
      AND indicator = 'Number of Cases'
      AND `Crime Head` IS NOT NULL
    ORDER BY value DESC
    LIMIT 10
""")

result.show(10, truncate=False)

spark.stop()

print("SPARK SQL TEST SUCCESSFUL")
