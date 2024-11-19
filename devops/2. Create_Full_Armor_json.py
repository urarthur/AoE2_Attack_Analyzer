import json
import pandas as pd
import csv

def extract_all_units_armours(input_json_path, classes_xlsx_path, units_xlsx_path, json_output_path, csv_output_path):
    # Load the class mapping from the Excel file
    class_mapping = pd.read_excel(classes_xlsx_path)
    class_mapping_dict = dict(zip(class_mapping['Class'], class_mapping['Class Name']))

    # Load the unit data from the first tab of the provided Excel file
    units_mapping = pd.read_excel(units_xlsx_path, sheet_name=0)
    
    # Create a mapping from Unit ID to Civ Name from the first tab (CIV column)
    unit_id_to_civ_name = dict(zip(units_mapping['UNIT ID'], units_mapping['CIV']))

    # Open and read the JSON file
    with open(input_json_path, 'r') as file:
        data = json.load(file)

    all_units_records = []

    # Iterate over the units in the units_mapping
    for _, row in units_mapping.iterrows():
        unit_id = row['UNIT ID']
        
        # Initialize a record for this unit
        unit_record = {
            "Unit ID": unit_id,
            "Unit Name": row['NAME'],
            "Building": row['BUILDING'],
            "Civ": "Unknown Civ",  # Default to unknown
            "Armours": []
        }

        # Flag to check if unit data is found
        unit_found = False

        # Iterate over the Civs list in the JSON data
        for civ in data.get('Civs', []):
            units = civ.get('Units', [])

            # Check if the unit exists in the Civ's units
            if unit_id < len(units):
                unit = units[unit_id]
                type50_data = unit.get('Type50', {})

                # Retrieve Civ ID and Civ Name from the JSON
                json_civ_id = civ.get('ID')
                json_civ_name = civ.get('Name')

                # Set the Civ name from the units.xlsx mapping
                civ_name = unit_id_to_civ_name.get(unit_id, "Unknown Civ")
                unit_record["Civ"] = civ_name  # Assign the Civ name based on mapping

                # Extract armours data (class and amount)
                armours = type50_data.get('Armours', [])
                for armour in armours:
                    armour_class = armour.get('Class', 'Unknown')
                    armour_amount = armour.get('Amount', 'Unknown')
                    armour_class_name = class_mapping_dict.get(armour_class, f"Class {armour_class}")

                    # Add armour info to the unit record
                    unit_record["Armours"].append({
                        "Armour Class": armour_class,
                        "Armour Amount": armour_amount,
                        "Armour Class Name": armour_class_name
                    })
                
                unit_found = True
                break  # Exit loop after finding the unit

        if not unit_found:
            print(f"Unit ID {unit_id} not found in any civilization.")

        # Append the unit record to the all_units_records list
        all_units_records.append(unit_record)

    # Save extracted data to CSV using csv.writer
    with open(csv_output_path, 'w', newline='') as output_file:
        csv_writer = csv.writer(output_file)
        # Write headers
        csv_writer.writerow(['Unit ID', 'Unit Name', 'Building', 'Civ', 'Armour Class', 'Armour Amount', 'Armour Class Name'])

        # Write data rows
        for record in all_units_records:
            for armour in record["Armours"]:
                csv_writer.writerow([
                    record['Unit ID'],
                    record['Unit Name'],
                    record['Building'],
                    record['Civ'],
                    armour['Armour Class'],
                    armour['Armour Amount'],
                    armour['Armour Class Name']
                ])

    # Save extracted data to JSON
    with open(json_output_path, 'w') as json_file:
        json.dump(all_units_records, json_file, indent=4)

    print(f"\nData has been successfully extracted and saved to {csv_output_path} and {json_output_path}")

# Example usage
input_json_path = 'data/full.json'
classes_xlsx_path = 'data/Classes.xlsx'
units_xlsx_path = 'data/UNITS.xlsx'
json_output_path = 'data/all_units_armours_data.json'
csv_output_path = 'data/all_units_armours_data.csv'

extract_all_units_armours(input_json_path, classes_xlsx_path, units_xlsx_path, json_output_path, csv_output_path)
