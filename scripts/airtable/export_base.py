#!/usr/bin/env python3
"""
Export Airtable base schema and data to JSON + CSV backups.

Usage:
  AIRTABLE_BASE_ID=appXXXX AIRTABLE_PAT=patXXXX \
    python3 scripts/airtable/export_base.py --output backups/airtable
"""
import argparse
import csv
import json
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

AIRTABLE_API_BASE = "https://api.airtable.com/v0"
AIRTABLE_META_BASE = "https://api.airtable.com/v0/meta"


def api_get(url, pat):
  req = Request(
    url,
    headers={
      "Authorization": f"Bearer {pat}",
      "Content-Type": "application/json",
    },
  )
  with urlopen(req) as resp:
    return json.loads(resp.read().decode("utf-8"))


def fetch_tables(base_id, pat):
  url = f"{AIRTABLE_META_BASE}/bases/{base_id}/tables"
  data = api_get(url, pat)
  return data.get("tables", [])


def fetch_records(base_id, pat, table_name):
  records = []
  offset = None
  while True:
    params = f"?pageSize=100"
    if offset:
      params += f"&offset={offset}"
    url = f"{AIRTABLE_API_BASE}/{base_id}/{quote(table_name, safe='')}{params}"
    data = api_get(url, pat)
    records.extend(data.get("records", []))
    offset = data.get("offset")
    if not offset:
      break
  return records


def serialize_value(value):
  if value is None:
    return ""
  if isinstance(value, (dict, list)):
    return json.dumps(value)
  return str(value)


def write_csv(path, records):
  field_names = set()
  for record in records:
    field_names.update(record.get("fields", {}).keys())

  header = ["id", "createdTime"] + sorted(field_names)
  with path.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=header)
    writer.writeheader()
    for record in records:
      row = {
        "id": record.get("id", ""),
        "createdTime": record.get("createdTime", "")
      }
      for key, value in record.get("fields", {}).items():
        row[key] = serialize_value(value)
      writer.writerow(row)


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--output", default="backups/airtable", help="Output directory root")
  args = parser.parse_args()

  base_id = os.environ.get("AIRTABLE_BASE_ID", "").strip()
  pat = os.environ.get("AIRTABLE_PAT", "").strip()

  if not base_id or not pat:
    raise SystemExit("Missing AIRTABLE_BASE_ID or AIRTABLE_PAT in environment.")

  timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
  output_root = Path(args.output) / timestamp
  tables_dir = output_root / "tables"
  tables_dir.mkdir(parents=True, exist_ok=True)

  tables = fetch_tables(base_id, pat)
  (output_root / "schema.json").write_text(json.dumps({"tables": tables}, indent=2))

  for table in tables:
    name = table.get("name")
    if not name:
      continue
    records = fetch_records(base_id, pat, name)
    json_path = tables_dir / f"{name}.json"
    csv_path = tables_dir / f"{name}.csv"
    json_path.write_text(json.dumps(records, indent=2))
    write_csv(csv_path, records)

  print(f"Backup complete: {output_root}")


if __name__ == "__main__":
  main()
