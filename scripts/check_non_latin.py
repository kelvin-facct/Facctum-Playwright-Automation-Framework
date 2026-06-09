#!/usr/bin/env python3
"""Check for non-Latin characters in name/alias/spelling columns of a CSV file."""
import csv
import re
import sys
import unicodedata

FILE = "wc-eu-delta_a_delta_records_20260506094828.csv"

# Non-Latin detection: check if character is NOT in any Latin Unicode block
# Latin blocks: Basic Latin (0000-007F), Latin-1 Supplement (0080-00FF),
# Latin Extended-A (0100-017F), Latin Extended-B (0180-024F),
# Latin Extended Additional (1E00-1EFF), Latin Extended-C/D/E (2C60-2C7F, A720-A7FF, AB30-AB6F)
# Also allow common punctuation, digits, whitespace
def is_latin_char(ch):
    cp = ord(ch)
    # Control chars, digits, punctuation, whitespace — not "non-Latin"
    if cp <= 0x002F:  # control + space + basic punctuation
        return True
    if 0x0030 <= cp <= 0x0039:  # digits
        return True
    if 0x003A <= cp <= 0x0040:  # : ; < = > ? @
        return True
    if 0x005B <= cp <= 0x0060:  # [ \ ] ^ _ `
        return True
    if 0x007B <= cp <= 0x007F:  # { | } ~ DEL
        return True
    # Latin blocks
    if 0x0041 <= cp <= 0x005A:  # A-Z
        return True
    if 0x0061 <= cp <= 0x007A:  # a-z
        return True
    if 0x00C0 <= cp <= 0x00FF:  # Latin-1 Supplement (À-ÿ)
        return True
    if 0x0100 <= cp <= 0x017F:  # Latin Extended-A (Ā-ſ)
        return True
    if 0x0180 <= cp <= 0x024F:  # Latin Extended-B
        return True
    if 0x0250 <= cp <= 0x02AF:  # IPA Extensions (Latin-based)
        return True
    if 0x1E00 <= cp <= 0x1EFF:  # Latin Extended Additional
        return True
    if 0x2C60 <= cp <= 0x2C7F:  # Latin Extended-C
        return True
    if 0xA720 <= cp <= 0xA7FF:  # Latin Extended-D
        return True
    if 0xAB30 <= cp <= 0xAB6F:  # Latin Extended-E
        return True
    if 0x00A0 <= cp <= 0x00BF:  # Latin-1 punctuation (©, ®, etc.)
        return True
    if 0x2000 <= cp <= 0x206F:  # General punctuation
        return True
    if 0x2010 <= cp <= 0x2027:  # Dashes, quotes
        return True
    if 0xFE00 <= cp <= 0xFE0F:  # Variation selectors
        return True
    return False

def has_non_latin(text):
    """Returns True if text contains any non-Latin character."""
    for ch in text:
        if not is_latin_char(ch):
            return True
    return False

def get_non_latin_chars(text):
    """Returns list of non-Latin characters found in text."""
    return [(ch, hex(ord(ch)), unicodedata.name(ch, 'UNKNOWN')) for ch in text if not is_latin_char(ch)]

with open(FILE, 'r', encoding='utf-8-sig') as f:
    # Detect delimiter (tab or comma)
    first_line = f.readline()
    f.seek(0)
    delimiter = '\t' if '\t' in first_line else ','
    print(f"Detected delimiter: {'TAB' if delimiter == chr(9) else 'COMMA'}")
    
    reader = csv.DictReader(f, delimiter=delimiter)
    headers = reader.fieldnames
    print(f"Columns ({len(headers)}):")
    for i, h in enumerate(headers):
        print(f"  [{i}] {h}")
    print()

    # Find columns related to names/aliases
    name_keywords = ['name', 'first', 'last', 'alias', 'aka', 'spelling', 'script', 'fka', 'nka']
    name_cols = [h for h in headers if any(k in h.lower() for k in name_keywords)]
    print(f"Name-related columns: {name_cols}")
    print()

    # Also check all columns for non-Latin (in case column names differ)
    non_latin_records = []
    total_rows = 0

    f.seek(0)
    reader = csv.DictReader(f, delimiter=delimiter)

    for row in reader:
        total_rows += 1
        # Check name columns specifically
        for col in name_cols:
            val = row.get(col, '').strip()
            if val and has_non_latin(val):
                chars = get_non_latin_chars(val)
                non_latin_records.append({
                    'row': total_rows,
                    'column': col,
                    'value': val[:150],
                    'record_id': row.get('UID', row.get('Record ID', row.get(headers[0], '')))[:30],
                    'chars': chars[:5]
                })

        # Also check ALL columns for non-Latin
        for col in headers:
            if col in name_cols:
                continue
            val = row.get(col, '').strip()
            if val and has_non_latin(val):
                chars = get_non_latin_chars(val)
                non_latin_records.append({
                    'row': total_rows,
                    'column': col,
                    'value': val[:150],
                    'record_id': row.get('UID', row.get('Record ID', row.get(headers[0], '')))[:30],
                    'chars': chars[:5]
                })

print(f"Total rows: {total_rows}")
print(f"Non-Latin entries found: {len(non_latin_records)}")
print()

if non_latin_records:
    print("=" * 90)
    print("NON-LATIN CHARACTERS FOUND:")
    print("=" * 90)

    # Group by column
    by_col = {}
    for rec in non_latin_records:
        col = rec['column']
        if col not in by_col:
            by_col[col] = []
        by_col[col].append(rec)

    for col, recs in sorted(by_col.items()):
        print(f"\n  Column: {col} ({len(recs)} occurrences)")
        print(f"  {'-' * 70}")
        seen_values = set()
        shown = 0
        for rec in recs:
            short_val = rec['value'][:80]
            if short_val in seen_values:
                continue
            seen_values.add(short_val)
            shown += 1
            if shown > 10:
                print(f"    ... and {len(recs) - 10} more")
                break
            chars_info = " ".join([f"{ch}({name})" for ch, code, name in rec.get('chars', [])])
            print(f"    Row {rec['row']:>5} | RecID: {rec['record_id']:<20} | {rec['value'][:80]}")
            if chars_info:
                print(f"           Non-Latin chars: {chars_info}")

    # Summary
    print(f"\n{'=' * 90}")
    print("SUMMARY:")
    print(f"  Total rows: {total_rows}")
    print(f"  Rows with non-Latin: {len(set(r['row'] for r in non_latin_records))}")
    print(f"  Columns affected: {list(by_col.keys())}")

    # Check specifically for firstname, lastname, alias, alternate spelling
    for check_col in ['First Name', 'Last Name', 'First Name (AKA)', 'Last Name (AKA)', 'AKA Type']:
        matches = [r for r in non_latin_records if r['column'] == check_col]
        if matches:
            print(f"\n  ⚠️  {check_col}: {len(matches)} non-Latin entries")
            for m in matches[:3]:
                print(f"      Row {m['row']}: {m['value'][:80]}")
        else:
            # Check similar column names
            similar = [r for r in non_latin_records if check_col.lower().replace(' ', '') in r['column'].lower().replace(' ', '')]
            if similar:
                print(f"\n  ⚠️  ~{check_col}: {len(similar)} non-Latin entries (col: {similar[0]['column']})")

else:
    print("✅ No non-Latin characters found in any column.")
