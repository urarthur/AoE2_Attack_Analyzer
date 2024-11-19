import pandas as pd
import json
import os

def excel_to_json():
    # Get the data directory path (in same folder as script)
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    print(f"Looking for data in: {data_dir}")
    
    if not os.path.exists(data_dir):
        print("Data directory not found!")
        print("Current script location:", os.path.dirname(os.path.abspath(__file__)))
        print("Available files/folders:", os.listdir(os.path.dirname(os.path.abspath(__file__))))
        return
    
    # Specific files to convert
    target_files = ["CIV.xlsx", "UNITS.xlsx"]
    
    for filename in target_files:
        excel_file = os.path.join(data_dir, filename)
        print(f"Looking for file: {excel_file}")
        
        if not os.path.exists(excel_file):
            print(f"File not found: {filename}")
            print(f"Looking in: {data_dir}")
            continue
            
        try:
            # Read Excel file
            df = pd.read_excel(excel_file)
            
            # Create JSON filename in same directory
            json_file = os.path.splitext(excel_file)[0] + '.json'
            
            # Set the first column as index
            first_column = df.columns[0]  # Gets either "NUMBER" or "UNIT ID"
            df.set_index(first_column, inplace=True)
            
            # Convert to dictionary and then to JSON
            json_dict = df.to_dict(orient='index')
            
            # Replace NaN values with None
            json_dict = {k: {ik: (iv if pd.notna(iv) else None) for ik, iv in v.items()} for k, v in json_dict.items()}
            
            # Save as JSON with proper formatting and encoding
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(json_dict, f, ensure_ascii=False, indent=4)
            
            print(f"Converted {filename} to {os.path.basename(json_file)}")
            
        except Exception as e:
            print(f"Error converting {filename}: {str(e)}")

if __name__ == "__main__":
    excel_to_json()