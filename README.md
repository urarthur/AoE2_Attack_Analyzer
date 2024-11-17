# Age of Empires II Attack Analyzer

A comprehensive web application for analyzing unit matchups and damage calculations in Age of Empires II: Definitive Edition.

## Features

- **Unit vs Unit Analysis**: Calculate detailed damage outputs between any two units in the game
- **Civilization-Specific Calculations**: Takes into account civilization bonuses and tech tree restrictions
- **Upgrade System**: Interactive upgrade selection with visual feedback
  - Blacksmith upgrades
  - Unique technology effects #not yet implemented 
  - Civilization-specific limitations
- **Advanced Statistics**:
  - Base attack and armor values
  - Bonus damage calculations
  - Net damage output with upgrades
- **Counter Unit Suggestions**: View best counter units for any selected unit
- **Battle Information**: Comprehensive breakdown of combat statistics
- **Building-Specific Unit Lists**: Organized unit selection by production building

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aoe2-attack-analyzer.git
cd aoe2-attack-analyzer
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

This repo uses the full.json extracted HSZemi. Place the full.json from the link below in the devops/data folder
 https://github.com/HSZemi/aoe2dat/tree/master/data

## Usage

1. Select an attacking unit:
   - Choose a civilization
   - Select a building
   - Pick a unit

2. Select a defending unit:
   - Follow the same process as above

3. View the analysis:
   - Base damage calculations
   - Bonus damage
   - Armor values
   - Net damage output

4. Adjust upgrades:
   - Toggle Blacksmith upgrades
   - Apply unique technologies # not implemented yet
   - See real-time damage updates


## License

This project was created under Microsoft's "Game Content Usage Rules" using assets from Age of Empires II. It is not endorsed by or affiliated with Microsoft.

## Acknowledgments

- Age of Empires II © Microsoft Corporation
- Thanks to the AoE2 community for their support and feedback
- Special thanks to all contributors

## Version

Current version: Age of Empires II DE Update 127161

## Contact

For bugs, feature requests, or other issues, please file an issue on the GitHub repository.

