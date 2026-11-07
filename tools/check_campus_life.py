#!/usr/bin/env python3
"""Check data/campus_life.json against the campus graph.

Every club and office points at a node key in CAMPUS_GRAPH. If a key is
wrong the entry still renders but routing to it silently fails, which is
the worst kind of broken: it looks fine. Run this after editing.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
life = json.load(open(os.path.join(HERE, 'data', 'campus_life.json')))
campus = json.load(open(os.path.join(HERE, 'data', 'campus.json')))

nodes = campus['CAMPUS_GRAPH']['nodes']
DAYS = {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'}
TIME = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')

errors, warnings = [], []


def check_time(label, value):
    if not TIME.match(value or ''):
        errors.append(f'{label}: "{value}" is not HH:MM (24h)')


def check_place(label, key):
    if key not in nodes:
        errors.append(f'{label}: node "{key}" is not in CAMPUS_GRAPH — routing will fail')
        return
    t = nodes[key].get('type')
    if t not in ('building', 'classroom', 'landmark'):
        warnings.append(f'{label}: node "{key}" is type "{t}", not a destination')


for c in life['clubs']:
    tag = f'club {c["id"]}'
    check_place(tag, c['at'])
    if c['day'] not in DAYS:
        errors.append(f'{tag}: "{c["day"]}" is not a weekday')
    check_time(tag + ' start', c['start'])
    check_time(tag + ' end', c['end'])
    if TIME.match(c.get('start', '')) and TIME.match(c.get('end', '')):
        if c['end'] <= c['start']:
            errors.append(f'{tag}: ends at or before it starts')

for f in life['faculty']:
    tag = f'faculty {f["id"]}'
    check_place(tag, f['at'])
    if not f.get('hours'):
        warnings.append(f'{tag}: no office hours listed')
    for h in f.get('hours', []):
        if h['day'] not in DAYS:
            errors.append(f'{tag}: "{h["day"]}" is not a weekday')
        check_time(tag + ' start', h['start'])
        check_time(tag + ' end', h['end'])

ids = [c['id'] for c in life['clubs']] + [f['id'] for f in life['faculty']]
dupes = {i for i in ids if ids.count(i) > 1}
if dupes:
    errors.append(f'duplicate ids: {sorted(dupes)}')

if '_SAMPLE_DATA' not in life:
    warnings.append('the _SAMPLE_DATA notice is gone — is this real data now?')

print(f'{len(life["clubs"])} clubs, {len(life["faculty"])} faculty')
for w in warnings:
    print('  WARN  ' + w)
for e in errors:
    print('  FAIL  ' + e)

print('OK' if not errors else f'{len(errors)} problem(s)')
sys.exit(1 if errors else 0)
