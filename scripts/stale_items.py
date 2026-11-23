#!/usr/bin/env python3
"""Find rows in DynamoDB that are no longer in data/items.json and write delete batches for them.

Usage: python3 scripts/stale_items.py <table-name> <scan-output.json> <keys.json> <out-dir>
Prints one batch file path per 25 deletes (prints nothing when the table already matches).
"""
import json
import os
import sys

table, scan_path, keys_path, out_dir = sys.argv[1:5]
with open(scan_path) as f:
    existing = {(i["storeId"]["S"], i["sk"]["S"]) for i in json.load(f).get("Items", [])}
with open(keys_path) as f:
    wanted = {(k["storeId"], k["sk"]) for k in json.load(f)}

stale = sorted(existing - wanted)
os.makedirs(out_dir, exist_ok=True)
for i in range(0, len(stale), 25):
    batch = {table: [{"DeleteRequest": {"Key": {"storeId": {"S": s}, "sk": {"S": k}}}} for s, k in stale[i:i + 25]]}
    path = os.path.join(out_dir, f"delete-{i // 25 + 1}.json")
    with open(path, "w") as f:
        json.dump(batch, f)
    print(path)
