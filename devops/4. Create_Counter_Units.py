import json
import pandas as pd
import openpyxl

def process_all_units(attacks_json_path, armours_json_path, units_xlsx_path, filter_xlsx_path, units_buildings_techs_path, full_counter_csv_path, full_counter_json_path):
    # Load attack data
    with open(attacks_json_path, 'r') as attack_file:
        attacks_data = json.load(attack_file)

    # Load armor data
    with open(armours_json_path, 'r') as armour_file:
        armours_data = json.load(armour_file)

    # Load the units_buildings_techs.json to get cost data
    with open(units_buildings_techs_path, 'r') as cost_file:
        cost_data = json.load(cost_file)

    # Navigate the JSON structure to access the "units_buildings"
    units_buildings = cost_data.get('units_buildings', {})

    # Load the UNITS.xlsx to get building names and target units
    units_data = pd.read_excel(units_xlsx_path, sheet_name=0)
    unit_id_to_building = dict(zip(units_data['UNIT ID'], units_data['BUILDING']))
    target_unit_ids = units_data['UNIT ID'].tolist()

    # Load the filter from CounterCalcFilter.xlsx to include specific Unit IDs
    filter_data = pd.read_excel(filter_xlsx_path, sheet_name=0)
    filter_unit_ids = set(filter_data['UNIT ID'])

    # Initialize lists to store results for each target unit
    all_top_main_counters = []
    all_top_other_counters = []

    # Loop through each target unit ID in UNITS.xlsx
    for target_unit_id in target_unit_ids:
        # Retrieve the target unit's armor data
        target_unit_armor = next((unit for unit in armours_data if unit['Unit ID'] == target_unit_id), None)
        if not target_unit_armor:
            continue  # Skip if the target unit's armor data is not found

        # Initialize a list to track damaging units
        damage_results = []

        # Loop through all units as potential attackers (including the target unit)
        for attacker in attacks_data:
            attacker_id = attacker['Unit ID']
            attacker_name = attacker['Unit Name']

            total_attack_amount = 0
            applicable_attack_classes = []
            matching_found = False

            # Calculate the net contributions for matching classes
            for attack in attacker['Attacks']:
                attack_class = attack['Attack Class']
                attack_amount = attack['Attack Amount']
                attack_class_name = attack['Attack Class Name']

                # Check for matching armor class in the target unit's data
                target_armour = next((armour for armour in target_unit_armor['Armours'] if armour['Armour Class'] == attack_class), None)

                if target_armour:
                    matching_found = True
                    armour_amount = target_armour['Armour Amount']
                    net_contribution = attack_amount - armour_amount
                    total_attack_amount += net_contribution
                    applicable_attack_classes.append({
                        "Attack Class": attack_class,
                        "Attack Class Name": attack_class_name
                    })

            # If no matching classes were found, set the total attack amount to 0
            if not matching_found:
                total_attack_amount = 0

            # If no matching classes were found, set the total attack amount to 0
            if not matching_found:
                total_attack_amount = 0

            # Retrieve cost information from the JSON structure
            unit_cost = units_buildings.get(str(attacker_id), {}).get('cost', {})
            food_cost = unit_cost.get('food', 0) if 'food' in unit_cost else 0
            wood_cost = unit_cost.get('wood', 0) if 'wood' in unit_cost else 0
            gold_cost = unit_cost.get('gold', 0) if 'gold' in unit_cost else 0
            total_resources = food_cost + wood_cost + gold_cost

            # Track each attacker's damage data and get building info
            building_name = unit_id_to_building.get(attacker_id, "Unknown Building")
            damage_results.append({
                "Target Unit ID": target_unit_id,
                "UNIT ID": attacker_id,
                "NAME": attacker_name,
                "BUILDING": building_name,
                "Net Damage": total_attack_amount,
                "Attack Class": applicable_attack_classes,
                "Food": food_cost,
                "Wood": wood_cost,
                "Gold": gold_cost,
                "Total Resources": total_resources
            })

        # Convert results to a DataFrame
        damage_df = pd.DataFrame(damage_results)

        # Exclude units that are in the filter list for the first output
        top_main_counters = damage_df[~damage_df['UNIT ID'].isin(filter_unit_ids)]
        top_main_counters = top_main_counters.sort_values(by='Net Damage', ascending=False).head(20)
        all_top_main_counters.append(top_main_counters)

        # Filter only units that are in the filter list for the second output
        other_counters = damage_df[damage_df['UNIT ID'].isin(filter_unit_ids)]
        top_other_counters = other_counters.sort_values(by='Net Damage', ascending=False).head(20)
        all_top_other_counters.append(top_other_counters)

    # Combine results for all units
    combined_top_main_counters = pd.concat(all_top_main_counters, ignore_index=True)
    combined_top_other_counters = pd.concat(all_top_other_counters, ignore_index=True)

    # Save to a single CSV with two sheets
    with pd.ExcelWriter(full_counter_csv_path, engine='xlsxwriter') as writer:
        combined_top_main_counters.to_excel(writer, sheet_name='Top Main Counters', index=False)
        combined_top_other_counters.to_excel(writer, sheet_name='Top Other Counters', index=False)

    # Save to a single JSON file with the new structure
    combined_json_data = {}
    for target_unit_id in target_unit_ids:
        combined_json_data[target_unit_id] = []

    for _, row in combined_top_main_counters.iterrows():
        target_unit_id = row['Target Unit ID']
        combined_json_data[target_unit_id].append({
            "Counter Unit ID": row['UNIT ID'],
            "Name": row['NAME'],
            "Building": row['BUILDING'],
            "Net Damage": row['Net Damage'],
            "Attack Class": row['Attack Class'],
            "Food": row['Food'],
            "Wood": row['Wood'],
            "Gold": row['Gold'],
            "Total Resources": row['Total Resources'],
            "Siege and Other": False
        })

    for _, row in combined_top_other_counters.iterrows():
        target_unit_id = row['Target Unit ID']
        combined_json_data[target_unit_id].append({
            "Counter Unit ID": row['UNIT ID'],
            "Name": row['NAME'],
            "Building": row['BUILDING'],
            "Net Damage": row['Net Damage'],
            "Attack Class": row['Attack Class'],
            "Food": row['Food'],
            "Wood": row['Wood'],
            "Gold": row['Gold'],
            "Total Resources": row['Total Resources'],
            "Siege and Other": True
        })

    with open(full_counter_json_path, 'w') as json_file:
        json.dump(combined_json_data, json_file, indent=4)

    print(f"Combined CSV with two tabs saved to {full_counter_csv_path}.")
    print(f"Combined JSON saved to {full_counter_json_path}.")

# Example usage
if __name__ == "__main__":
    # File paths for the data
    attacks_json_path = 'data/all_units_attacks_data.json'
    armours_json_path = 'data/all_units_armours_data.json'
    units_xlsx_path = 'data/UNITS.xlsx'
    filter_xlsx_path = 'data/CounterCalcFilter.xlsx'
    units_buildings_techs_path = 'data/units_buildings_techs.json'
    full_counter_csv_path = 'data/CounterUnits.xlsx'
    full_counter_json_path = 'data/CounterUnits.json'

    # Process all units
    process_all_units(
        attacks_json_path,
        armours_json_path,
        units_xlsx_path,
        filter_xlsx_path,
        units_buildings_techs_path,
        full_counter_csv_path,
        full_counter_json_path
    )
