#!/usr/bin/env python3
"""Turn data/items.json into DynamoDB batch-write files (25 rows per file).

Usage: python3 scripts/build_items.py <table-name> <site-base-url> <out-dir>

Row layout (single-table design, one partition per store):
  storeId = "provo"      sk = "PROFILE"       -> the store's profile (name, hours, currency...)
  storeId = "provo"      sk = "ITEM#glazed"   -> one donut sold at that store
"""
import json
import os
import sys


def to_ddb(value):
    if isinstance(value, bool):
        return {"BOOL": value}
    if isinstance(value, (int, float)):
        return {"N": str(value)}
    if isinstance(value, list):
        return {"L": [to_ddb(v) for v in value]}
    return {"S": str(value)}


def main():
    table, base, out_dir = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
    with open(os.path.join(os.path.dirname(__file__), "..", "data", "items.json")) as f:
        data = json.load(f)

    rows = []
    for store in data["stores"]:
        row = {k: v for k, v in store.items() if k != "bannerImage"}
        row.update(sk="PROFILE", bannerUrl=f"{base}/images/{store['bannerImage']}")
        rows.append(row)
    for item in data["items"]:
        row = {k: v for k, v in item.items() if k != "image"}
        row.update(sk=f"ITEM#{item['itemId']}", imageUrl=f"{base}/images/{item['image']}")
        rows.append(row)

    os.makedirs(out_dir, exist_ok=True)
    keys = [{"storeId": r["storeId"], "sk": r["sk"]} for r in rows]
    with open(os.path.join(out_dir, "keys.json"), "w") as f:
        json.dump(keys, f)
    for i in range(0, len(rows), 25):
        batch = {table: [{"PutRequest": {"Item": {k: to_ddb(v) for k, v in r.items()}}} for r in rows[i:i + 25]]}
        path = os.path.join(out_dir, f"batch-{i // 25 + 1}.json")
        with open(path, "w") as f:
            json.dump(batch, f)
        print(path)


if __name__ == "__main__":
    main()
