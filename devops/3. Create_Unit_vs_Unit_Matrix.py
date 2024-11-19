import json
import pandas as pd

def retrieve_unit_comparisons(attacks_json_path, armours_json_path, output_csv_path, output_json_path):
    # Load attack data
    with open(attacks_json_path, 'r') as attack_file:
        attacks_data = json.load(attack_file)

    # Load armor data
    with open(armours_json_path, 'r') as armour_file:
        armours_data = json.load(armour_file)

    # Initialize a dictionary to hold results
    results = {}

    # Loop through all units as attackers
    for attacker in attacks_data:
        attacker_id = attacker['Unit ID']
        attacker_name = attacker['Unit Name']
        
        # Initialize attacker's entry in results
        if attacker_id not in results:
            results[attacker_id] = {
                "Attacker Name": attacker_name,
                "Opponents": {}
            }
        
        # Loop through all units as opponents
        for opponent in armours_data:
            opponent_id = opponent['Unit ID']
            opponent_name = opponent['Unit Name']

            total_attack_amount = 0
            matching_classes_details = []
            matching_found = False  # Track if any matching classes are found

            # Check matching attack classes for the attacker
            for attack in attacker['Attacks']:
                attack_class = attack['Attack Class']
                attack_amount = attack['Attack Amount']
                attack_class_name = attack['Attack Class Name']

                # Check for matching armor class in the opponent's data
                opponent_armour = next((armour for armour in opponent['Armours'] if armour['Armour Class'] == attack_class), None)

                if opponent_armour:
                    matching_found = True  # Mark that a match was found
                    armour_amount = opponent_armour['Armour Amount']
                    # Calculate net contribution
                    net_contribution = attack_amount - armour_amount
                    total_attack_amount += net_contribution
                    matching_classes_details.append({
                        "Attack Class": attack_class,
                        "Attack Class Name": attack_class_name,
                        "Attack Amount": attack_amount,
                        "Net Contribution": net_contribution
                    })

            # If no matching classes were found, set the total attack amount to 0
            if not matching_found:
                total_attack_amount = 0

            # Append results for this attacker vs opponent
            results[attacker_id]["Opponents"][opponent_id] = {
                "Opponent Name": opponent_name,
                "Total Attack Amount": total_attack_amount,
                "Matching Classes": matching_classes_details
            }

    # Convert results to a DataFrame for better visualization
    results_df = pd.DataFrame([
        {
            "Attacker ID": attacker_id,
            "Attacker Name": attacker_data["Attacker Name"],
            "Opponent ID": opponent_id,
            "Opponent Name": opponent_data["Opponent Name"],
            "Total Attack Amount": opponent_data["Total Attack Amount"],
            "Matching Classes": opponent_data["Matching Classes"]
        }
        for attacker_id, attacker_data in results.items()
        for opponent_id, opponent_data in attacker_data["Opponents"].items()
    ])

    # Save results to CSV
    results_df.to_csv(output_csv_path, index=False)
    
    # Save results to JSON
    with open(output_json_path, 'w') as json_file:
        json.dump(results, json_file, indent=4)

# Example usage
attacks_json_path = 'data/all_units_attacks_data.json'
armours_json_path = 'data/all_units_armours_data.json'
output_csv_path = 'data/Unit_vs_Unit_Matrix.csv'
output_json_path = 'data/Unit_vs_Unit_Matrix.json'

retrieve_unit_comparisons(attacks_json_path, armours_json_path, output_csv_path, output_json_path)

print(f"Unit comparisons have been successfully saved to {output_csv_path} and {output_json_path}.")
