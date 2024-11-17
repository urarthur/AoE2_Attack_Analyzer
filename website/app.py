from flask import Flask, render_template, request, jsonify, send_from_directory
import pandas as pd
import os
import json
from typing import Dict, List, Union, Optional

app = Flask(__name__)

# Global data storage
unit_vs_unit_data = None
counter_units_data = None

def load_json_data():
    global unit_vs_unit_data, counter_units_data
    unit_vs_unit_data = json.load(open(os.path.join(os.path.dirname(__file__), 'static', 'Unit_vs_Unit_Matrix.json')))
    counter_units_data = json.load(open(os.path.join(os.path.dirname(__file__), 'static', 'CounterUnits.json')))

load_json_data()

# Modify get_units_from_excel to include both EXCLUDE and INCLUDE columns
def get_units_from_excel():
    df = pd.read_excel(os.path.join(os.path.dirname(__file__), 'static', 'UNITS.xlsx'), 
                       usecols="A:G",  # Include both F (EXCLUDE) and G (INCLUDE)
                       names=['UNIT_ID', 'NAME', 'BUILDING', 'CIV', 'SORTING', 'EXCLUDE', 'INCLUDE'])
    return df.to_dict('records')

def load_json_file(filename):
    return json.load(open(os.path.join(os.path.dirname(__file__), 'static', filename)))

def get_unit_details_from_json(unit_id):
    data = load_json_file('units_buildings_techs.json')
    return data['units_buildings'].get(str(unit_id))

def get_unit_attacks_from_json(unit_id):
    data = load_json_file('all_units_attacks_data.json')
    unit = next((unit for unit in data if unit["Unit ID"] == unit_id), None)
    return unit["Attacks"] if unit else None

def get_unit_armours_from_json(unit_id):
    data = load_json_file('all_units_armours_data.json')
    unit = next((unit for unit in data if unit["Unit ID"] == unit_id), None)
    return unit["Armours"] if unit else None

def get_unit_vs_unit_data(attacker_id, defender_id):
    attacker_data = unit_vs_unit_data.get(str(attacker_id), {})
    defender_data = attacker_data.get('Opponents', {}).get(str(defender_id), {})
    
    # Get defender's armor data
    defender_armors = get_unit_armours_from_json(defender_id)
    
    # Process matching classes to include both attack and armor values
    matching_classes = []
    for cls in defender_data.get('Matching Classes', []):
        attack_class_name = cls['Attack Class Name']
        attack_amount = cls['Attack Amount']
        
        # Don't modify base pierce or base melee calculations
        if attack_class_name in ["Base Pierce", "Base Melee"]:
            matching_classes.append({
                'Attack Class Name': attack_class_name,
                'Attack Amount': attack_amount
            })
            continue
        
        # For bonus damages, find matching armor class
        matching_armor = next(
            (armor for armor in defender_armors 
             if armor['Armour Class Name'] == attack_class_name),
            None
        )
        
        # If there's a matching armor class, calculate the net bonus
        if matching_armor:
            armor_amount = matching_armor['Armour Amount']
            # Negative armor increases damage, positive armor reduces it
            net_amount = attack_amount - armor_amount
        else:
            net_amount = attack_amount
            
        matching_classes.append({
            'Attack Class Name': attack_class_name,
            'Attack Amount': net_amount,
            'Original Attack': attack_amount,
            'Armor Amount': matching_armor['Armour Amount'] if matching_armor else 0
        })
    
    return {
        'attacker_name': attacker_data.get('Unit Name', 'Unknown'),
        'defender_name': defender_data.get('Opponent Name', 'Unknown'),
        'total_attack_amount': defender_data.get('Total Attack Amount', 0),
        'matching_classes': matching_classes,
        'notes': defender_data.get('Notes', '')
    }

def get_top_opponents(attacker_id, limit=20):
    attacker_data = unit_vs_unit_data.get(str(attacker_id), {})
    opponents = [{
        'opponent_id': opp_id,
        'name': opp_data.get('Opponent Name', 'Unknown'),
        'total_attack': opp_data.get('Total Attack Amount', 0)
    } for opp_id, opp_data in attacker_data.get('Opponents', {}).items()]
    
    return sorted(opponents, key=lambda x: x['total_attack'], reverse=True)[:limit]

def get_civ_restrictions(civ_name):
    try:
        # Read the CIV.xlsx file
        df = pd.read_excel(os.path.join(os.path.dirname(__file__), 'static', 'CIV.xlsx'))
        
        # Find the row for the specified civilization
        civ_row = df[df.iloc[:, 1] == civ_name]
        
        if civ_row.empty:
            return []
            
        # Get restrictions from the third column
        restrictions = civ_row.iloc[0, 2]
        
        if pd.isna(restrictions):
            return []
            
        # Split restrictions by semicolon and return as list
        return [r.strip() for r in str(restrictions).split(';') if r.strip()]
    except Exception as e:
        print(f"Error reading CIV restrictions: {e}")
        return []

