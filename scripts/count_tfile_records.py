#!/usr/bin/env python3
"""
Script to count unique records for US2 column (column 17) in FOFDBOF.t
Data format: Tab-delimited (\t = column separator, \n = row separator)
"""

import tarfile
from collections import Counter

TAR_FILE = r"C:\Users\ReemaSingh\Downloads\pep-template_a_full_records_T_20260409095127.tar\pep-template_a_full_records_T_20260409095127.tar"

# Column index for US2 (0-based, so column 17 = index 16)
US2_COLUMN_INDEX = 16

def main():
    print(f"Processing tar file: {TAR_FILE}")
    
    with tarfile.open(TAR_FILE, 'r') as tar:
        fofdbof_member = None
        for member in tar.getmembers():
            if 'FOFDBOF.t' in member.name:
                fofdbof_member = member
                break
        
        if not fofdbof_member:
            print("ERROR: FOFDBOF.t not found")
            return
        
        print(f"Reading: {fofdbof_member.name}")
        
        f = tar.extractfile(fofdbof_member)
        content = f.read().decode('utf-8', errors='ignore')
        
        # Find where <RECORDS> starts - data begins after this
        records_start = content.find('<RECORDS>')
        if records_start == -1:
            print("ERROR: <RECORDS> tag not found")
            return
        
        # Get data portion (after <RECORDS> tag)
        data_portion = content[records_start + len('<RECORDS>'):].strip()
        
        # Split into lines (records)
        lines = data_portion.split('\n')
        
        print(f"\nTotal lines in data section: {len(lines)}")
        
        us2_values = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith('</'):
                continue
            
            # Split by tab
            columns = line.split('\t')
            
            # Get US2 value (column 17 = index 16)
            if len(columns) > US2_COLUMN_INDEX:
                us2_value = columns[US2_COLUMN_INDEX].strip()
                us2_values.append(us2_value)
        
        print(f"Total records with US2 column: {len(us2_values)}")
        print(f"Unique US2 values: {len(set(us2_values))}")
        
        # Count occurrences
        value_counts = Counter(us2_values)
        
        print(f"\n{'US2 Value':<60} {'Count':>10}")
        print("-" * 72)
        
        for value, count in sorted(value_counts.items(), key=lambda x: -x[1])[:50]:
            display_val = value[:57] + "..." if len(value) > 60 else value
            if not display_val:
                display_val = "(empty)"
            print(f"{display_val:<60} {count:>10}")
        
        if len(value_counts) > 50:
            print(f"\n... and {len(value_counts) - 50} more unique values")
        
        # Summary
        print(f"\n{'='*72}")
        print(f"SUMMARY")
        print(f"{'='*72}")
        print(f"Total records: {len(us2_values)}")
        print(f"Unique US2 values: {len(set(us2_values))}")
        
        empty_count = sum(1 for v in us2_values if not v)
        print(f"Empty US2 values: {empty_count}")
        print(f"Non-empty US2 values: {len(us2_values) - empty_count}")

if __name__ == "__main__":
    main()
