#!/usr/bin/env python3
"""
Compare two Fremenbank Keyword Reports and show:
- % difference in count per keyword
- Top 10 keywords with max count change
"""
import pandas as pd
import glob
import os
from datetime import datetime

DOWNLOADS_DIR = r"C:\Users\ReemaSingh\Downloads"

def find_latest_two_reports():
    """Find the latest two Fremenbank_Keyword_Report files in Downloads folder"""
    pattern = os.path.join(DOWNLOADS_DIR, "Fremenbank_Keyword_Report*.xlsx")
    files = glob.glob(pattern)
    # Exclude comparison files
    files = [f for f in files if "Comparison" not in os.path.basename(f)]
    
    if len(files) < 2:
        raise Exception(f"Need at least 2 report files in Downloads, found {len(files)}: {files}")
    
    # Sort by modified time, newest first
    files.sort(key=os.path.getmtime, reverse=True)
    
    newest = files[0]
    second = files[1]
    return second, newest  # old, new

def main():
    old_file, new_file = find_latest_two_reports()
    output_file = os.path.join(DOWNLOADS_DIR, f"Keyword_Comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
    
    print(f"Old report: {os.path.basename(old_file)}")
    print(f"New report: {os.path.basename(new_file)}")
    
    df_old = pd.read_excel(old_file, sheet_name="Per Keyword")
    df_new = pd.read_excel(new_file, sheet_name="Per Keyword")
    
    # Merge on Keyword
    df_merged = pd.merge(
        df_old, df_new, 
        on="Keyword", 
        how="outer", 
        suffixes=("_Old", "_New")
    )
    
    # Fill NaN with 0 (keyword didn't exist in one of the files)
    df_merged["Count_Old"] = df_merged["Count_Old"].fillna(0).astype(int)
    df_merged["Count_New"] = df_merged["Count_New"].fillna(0).astype(int)
    
    # Calculate difference and % change
    df_merged["Count_Diff"] = df_merged["Count_New"] - df_merged["Count_Old"]
    df_merged["Abs_Diff"] = df_merged["Count_Diff"].abs()
    df_merged["Pct_Change"] = df_merged.apply(
        lambda r: round((r["Count_Diff"] / r["Count_Old"] * 100), 2) if r["Count_Old"] > 0 else (100.0 if r["Count_New"] > 0 else 0.0),
        axis=1
    )
    
    # Sort by absolute difference for top 10
    df_sorted = df_merged.sort_values("Abs_Diff", ascending=False)
    
    # Top 10 with max count change
    top_10 = df_sorted.head(10)[["Keyword", "Count_Old", "Count_New", "Count_Diff", "Pct_Change"]]
    
    # Full comparison sorted by % change
    df_full = df_merged[["Keyword", "Count_Old", "Count_New", "Count_Diff", "Pct_Change"]].sort_values("Pct_Change", ascending=False)
    
    # Summary stats
    total_old = df_merged["Count_Old"].sum()
    total_new = df_merged["Count_New"].sum()
    total_diff = total_new - total_old
    total_pct = round((total_diff / total_old * 100), 2) if total_old > 0 else 0
    
    keywords_added = len(df_merged[df_merged["Count_Old"] == 0])
    keywords_removed = len(df_merged[df_merged["Count_New"] == 0])
    keywords_changed = len(df_merged[df_merged["Count_Diff"] != 0])
    
    print(f"\n{'='*60}")
    print("COMPARISON SUMMARY")
    print(f"{'='*60}")
    print(f"Total keywords (old):     {len(df_old):,}")
    print(f"Total keywords (new):     {len(df_new):,}")
    print(f"Keywords added:           {keywords_added:,}")
    print(f"Keywords removed:         {keywords_removed:,}")
    print(f"Keywords with changes:    {keywords_changed:,}")
    print(f"\nTotal count (old):        {total_old:,}")
    print(f"Total count (new):        {total_new:,}")
    print(f"Total difference:         {total_diff:+,}")
    print(f"Overall % change:         {total_pct:+.2f}%")
    
    print(f"\n{'='*60}")
    print("TOP 10 KEYWORDS WITH MAX COUNT CHANGE")
    print(f"{'='*60}")
    print(f"{'Keyword':<40} {'Old':>10} {'New':>10} {'Diff':>10} {'%':>8}")
    print("-" * 80)
    for _, row in top_10.iterrows():
        print(f"{row['Keyword']:<40} {row['Count_Old']:>10,} {row['Count_New']:>10,} {row['Count_Diff']:>+10,} {row['Pct_Change']:>+7.2f}%")
    
    # Save to Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        top_10.to_excel(writer, index=False, sheet_name="Top 10 Changes")
        df_full.to_excel(writer, index=False, sheet_name="All Keywords")
    
    print(f"\nReport saved to: {output_file}")

if __name__ == "__main__":
    main()