def get_civ_id(civ_name: str) -> Optional[int]:
    try:
        df = pd.read_excel(os.path.join(os.path.dirname(__file__), 'static', 'CIV.xlsx'))
        civ_row = df[df.iloc[:, 1] == civ_name]
        return int(civ_row.iloc[0, 0]) if not civ_row.empty else None
    except Exception as e:
        print(f"Error getting civ ID: {e}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/images/<path:filename>')
def serve_image(filename):
    if filename.startswith('Emblems/'):
        return send_from_directory('static/images/Emblems', filename.replace('Emblems/', ''))
    elif filename.startswith('Buildings/'):
        return send_from_directory('static/images/Buildings', filename.replace('Buildings/', ''))
    return send_from_directory('static/images/Units', filename)

@app.route('/get-units', methods=['GET'])
def get_units():
    building_name = request.args.get('building')
    civ_name = request.args.get('civ')
    
    # Read the units data
    df = pd.read_excel(os.path.join(os.path.dirname(__file__), 'static', 'UNITS.xlsx'), 
                      usecols="A:G",
                      names=['UNIT_ID', 'NAME', 'BUILDING', 'CIV', 'SORTING', 'EXCLUDE', 'INCLUDE'])
    
    # Filter by building
    df = df[df['BUILDING'].str.upper() == building_name]
    
    # Get civ ID
    civ_id = get_civ_id(civ_name) if civ_name else None

    # Convert DataFrame to list of dictionaries, handling NaN values
    filtered_units = []
    for _, row in df.iterrows():
        unit = {
            'UNIT_ID': int(row['UNIT_ID']),
            'NAME': str(row['NAME']),
            'BUILDING': str(row['BUILDING']),
            'CIV': str(row['CIV']),
            'SORTING': float(row['SORTING']),
            'EXCLUDE': [] if pd.isna(row['EXCLUDE']) else [int(x) for x in str(row['EXCLUDE']).split(';') if x.strip()],
            'INCLUDE': [] if pd.isna(row['INCLUDE']) else [int(x) for x in str(row['INCLUDE']).split(';') if x.strip()]
        }
        
        # Check if unit should be excluded based on both EXCLUDE and INCLUDE logic
        is_excluded = False
        if civ_id is not None:
            # Check exclusion list
            if civ_id in unit['EXCLUDE']:
                is_excluded = True
            # For non-generic units, check inclusion list
            elif unit['CIV'].upper() != 'GENERIC':
                # If unit has inclusion list and civ_id is not in it, exclude it
                if unit['INCLUDE'] and civ_id not in unit['INCLUDE']:
                    is_excluded = True
        
        unit['isExcluded'] = is_excluded
        # Add the unit regardless of exclusion status
        filtered_units.append(unit)
    
    return jsonify({'units': filtered_units, 'action': 'show_units_layer'})

@app.route('/get-unit-details', methods=['GET'])
def get_unit_details():
    return jsonify(get_unit_details_from_json(int(request.args.get('unit_id'))))

@app.route('/get-unit-attacks', methods=['GET'])
def get_unit_attacks():
    return jsonify(get_unit_attacks_from_json(int(request.args.get('unit_id'))))

@app.route('/get-unit-armours', methods=['GET'])
def get_unit_armours():
    return jsonify(get_unit_armours_from_json(int(request.args.get('unit_id'))))

@app.route('/get-unit-vs-unit', methods=['GET'])
def get_unit_vs_unit():
    return jsonify(get_unit_vs_unit_data(
        int(request.args.get('attacker_id')),
        int(request.args.get('defender_id'))
    ))

@app.route('/get-counter-unit-details', methods=['GET'])
def get_counter_unit():
    return jsonify(counter_units_data.get(str(request.args.get('unit_id'))))

@app.route('/get-top-opponents', methods=['GET'])
def top_opponents():
    return jsonify(get_top_opponents(int(request.args.get('attacker_id'))))

@app.route('/get-upgrades')
def get_upgrades():
    upgrades_path = os.path.join(os.path.dirname(__file__), 'static', 'images', 'Upgrades')
    upgrades = [f for f in os.listdir(upgrades_path) if f.endswith('.png')]
    return jsonify(upgrades)

@app.route('/upgrades/<path:filename>')
def serve_upgrade(filename):
    return send_from_directory('static/images/Upgrades', filename)

@app.route('/get-civ-restrictions')
def get_civ_restrictions_route():
    civ = request.args.get('civ')
    if not civ:
        return jsonify([])
    restrictions = get_civ_restrictions(civ)
    return jsonify(restrictions)

@app.route('/get-unit-upgrades', methods=['GET'])
def get_unit_upgrades():
    unit_id = int(request.args.get('unit_id'))
    df = pd.read_excel(os.path.join(os.path.dirname(__file__), 'static', 'UNITS.xlsx'), 
                       usecols="A:H",  # Include the UPGRADES column
                       names=['UNIT_ID', 'NAME', 'BUILDING', 'CIV', 'SORTING', 'EXCLUDE', 'INCLUDE', 'UPGRADES'])
    unit_row = df[df['UNIT_ID'] == unit_id]
    if unit_row.empty:
        return jsonify([])
    upgrades = unit_row.iloc[0]['UPGRADES']
    if pd.isna(upgrades):
        return jsonify([])
    return jsonify([u.strip() for u in upgrades.split(';') if u.strip()])

#if __name__ == "__main__":
#   app.run(host='0.0.0.0', port=5000, debug=True)