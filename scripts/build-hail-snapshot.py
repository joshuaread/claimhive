#!/usr/bin/env python3
# Run: python3 scripts/build-hail-snapshot.py  (from the repo root; writes data/hail-reports.json)
"""Build data/hail-reports.json from NOAA SPC preliminary hail reports.

Downloads the past 7 UTC days of SPC hail CSVs (today, yesterday, and the
previous 5 days' YYMMDD files), parses Time/Size/Location/County/State/Lat/Lon
(dropping the Comments column, which can contain personal names), and writes a
compact JSON snapshot. Python 3 standard library only. Files that fail to
download or parse are skipped.
"""

import csv
import datetime
import io
import json
import os
import urllib.request

SPC_BASE = 'https://www.spc.noaa.gov/climo/reports/'
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'hail-reports.json')


def fetch(url):
    """Return the text of url, or None on any failure."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'claimhive-hail-snapshot/1.0'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                return None
            return resp.read().decode('utf-8', 'replace')
    except Exception:
        return None


def parse_csv(text):
    """Parse SPC hail CSV text into a list of report dicts.

    Columns: Time,Size,Location,County,State,Lat,Lon,Comments
    The Comments column is deliberately dropped.
    """
    reports = []
    if not text:
        return reports
    reader = csv.reader(io.StringIO(text))
    for row in reader:
        if len(row) < 7:
            continue
        if row[0].strip().lower() == 'time':  # header row
            continue
        try:
            lat = round(float(row[5]), 2)
            lon = round(float(row[6]), 2)
        except ValueError:
            continue
        try:
            size_in = int(row[1]) / 100.0
        except ValueError:
            size_in = None
        reports.append({
            't': row[0].strip(),
            'size_in': size_in,
            'loc': row[2].strip(),
            'county': row[3].strip(),
            'st': row[4].strip(),
            'lat': lat,
            'lon': lon,
        })
    return reports


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    today = now.date()

    # Build the 7-day file list: today, yesterday, then the previous 5 days.
    specs = [
        (SPC_BASE + 'today_hail.csv', today),
        (SPC_BASE + 'yesterday_hail.csv', today - datetime.timedelta(days=1)),
    ]
    for n in range(2, 7):
        d = today - datetime.timedelta(days=n)
        specs.append((SPC_BASE + d.strftime('%y%m%d') + '_rpts_hail.csv', d))

    days = []
    for url, d in specs:
        text = fetch(url)
        if text is None:
            continue  # skip files that fail
        days.append({
            'date': d.strftime('%Y-%m-%d'),
            'reports': parse_csv(text),
        })

    snapshot = {
        'generated_utc': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'source': SPC_BASE,
        'days': days,
    }

    out_path = os.path.abspath(OUT_PATH)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, separators=(',', ':'), ensure_ascii=False)

    total = sum(len(day['reports']) for day in days)
    print('Wrote %s (%d days, %d reports)' % (out_path, len(days), total))


if __name__ == '__main__':
    main()
