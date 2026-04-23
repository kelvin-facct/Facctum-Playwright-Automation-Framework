#!/usr/bin/env python3
"""
Script to calculate time differences between columns in EU Journals Excel file
- Column D vs E difference
- Column E vs F difference
"""

import pandas as pd
from datetime import datetime

EXCEL_FILE = r"C:\Users\ReemaSingh\Downloads\EU Journals 2025-2026.xlsx"
OUTPUT_FILE = r"C:\Users\ReemaSingh\Downloads\EU_Journals_Time_Differences.xlsx"

def parse_datetime(val):
    """Parse datetime value, handling various formats"""
    if pd.isna(val) or val == '' or val is None:
        return None
    
    if isinstance(val, datetime):
        return val
    
    if isinstance(val, pd.Timestamp):
        return val.to_pydatetime()
    
    # Try parsing string formats
    if isinstance(val, str):
        val = val.strip()
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
            '%d-%m-%Y %H:%M:%S',
            '%d-%m-%Y %H:%M',
            '%d-%m-%Y',
            '%d/%m/%Y %H:%M:%S',
            '%d/%m/%Y %H:%M',
            '%d/%m/%Y',
            '%m/%d/%Y %H:%M:%S',
            '%m/%d/%Y %H:%M',
            '%m/%d/%Y',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val, fmt)
            except:
                continue
    return None

def calculate_time_diff(dt1, dt2):
    """Calculate time difference between two datetimes"""
    if dt1 is None or dt2 is None:
        return None
    
    try:
        diff = dt2 - dt1
        total_seconds = diff.total_seconds()
        
        # Format as days, hours, minutes
        days = int(total_seconds // 86400)
        hours = int((total_seconds % 86400) // 3600)
        minutes = int((total_seconds % 3600) // 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except:
        return None

def main():
    print(f"Reading Excel file: {EXCEL_FILE}")
    
    # Read Excel file
    df = pd.read_excel(EXCEL_FILE)
    
    print(f"\nColumns found: {list(df.columns)}")
    print(f"Total rows: {len(df)}")
    
    # Show first few rows to understand structure
    print(f"\nFirst 5 rows:")
    print(df.head())
    
    # Get columns D, E, F (index 3, 4, 5)
    col_d_name = df.columns[3] if len(df.columns) > 3 else None
    col_e_name = df.columns[4] if len(df.columns) > 4 else None
    col_f_name = df.columns[5] if len(df.columns) > 5 else None
    
    print(f"\nColumn D: {col_d_name}")
    print(f"Column E: {col_e_name}")
    print(f"Column F: {col_f_name}")
    
    # Calculate differences
    diff_d_e = []
    diff_e_f = []
    
    for idx, row in df.iterrows():
        val_d = parse_datetime(row.iloc[3]) if len(row) > 3 else None
        val_e = parse_datetime(row.iloc[4]) if len(row) > 4 else None
        val_f = parse_datetime(row.iloc[5]) if len(row) > 5 else None
        
        diff_d_e.append(calculate_time_diff(val_d, val_e))
        diff_e_f.append(calculate_time_diff(val_e, val_f))
    
    # Add new columns
    df['Diff_D_E'] = diff_d_e
    df['Diff_E_F'] = diff_e_f
    
    # Save to new Excel file
    df.to_excel(OUTPUT_FILE, index=False)
    print(f"\nOutput saved to: {OUTPUT_FILE}")
    
    # Show results
    print(f"\n{'='*80}")
    print("TIME DIFFERENCES SUMMARY")
    print(f"{'='*80}")
    print(f"\nDiff D-E (first 20 rows):")
    for i, val in enumerate(diff_d_e[:20]):
        print(f"  Row {i+1}: {val}")
    
    print(f"\nDiff E-F (first 20 rows):")
    for i, val in enumerate(diff_e_f[:20]):
        print(f"  Row {i+1}: {val}")

if __name__ == "__main__":
    main()
