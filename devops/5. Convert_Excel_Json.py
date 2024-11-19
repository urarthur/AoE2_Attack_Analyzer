import pandas as pd
import json
import os
import glob

def excel_to_json():
    # Set data directory path
    data_dir = os.path.join(os.getcwd(), "data")
    
    # Find all Excel files in data directory
    excel_files = glob.glob(os.path.join(data_dir, "*.xlsx")) + glob.glob(os.path.join(data_dir, "*.xls"))
    
    if not excel_files:
        print("No Excel files found in data directory")
        return
    
    for excel_file in excel_files:
        try:
            # Read Excel file
            df = pd.read_excel(excel_file)
            
            # Create JSON filename in same directory (replace extension with .json)
            json_file = os.path.splitext(excel_file)[0] + '.json'
            
            # Convert to JSON and save (force_ascii=False to preserve special characters)
            df.to_json(json_file, orient='records', force_ascii=False, indent=4)
            
            print(f"Converted {os.path.basename(excel_file)} to {os.path.basename(json_file)}")
            
        except Exception as e:
            print(f"Error converting {os.path.basename(excel_file)}: {str(e)}")

if __name__ == "__main__":
    excel_to_json()