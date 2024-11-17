const buildings = [
    'BARRACKS',
    'STABLE',
    'ARCHERY_RANGE',
    'SIEGE_WORKSHOP',
    'CASTLE',
    'DOCK',
    'MONASTERY',
    'MARKET',
    'TOWN_CENTER' // Moved to the last position
];

const civilizations = [
    'Aztecs', 'Vietnamese', 'Berbers', 'Bohemians', 'Britons',
    'Bulgarians', 'Burgundians', 'Burmese', 'Byzantines', 'Celts',
    'Chinese', 'Cumans', 'Ethiopians', 'Franks', 'Goths', 'Huns',
    'Incas', 'Italians', 'Japanese', 'Khmer', 'Koreans', 'Lithuanians',
    'Magyars', 'Malay', 'Malians', 'Mayans', 'Mongols', 'Persians',
    'Poles', 'Portuguese', 'Saracens', 'Sicilians', 'Slavs', 'Spanish',
    'Tatars', 'Teutons', 'Turks', 'Vikings', 'Bengalis', 'Armenians',
    'Dravidians', 'Hindustanis', 'Gurjaras', 'Romans', 'Georgians'
].sort();

let currentSelector = '';
let selectedBuilding = '';
let isDefenderMode = false;
let selectedCiv = '';
let selectedAttacker = null;
let selectedDefender = null;
let attackerCiv = ''; // Add this at the top with other global variables
let defenderCiv = ''; // Add this at the top with other global variables

function formatBuildingName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function openSelector(type) {
    currentSelector = type;
    isDefenderMode = type === 'defender';
    showCivSelector();
}

function showCivSelector() {
    const container = document.getElementById('civ-options');
    const sortedCivs = civilizations.sort((a, b) => a.localeCompare(b));
    container.innerHTML = sortedCivs.map(civ => `
        <div class="civ-option" onclick="selectCiv('${civ}')">
            <img src="/static/images/Emblems/${civ.toLowerCase()}_emblem.png" 
                 class="civ-emblem"
                 onerror="this.style.display='none'" 
                 alt="${civ} emblem">
            <span class="civ-name">${civ}</span>
        </div>
    `).join('');

    openPopup('civ-selector');
}

function selectCiv(civilization) {
    selectedCiv = civilization;
    if (isDefenderMode) {
        defenderCiv = civilization;
    } else {
        attackerCiv = civilization;
    }
    closePopup('civ-selector');
    showBuildingSelector();
}

function showBuildingSelector() {
    const title = document.getElementById('selector-title');
    title.textContent = `Select Building`;

    const container = document.getElementById('building-options');
    container.innerHTML = buildings.map(building => `
        <div class="building-option" onclick="selectBuilding('${building}')">
            <img src="/static/images/Buildings/${building.toLowerCase()}.png" 
                 onerror="this.style.display='none'" 
                 alt="${formatBuildingName(building)}">
            ${formatBuildingName(building)}
        </div>
    `).join('');

    openPopup('building-selector');
}

function selectBuilding(buildingName) {
    selectedBuilding = buildingName;
    closePopup('building-selector');
    fetchUnits(buildingName, isDefenderMode, selectedCiv);
}

function openPopup(id) {
    document.getElementById(id).style.display = 'flex';
}

function closePopup(id) {
    document.getElementById(id).style.display = 'none';
}

function fetchUnits(buildingName, isDefender, civilization) {
    fetch(`/get-units?building=${encodeURIComponent(buildingName)}&civ=${encodeURIComponent(civilization)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                displayUnits(`Error: ${data.error}`);
            } else if (!data.units || data.units.length === 0) {
                displayUnits(`No units available for ${formatBuildingName(buildingName)}`);
            } else {
                let filteredUnits = data.units;

                if (buildingName === 'CASTLE') {
                    filteredUnits = data.units.filter(unit =>
                        unit.CIV.toUpperCase() === civilization.toUpperCase() ||
                        (civilization.toUpperCase() !== 'GENERIC' && unit.CIV.toUpperCase() === 'GENERIC')
                    );

                    // Adjust the sorting logic here
                    filteredUnits.sort((a, b) => {
                        const civ = civilization.trim().toUpperCase();

                        function stripElitePrefix(unitName) {
                            return unitName.replace(/^ELITE[_ ]/i, '').trim();
                        }

                        function isEliteUnit(unitName) {
                            return /^ELITE[_ ]/i.test(unitName);
                        }

                        function getPriority(unit) {
                            const unitName = unit.NAME.trim().toUpperCase();
                            const unitCiv = unit.CIV.trim().toUpperCase();

                            if (unitName === 'TREBUCHET') return 1;
                            if (unitName === 'PETARD') return 2;
                            if (unitCiv === civ) {
                                if (isEliteUnit(unitName)) return 4;  // Elite unique units
                                else return 3;  // Standard unique units
                            }
                            return 5; // Other units
                        }

                        const priorityA = getPriority(a);
                        const priorityB = getPriority(b);

                        if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                        } else {
                            // If both units have the same priority, sort by base name
                            const baseNameA = stripElitePrefix(a.NAME.trim().toUpperCase());
                            const baseNameB = stripElitePrefix(b.NAME.trim().toUpperCase());

                            if (baseNameA === baseNameB) {
                                // Place standard unit before Elite unit
                                if (isEliteUnit(a.NAME)) return 1;
                                if (isEliteUnit(b.NAME)) return -1;
                            }
                            return baseNameA.localeCompare(baseNameB);
                        }
                    });
                }

                displayUnits(filteredUnits);
            }
            openPopup('units-popup');
        })
        .catch(error => {
            console.error('Fetch error:', error);
            displayUnits(`Error: ${error.message}`);
            openPopup('units-popup');
        });
}

function selectUnit(element) {
    const unit = JSON.parse(element.getAttribute('data-unit'));
    const boxId = isDefenderMode ? 'defender-box' : 'attacker-box';
    const box = document.getElementById(boxId);
    const currentCiv = isDefenderMode ? defenderCiv : attackerCiv;
    
    // Store the selected unit ID in the data attribute
    box.setAttribute('data-unit-id', unit.UNIT_ID);
    
    // Create HTML content with emblem container
    box.innerHTML = `
        <div class="civ-emblem-container ${selectedAttacker && selectedDefender ? 'show' : ''}">
            <img src="/static/images/Emblems/${currentCiv.toLowerCase()}_emblem.png" 
                 alt="${currentCiv} emblem">
        </div>
        <div style="display: flex; flex-direction: column; align-items: center;">
            <img src="/static/images/Units/${unit.UNIT_ID}.png" alt="${unit.NAME}" style="width: 80px; height: 80px; margin-bottom: 10px;">
            <span style="font-size: 1.1em;">${unit.NAME.replace(/_/g, ' ')}</span>
        </div>
    `;
    closePopup('units-popup');
    closePopup('building-selector');
    closePopup('civ-selector');

    if (isDefenderMode) {
        selectedDefender = unit.UNIT_ID;
        document.getElementById('right-panel').style.display = 'flex';
        fetchCounterUnitDetails(selectedDefender);
    } else {
        selectedAttacker = unit.UNIT_ID;
        document.getElementById('left-panel').style.display = 'flex';
        // Always show top opponents table when attacker is selected
        const container = document.getElementById('counter-unit-details');
        container.innerHTML = `
            <div class="counter-unit-container">
                <div class="counter-unit-panel" style="text-align: left;">
                    <h2 id="top-opponents-title"></h2>
                    <table class="counter-unit-table">
                        <thead>
                            <tr>
                                <th>STRONG vs.</th> <!-- Changed from 'Name' to 'STRONG vs.' -->
                                <th>Net Attack</th>
                            </tr>
                        </thead>
                        <tbody id="top-opponents-body">
                        </tbody>
                    </table>
                </div>
                ${selectedDefender ? '<div id="counter-units-panel"></div>' : ''}
            </div>
        `;
        fetchTopOpponents(unit.UNIT_ID);
        
        // If defender is already selected, fetch counter units
        if (selectedDefender) {
            fetchCounterUnitDetails(selectedDefender);
        }
    }

    // Show the switch button
    if (selectedAttacker && selectedDefender) {
        document.querySelector('.switch-box').style.display = 'flex';
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
    } else {
        // Hide the switch button if one of the units is not selected
        document.querySelector('.switch-box').style.display = 'none';
    }

    fetchUnitDetails(unit.UNIT_ID, isDefenderMode); // Fetch and log unit details

    // Show the respective panel
    if (isDefenderMode) {
        document.getElementById('right-panel').style.display = 'flex';
    } else {
        document.getElementById('left-panel').style.display = 'flex';
    }

    if (selectedAttacker && selectedDefender) {
        // Show upgrades panel when both units are selected
        document.getElementById('upgrades-panel').style.display = 'block';
        loadUpgrades();
    }

    // Show/hide emblems based on both units being selected
    updateEmblemVisibility();
}

// Add this new function to handle emblem visibility
function updateEmblemVisibility() {
    const attackerEmblem = document.querySelector('#attacker-box .civ-emblem-container');
    const defenderEmblem = document.querySelector('#defender-box .civ-emblem-container');
    
    if (attackerEmblem && defenderEmblem) {
        const shouldShow = selectedAttacker && selectedDefender;
        attackerEmblem.classList.toggle('show', shouldShow);
        defenderEmblem.classList.toggle('show', shouldShow);
    }
}

function fetchCounterUnitDetails(unitId) {
    fetch(`/get-counter-unit-details?unit_id=${unitId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Counter unit details:', data);
            displayCounterUnitDetails(data);
        })
        .catch(error => {
            console.error('Error fetching counter unit details:', error);
        });
}

function displayCounterUnitDetails(details) {
    const container = document.getElementById('counter-unit-details');
    if (details.error) {
        container.innerHTML = `<p class="error-message">${details.error}</p>`;
        return;
    }

    const defenderName = document.querySelector('#defender-box span')?.textContent || 
                       document.querySelector('#defender-box img')?.alt || 
                       'Selected Unit';

    let content = '<div class="counter-unit-container">';
    
    // Add top opponents table if attacker is selected
    if (selectedAttacker) {
        content += `
            <div class="counter-unit-panel">
                <h2 id="top-opponents-title"></h2>
                <table class="counter-unit-table">
                    <thead>
                        <tr>
                            <th>STRONG vs.</th> <!-- Changed from 'Name' to 'STRONG vs.' -->
                            <th>Net Attack</th>
                        </tr>
                    </thead>
                    <tbody id="top-opponents-body">
                    </tbody>
                </table>
            </div>
        `;
    }

    // Modify the layout to center the title and align checkbox and ? icon to the right
    content += `
        <div class="counter-unit-panel" style="margin-left: ${selectedAttacker ? 'auto' : '0'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <!-- Removed empty div for spacing -->
                <h2 style="text-align: center; flex: 1;">${defenderName.replace(/_/g, ' ')}</h2>
                <div>
                    <input type="checkbox" id="excludeSiege" checked>
                    <span class="tooltip-icon" data-tooltip="Exclude Siege & Dock Units">?</span>
                </div>
            </div>
            <table class="counter-unit-table">
                <thead>
                    <tr>
                        <th>WEAK vs.</th> <!-- Changed from 'Name' to 'WEAK vs.' -->
                        <th>Net Attack</th>
                    </tr>
                </thead>
                <tbody id="counterUnitsBody">
                    ${getFilteredUnits(details)}
                </tbody>
            </table>
        </div>
    `;
    content += '</div>';
    
    container.innerHTML = content;

    // Re-fetch the top opponents data if there's an attacker
    if (selectedAttacker) {
        fetchTopOpponents(selectedAttacker);
    }

    // Add event listener for checkbox
    document.getElementById('excludeSiege')?.addEventListener('change', function() {
        const tbody = document.getElementById('counterUnitsBody');
        tbody.innerHTML = getFilteredUnits(details);
    });
}

function getFilteredUnits(details) {
    const excludeSiege = document.getElementById('excludeSiege')?.checked ?? true;
    const filteredDetails = details
        .filter(unit => !excludeSiege || unit["Siege and Other"] === false)
        .sort((a, b) => b["Net Damage"] - a["Net Damage"])
        .slice(0, 20); // Limit to 20 units

    return filteredDetails.map(unit => `
        <tr>
            <td>${formatUnitName(unit.Name)}</td>
            <td>${unit["Net Damage"]}</td>
        </tr>
    `).join('');
}

function fetchUnitDetails(unitId, isDefender) {
    fetch(`/get-unit-details?unit_id=${unitId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit details:', data);
            displayUnitStats(data, isDefender);
            if (isDefender) {
                fetchUnitArmours(unitId); // Fetch armour details for defender
            } else {
                fetchUnitAttacks(unitId, isDefender); // Fetch attack details for attacker
            }
        })
        .catch(error => {
            console.error('Error fetching unit details:', error);
        });
}

function fetchUnitArmours(unitId) {
    fetch(`/get-unit-armours?unit_id=${unitId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit armours:', data);
            displayUnitArmours(data);
        })
        .catch(error => {
            console.error('Error fetching unit armours:', error);
        });
}

function displayUnitArmours(armourDetails) {
    const unitStatsContent = document.getElementById('defender-stats-content');
    if (armourDetails.error) {
        unitStatsContent.innerHTML += `<p class="error-message">${armourDetails.error}</p>`;
        return;
    }

    // Show all armour classes, including those with zero values
    const armours = armourDetails.map(armour => `
        <div class="unit-stats-item">
            <strong>${armour["Armour Class Name"]}:</strong> ${armour["Armour Amount"]}
        </div>
    `).join('');

    unitStatsContent.innerHTML += `
        <h2 style="margin-top: 40px;">Armour Classes</h2> <!-- Rename to Armour Classes -->
        <div class="unit-stats-grid">
            ${armours}
        </div>
    `;
}

function fetchUnitAttacks(unitId, isDefender) {
    fetch(`/get-unit-attacks?unit_id=${unitId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit attacks:', data);
            displayUnitAttacks(data, isDefender);
        })
        .catch(error => {
            console.error('Error fetching unit attacks:', error);
        });
}

function displayUnitStats(unitDetails, isDefender) {
    const unitStatsContent = document.getElementById(isDefender ? 'defender-stats-content' : 'attacker-stats-content');
    if (unitDetails.error) {
        unitStatsContent.innerHTML = `<p class="error-message">${unitDetails.error}</p>`;
        return;
    }

    const cost = [];
    if (unitDetails.cost.wood > 0) cost.push(`<img src="/static/images/Other/wood.png" alt="Wood" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.wood}`);
    if (unitDetails.cost.food > 0) cost.push(`<img src="/static/images/Other/food.png" alt="Food" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.food}`);
    if (unitDetails.cost.gold > 0) cost.push(`<img src="/static/images/Other/gold.png" alt="Gold" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.gold}`);
    if (unitDetails.cost.stone > 0) cost.push(`<img src="/static/images/Other/stone.png" alt="Stone" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.stone}`);

    unitStatsContent.innerHTML = `
        <div class="unit-stats-grid">
            <div class="unit-stats-item"><strong>Cost:</strong> ${cost.join(', ')}</div>
            <div class="unit-stats-item"><strong>Attack:</strong> ${unitDetails.attack}</div>
            <div class="unit-stats-item"><strong>Melee Armor:</strong> ${unitDetails.melee_armor}</div>
            <div class="unit-stats-item"><strong>Pierce Armor:</strong> ${unitDetails.pierce_armor}</div>
            <div class="unit-stats-item"><strong>Hit Points:</strong> ${unitDetails.hit_points}</div>
        </div>
    `;
}

function displayUnitAttacks(attackDetails, isDefender) {
    const unitStatsContent = document.getElementById(isDefender ? 'defender-stats-content' : 'attacker-stats-content');
    if (attackDetails.error) {
        unitStatsContent.innerHTML += `<p class="error-message">${attackDetails.error}</p>`;
        return;
    }

    // Separate base attacks and other attacks
    const baseAttacks = attackDetails.filter(attack => 
        attack["Attack Class Name"] === "Base Pierce" || attack["Attack Class Name"] === "Base Melee"
    );
    const otherAttacks = attackDetails.filter(attack => 
        attack["Attack Class Name"] !== "Base Pierce" && 
        attack["Attack Class Name"] !== "Base Melee" &&
        attack["Attack Class Name"] !== "Cavalry Resistance"
    );

    // Sort attacks by amount, placing 0 values at the bottom
    const sortedAttacks = [...baseAttacks, ...otherAttacks].sort((a, b) => b["Attack Amount"] - a["Attack Amount"]);

    const attacks = sortedAttacks.map(attack => `
        <div class="unit-stats-item" style="word-wrap: break-word; white-space: normal;">
            <strong>${attack["Attack Class Name"]}:</strong> ${attack["Attack Amount"]}
        </div>
    `).join('');

    unitStatsContent.innerHTML += `
        <h2 style="margin-top: 40px;">Base & Bonus Attack</h2>
        <div class="unit-stats-grid">
            ${attacks}
        </div>
    `;
}

function displayUnits(unitsData) {
    const unitsBox = document.getElementById('units-box');
    
    if (typeof unitsData === 'string') {
        unitsBox.innerHTML = `<p class="error-message">${unitsData}</p>`;
        return;
    }

    // Group units by the integer part of their SORTING value
    const groupedUnits = {};
    unitsData.forEach(unit => {
        const columnNumber = Math.floor(unit.SORTING);
        if (!groupedUnits[columnNumber]) {
            groupedUnits[columnNumber] = [];
        }
        groupedUnits[columnNumber].push(unit);
    });

    // Sort units within each group by their SORTING value
    Object.keys(groupedUnits).forEach(key => {
        groupedUnits[key].sort((a, b) => a.SORTING - b.SORTING);
    });

    // Create the grid with columns
    const columns = Object.keys(groupedUnits).sort((a, b) => a - b)
        .map(columnNumber => {
            const units = groupedUnits[columnNumber];
            return `
                <div class="units-column">
                    ${units.map(unit => `
                        <div class="unit-card" 
                             onclick="${unit.isExcluded ? '' : `selectUnit(this)`}" 
                             data-unit='${JSON.stringify(unit)}'>
                            <div class="unit-icon">
                                <img src="/images/${unit.UNIT_ID}.png" 
                                     onerror="this.style.display='none'" 
                                     alt="${unit.NAME}">
                                ${unit.isExcluded ? '<div class="unit-excluded">×</div>' : ''}
                            </div>
                            <div class="unit-content">
                                <div class="unit-name">${unit.NAME.replace(/_/g, ' ')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

    unitsBox.innerHTML = `
        <div class="units-grid" style="grid-template-columns: repeat(${Object.keys(groupedUnits).length}, 1fr);">
            ${columns}
        </div>
    `;
}

function switchUnits() {
    const attackerBox = document.getElementById('attacker-box');
    const defenderBox = document.getElementById('defender-box');
    
    if (attackerBox.querySelector('img') && defenderBox.querySelector('img')) {
        // Store the current unit IDs
        const oldAttackerId = selectedAttacker;
        const oldDefenderId = selectedDefender;
        
        // Swap the HTML content
        const attackerContent = attackerBox.innerHTML;
        const defenderContent = defenderBox.innerHTML;
        attackerBox.innerHTML = defenderContent;
        defenderBox.innerHTML = attackerContent;
        
        // Swap the selected unit IDs
        selectedAttacker = oldDefenderId;
        selectedDefender = oldAttackerId;
        
        // Re-run all necessary operations
        fetchUnitDetails(selectedAttacker, false); // For attacker
        fetchUnitDetails(selectedDefender, true);  // For defender
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
        fetchCounterUnitDetails(selectedDefender); // Add this line to fetch counter unit details
    }

    if (selectedAttacker && selectedDefender) {
        document.getElementById('upgrades-panel').style.display = 'block';
        loadUpgrades();
    }

    // After swapping the units, update the emblem visibility
    updateEmblemVisibility();
}

function fetchUnitVsUnitData(attackerId, defenderId) {
    fetch(`/get-unit-vs-unit?attacker_id=${attackerId}&defender_id=${defenderId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit vs Unit data:', data); // Add logging
            displayUnitVsUnitData(data);
            // Fetch defender stats to get the armour details
            fetch(`/get-unit-details?unit_id=${defenderId}`)
                .then(response => response.json())
                .then(defenderData => {
                    console.log('Defender details:', defenderData); // Add logging
                    displayDefenderArmour(data, defenderData);
                })
                .catch(error => {
                    console.error('Error fetching defender details:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching unit vs unit data:', error);
        });
}

function displayUnitVsUnitData(data) {
    const panel = document.getElementById('unit-vs-unit-panel');
    const content = document.getElementById('unit-vs-unit-content');

    if (data.error) {
        content.innerHTML = `<p class="error-message">${data.error}</p>`;
        return;
    }

    // Determine if attacker uses pierce or melee attack
    const hasBasePierce = data.matching_classes.some(cls => 
        cls["Attack Class Name"] === "Base Pierce" && cls["Attack Amount"] !== 0
    );
    
    // Calculate upgrades
    const attackUpgradeBonus = hasBasePierce ? countPierceAttackUpgrades() : countMeleeAttackUpgrades();
    const armorUpgradeBonus = calculateDefenderArmorUpgrades(hasBasePierce);
    const armorType = hasBasePierce ? "Pierce Armor" : "Melee Armor";

    // Separate base attacks and bonus attacks
    const baseAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] === "Base Pierce" || 
        cls["Attack Class Name"] === "Base Melee"
    );

    const bonusAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] !== "Base Pierce" && 
        cls["Attack Class Name"] !== "Base Melee" &&
        cls["Attack Amount"] !== 0
    );

    // Calculate base attack total
    const baseAttackTotal = baseAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);
    
    // Calculate bonus attack total
    const bonusAttackTotal = bonusAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);

    // Generate HTML sections
    const baseAttacksHTML = baseAttacks.map(cls => `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span style="color: #fff;">${cls["Attack Class Name"]}:</span>
            <span style="color: #00ff00; margin-left: 10px;">${cls["Attack Amount"]}</span>
        </div>
    `).join('');

    const bonusAttacksHTML = bonusAttacks.length > 0 ? `
        <h3 style="color: #ffd700; margin: 10px 0; text-align: left;">Bonus Damage</h3>
        ${bonusAttacks.map(cls => `
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span style="color: #fff;">${cls["Attack Class Name"]}:</span>
                <span style="color: #00ff00; margin-left: 10px;">${cls["Attack Amount"]}</span>
            </div>
        `).join('')}
    ` : '';

    // Fetch defender stats to get base armor value
    fetch(`/get-unit-details?unit_id=${selectedDefender}`)
        .then(response => response.json())
        .then(defenderData => {
            const baseArmorValue = hasBasePierce ? 
                defenderData.pierce_armor : 
                defenderData.melee_armor;
            
            // Calculate total armor including upgrades
            const totalArmorValue = baseArmorValue + armorUpgradeBonus;

            // Calculate total net attack (minimum 1)
            // (Base attack + Attack upgrades) + Bonus attack - (Base armor + Armor upgrades)
            const totalNetAttack = Math.max(1, 
                (baseAttackTotal + attackUpgradeBonus) + 
                bonusAttackTotal - 
                totalArmorValue
            );

            content.innerHTML = `
                <h3 style="color: #ffd700; margin-bottom: 10px; text-align: left;">Attack</h3>
                ${baseAttacksHTML}
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">Attack Upgrades:</span>
                    <span style="color: #00ff00; margin-left: 10px;">${attackUpgradeBonus}</span>
                </div>
                ${bonusAttacksHTML}
                <h3 style="color: #ffd700; margin: 10px 0; text-align: left;">Opponent Armour</h3>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">${armorType}:</span>
                    <span style="color: #ff4444; margin-left: 10px;">${baseArmorValue}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">Armour Upgrades:</span>
                    <span style="color: #ff4444; margin-left: 10px;">${armorUpgradeBonus}</span>
                </div>
                <div style="margin-top: 15px; background-color: rgba(0, 0, 0, 0.5); padding: 10px; border-radius: 5px; border: 1px solid rgba(255, 215, 0, 0.3);">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ffd700; font-weight: bold; font-size: 1.1em;">Total Net Attack:</span>
                        <span style="color: #00ff00; font-weight: bold; font-size: 1.1em; margin-left: 10px;">${totalNetAttack}</span>
                    </div>
                </div>
            `;
        });

    panel.style.display = 'block';
}

function displayUnits(unitsData) {
    const unitsBox = document.getElementById('units-box');
    
    if (typeof unitsData === 'string') {
        unitsBox.innerHTML = `<p class="error-message">${unitsData}</p>`;
        return;
    }

    // Group units by the integer part of their SORTING value
    const groupedUnits = {};
    unitsData.forEach(unit => {
        const columnNumber = Math.floor(unit.SORTING);
        if (!groupedUnits[columnNumber]) {
            groupedUnits[columnNumber] = [];
        }
        groupedUnits[columnNumber].push(unit);
    });

    // Sort units within each group by their SORTING value
    Object.keys(groupedUnits).forEach(key => {
        groupedUnits[key].sort((a, b) => a.SORTING - b.SORTING);
    });

    // Create the grid with columns
    const columns = Object.keys(groupedUnits).sort((a, b) => a - b)
        .map(columnNumber => {
            const units = groupedUnits[columnNumber];
            return `
                <div class="units-column">
                    ${units.map(unit => `
                        <div class="unit-card" 
                             onclick="${unit.isExcluded ? '' : `selectUnit(this)`}" 
                             data-unit='${JSON.stringify(unit)}'>
                            <div class="unit-icon">
                                <img src="/images/${unit.UNIT_ID}.png" 
                                     onerror="this.style.display='none'" 
                                     alt="${unit.NAME}">
                                ${unit.isExcluded ? '<div class="unit-excluded">×</div>' : ''}
                            </div>
                            <div class="unit-content">
                                <div class="unit-name">${unit.NAME.replace(/_/g, ' ')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

    unitsBox.innerHTML = `
        <div class="units-grid" style="grid-template-columns: repeat(${Object.keys(groupedUnits).length}, 1fr);">
            ${columns}
        </div>
    `;
}

function switchUnits() {
    const attackerBox = document.getElementById('attacker-box');
    const defenderBox = document.getElementById('defender-box');
    
    if (attackerBox.querySelector('img') && defenderBox.querySelector('img')) {
        // Store the current unit IDs
        const oldAttackerId = selectedAttacker;
        const oldDefenderId = selectedDefender;
        
        // Swap the HTML content
        const attackerContent = attackerBox.innerHTML;
        const defenderContent = defenderBox.innerHTML;
        attackerBox.innerHTML = defenderContent;
        defenderBox.innerHTML = attackerContent;
        
        // Swap the selected unit IDs
        selectedAttacker = oldDefenderId;
        selectedDefender = oldAttackerId;
        
        // Re-run all necessary operations
        fetchUnitDetails(selectedAttacker, false); // For attacker
        fetchUnitDetails(selectedDefender, true);  // For defender
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
        fetchCounterUnitDetails(selectedDefender); // Add this line to fetch counter unit details
    }

    if (selectedAttacker && selectedDefender) {
        document.getElementById('upgrades-panel').style.display = 'block';
        loadUpgrades();
    }

    // After swapping the units, update the emblem visibility
    updateEmblemVisibility();
}

function fetchUnitVsUnitData(attackerId, defenderId) {
    fetch(`/get-unit-vs-unit?attacker_id=${attackerId}&defender_id=${defenderId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit vs Unit data:', data); // Add logging
            displayUnitVsUnitData(data);
            // Fetch defender stats to get the armour details
            fetch(`/get-unit-details?unit_id=${defenderId}`)
                .then(response => response.json())
                .then(defenderData => {
                    console.log('Defender details:', defenderData); // Add logging
                    displayDefenderArmour(data, defenderData);
                })
                .catch(error => {
                    console.error('Error fetching defender details:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching unit vs unit data:', error);
        });
}

function displayUnitVsUnitData(data) {
    const panel = document.getElementById('unit-vs-unit-panel');
    const content = document.getElementById('unit-vs-unit-content');

    if (data.error) {
        content.innerHTML = `<p class="error-message">${data.error}</p>`;
        return;
    }

    // Determine if attacker uses pierce or melee attack
    const hasBasePierce = data.matching_classes.some(cls => 
        cls["Attack Class Name"] === "Base Pierce" && cls["Attack Amount"] !== 0
    );
    
    // Calculate upgrades
    const attackUpgradeBonus = hasBasePierce ? countPierceAttackUpgrades() : countMeleeAttackUpgrades();
    const armorUpgradeBonus = calculateDefenderArmorUpgrades(hasBasePierce);
    const armorType = hasBasePierce ? "Pierce Armor" : "Melee Armor";

    // Separate base attacks and bonus attacks
    const baseAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] === "Base Pierce" || 
        cls["Attack Class Name"] === "Base Melee"
    );

    const bonusAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] !== "Base Pierce" && 
        cls["Attack Class Name"] !== "Base Melee" &&
        cls["Attack Amount"] !== 0
    );

    // Calculate base attack total
    const baseAttackTotal = baseAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);
    
    // Calculate bonus attack total
    const bonusAttackTotal = bonusAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);

    // Generate HTML sections
    const baseAttacksHTML = baseAttacks.map(cls => `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span style="color: #fff;">${cls["Attack Class Name"]}:</span>
            <span style="color: #00ff00; margin-left: 10px;">${cls["Attack Amount"]}</span>
        </div>
    `).join('');

    const bonusAttacksHTML = bonusAttacks.length > 0 ? `
        <h3 style="color: #ffd700; margin: 10px 0; text-align: left;">Bonus Damage</h3>
        ${bonusAttacks.map(cls => `
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span style="color: #fff;">${cls["Attack Class Name"]}:</span>
                <span style="color: #00ff00; margin-left: 10px;">${cls["Attack Amount"]}</span>
            </div>
        `).join('')}
    ` : '';

    // Fetch defender stats to get base armor value
    fetch(`/get-unit-details?unit_id=${selectedDefender}`)
        .then(response => response.json())
        .then(defenderData => {
            const baseArmorValue = hasBasePierce ? 
                defenderData.pierce_armor : 
                defenderData.melee_armor;
            
            // Calculate total armor including upgrades
            const totalArmorValue = baseArmorValue + armorUpgradeBonus;

            // Calculate total net attack (minimum 1)
            // (Base attack + Attack upgrades) + Bonus attack - (Base armor + Armor upgrades)
            const totalNetAttack = Math.max(1, 
                (baseAttackTotal + attackUpgradeBonus) + 
                bonusAttackTotal - 
                totalArmorValue
            );

            content.innerHTML = `
                <h3 style="color: #ffd700; margin-bottom: 10px; text-align: left;">Attack</h3>
                ${baseAttacksHTML}
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">Attack Upgrades:</span>
                    <span style="color: #00ff00; margin-left: 10px;">${attackUpgradeBonus}</span>
                </div>
                ${bonusAttacksHTML}
                <h3 style="color: #ffd700; margin: 10px 0; text-align: left;">Opponent Armour</h3>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">${armorType}:</span>
                    <span style="color: #ff4444; margin-left: 10px;">${baseArmorValue}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">Armour Upgrades:</span>
                    <span style="color: #ff4444; margin-left: 10px;">${armorUpgradeBonus}</span>
                </div>
                <div style="margin-top: 15px; background-color: rgba(0, 0, 0, 0.5); padding: 10px; border-radius: 5px; border: 1px solid rgba(255, 215, 0, 0.3);">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ffd700; font-weight: bold; font-size: 1.1em;">Total Net Attack:</span>
                        <span style="color: #00ff00; font-weight: bold; font-size: 1.1em; margin-left: 10px;">${totalNetAttack}</span>
                    </div>
                </div>
            `;
        });

    panel.style.display = 'block';
}

// Add this helper function to calculate total with upgrades
function calculateTotalWithUpgrades(baseTotal, upgradeCount) {
    // Calculate raw total with upgrades
    const rawTotal = Math.max(1, baseTotal + upgradeCount);
    return rawTotal;
}

// Add this new function to count pierce attack upgrades
function countPierceAttackUpgrades() {
    const grid = document.getElementById('attacker-upgrades-grid');
    let count = 0;
    
    // Check each pierce attack upgrade (a1 through a4)
    for (let i = 1; i <= 4; i++) {
        const upgrade = grid.querySelector(`[data-position="a${i}"]`);
        if (upgrade && upgrade.classList.contains('selected')) {
            count++;
        }
    }

    // Add Logistica bonus for specific units
    const d4 = grid.querySelector('[data-position="d4"]');
    if (d4 && d4.classList.contains('selected') && selectedDefender) {
        const defenderUnitId = parseInt(selectedDefender);
        if ([93, 358, 359].includes(defenderUnitId)) {
            count += 2; // Add +2 attack when attacking Spearman-line units
        }
    }

    return count;
}

// Update the updateUnitVsUnitUpgrades function
function updateUnitVsUnitUpgrades() {
    const content = document.getElementById('unit-vs-unit-content');
    if (!content) return;

    // Get all attack-related divs
    const attackDivs = Array.from(content.querySelectorAll('div'));
    const baseMeleeIndex = attackDivs.findIndex(div => 
        div.textContent.includes('Base Melee:')
    );
    const basePierceIndex = attackDivs.findIndex(div => 
        div.textContent.includes('Base Pierce:')
    );

    let upgradeBonus = 0;
    let baseAttackValue = 0;
    let armorType = '';

    // Determine attack type and calculate appropriate upgrade bonus
    if (baseMeleeIndex !== -1) {
        baseAttackValue = parseInt(attackDivs[baseMeleeIndex].querySelector('span:last-child').textContent);
        upgradeBonus = countMeleeAttackUpgrades();
        armorType = 'Melee Armor:';
    } else if (basePierceIndex !== -1) {
        baseAttackValue = parseInt(attackDivs[basePierceIndex].querySelector('span:last-child').textContent);
        upgradeBonus = countPierceAttackUpgrades();
        armorType = 'Pierce Armor:';
    }

    // Update attack upgrades display while preserving styling
    const upgradesDiv = attackDivs.find(div => div.textContent.includes('Attack Upgrades:'));
    if (upgradesDiv) {
        const valueSpan = upgradesDiv.querySelector('span:last-child');
        valueSpan.textContent = upgradeBonus;
    }

    // Get armor value
    const armorDiv = attackDivs.find(div => div.textContent.includes(armorType));
    const armorValue = armorDiv ? parseInt(armorDiv.querySelector('span:last-child').textContent) : 0;

    // Calculate new total
    const newTotal = Math.max(1, (baseAttackValue + upgradeBonus) - armorValue);

    // Update Total Net Attack while preserving styling
    const totalAttackDiv = content.querySelector('div[style*="background-color"]');
    if (totalAttackDiv) {
        const totalValueSpan = totalAttackDiv.querySelector('span:last-child');
        totalValueSpan.textContent = newTotal;
    }
}

function formatUnitName(name) {
    return name.replace(/_/g, ' ');
}

function fetchTopOpponents(attackerId) {
    fetch(`/get-top-opponents?attacker_id=${attackerId}`)
        .then(response => response.json())
        .then(data => {
            const attackerName = document.querySelector('#attacker-box span')?.textContent || 
                               document.querySelector('#attacker-box img')?.alt || 
                               'Selected Unit';
            
            document.getElementById('top-opponents-title').textContent = 
                `${formatUnitName(attackerName)}`;

            const tbody = document.getElementById('top-opponents-body');
            if (Array.isArray(data)) {
                tbody.innerHTML = data.map(opponent => `
                    <tr>
                        <td>${formatUnitName(opponent.name)}</td>
                        <td>${opponent.total_attack}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="2">No data available</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching top opponents:', error);
        });
}

function displayTopOpponentsTable() {
    const container = document.getElementById('counter-unit-details');
    container.innerHTML = `
        <div class="counter-unit-container">
            <div class="counter-unit-panel" style="text-align: left;">
                <h2 id="top-opponents-title"></h2>
                <table class="counter-unit-table">
                    <thead>
                        <tr>
                            <th>STRONG vs.</th> <!-- Changed from 'Name' to 'STRONG vs.' -->
                            <th>Net Attack</th>
                        </tr>
                    </thead>
                    <tbody id="top-opponents-body">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Add this function to handle icon selection
function toggleUpgradeSelection(element, isDefender = false) {
    if (element.classList.contains('upgrade-restricted')) {
        return;
    }

    const selectedClass = isDefender ? 'defender-selected' : 'selected';
    const position = element.getAttribute('data-position');
    const gridId = isDefender ? 'defender-upgrades-grid' : 'attacker-upgrades-grid';
    const grid = document.getElementById(gridId);
    
    // Get the column letter and row number
    const col = position[0];
    const row = parseInt(position[1]);

    if (element.classList.contains(selectedClass)) {
        // Deselection logic
        element.classList.remove(selectedClass);
        
        // When deselecting, also deselect all higher tiers in the same column (only for the first grid)
        if (row <= 3) {
            for (let i = row + 1; i <= 3; i++) {
                const higherUpgrade = grid.querySelector(`[data-position="${col}${i}"]:not(.restricted)`);
                if (higherUpgrade) {
                    higherUpgrade.classList.remove(selectedClass);
                }
            }
        }
    } else {
        // Selection logic
        element.classList.add(selectedClass);
        
        // When selecting, also select all lower tiers in the same column (only for the first grid)
        if (row <= 3) {
            for (let i = row - 1; i >= 1; i--) {
                const lowerUpgrade = grid.querySelector(`[data-position="${col}${i}"]:not(.restricted)`);
                if (lowerUpgrade) {
                    lowerUpgrade.classList.add(selectedClass);
                }
            }
        }
    }

    // Update full upgrade checkbox
    const checkboxId = isDefender ? 'defender-full-upgrade' : 'attacker-full-upgrade';
    const checkbox = document.getElementById(checkboxId);
    const allIcons = grid.querySelectorAll('.upgrade-icon:not(.restricted)');
    const selectedIcons = grid.querySelectorAll(`.upgrade-icon.${selectedClass}`);
    
    checkbox.checked = allIcons.length === selectedIcons.length;

    if (!isDefender) {
        // After toggling selection, update the unit vs unit display
        updateUnitVsUnitUpgrades();
    }

    if (selectedAttacker && selectedDefender) {
        // Re-fetch and update the unit vs unit display when either attacker or defender upgrades change
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
    }
}

// Add this new function to fetch restrictions for a civilization
function fetchCivRestrictions(civ) {
    return fetch(`/get-civ-restrictions?civ=${encodeURIComponent(civ)}`)
        .then(response => response.json());
}

// Modify the loadUpgrades function to handle restrictions and full upgrade logic
function loadUpgrades() {
    const attackerGrid = document.getElementById('attacker-upgrades-grid');
    const defenderGrid = document.getElementById('defender-upgrades-grid');
    attackerGrid.innerHTML = ''; // Clear existing content
    defenderGrid.innerHTML = ''; // Clear existing content

    // Fetch both civilization restrictions
    Promise.all([
        fetchCivRestrictions(attackerCiv),
        fetchCivRestrictions(defenderCiv),
        fetch('/get-upgrades')
    ])
    .then(([attackerRestrictions, defenderRestrictions, response]) => response.json()
        .then(data => {
            // Sort icons by their first two characters
            const sortedIcons = data.sort((a, b) => {
                const aPrefix = a.slice(0, 2);
                const bPrefix = b.slice(0, 2);
                return aPrefix.localeCompare(bPrefix);
            });

            // Create a 3x5 grid for Blacksmith upgrades and a 1x5 grid for Other upgrades
            const blacksmithGrid = Array.from({ length: 3 }, () => Array(5).fill(null));
            const otherGrid = Array.from({ length: 1 }, () => Array(5).fill(null));

            sortedIcons.forEach((icon, index) => {
                if (index < 15) {
                    const row = Math.floor(index / 5);
                    const col = index % 5;
                    blacksmithGrid[row][col] = icon;
                } else {
                    const col = index % 5;
                    otherGrid[0][col] = icon;
                }
            });

            // Generate HTML for the grids
            const generateGridHTML = (grid, isDefender, restrictions) => {
                return grid.map((row, rowIndex) => row.map((icon, colIndex) => {
                    if (icon) {
                        const position = icon.slice(0, 2); // Get position from filename (e.g., 'e3')
                        const tooltipText = icon.slice(2, -4).replace(/^\./, '');
                        const isRestricted = restrictions.includes(position);
                        
                        return `
                            <div class="upgrade-icon ${isRestricted ? 'upgrade-restricted' : ''}" 
                                 onclick="${isRestricted ? '' : `toggleUpgradeSelection(this, ${isDefender})`}" 
                                 data-tooltip="${tooltipText}" 
                                 style="${isRestricted ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                                <img src="/static/images/Upgrades/${icon}" alt="${icon}">
                                ${isRestricted ? '<div class="upgrade-restricted-overlay">×</div>' : ''}
                            </div>
                        `;
                    }
                    return '';
                }).join('')).join('');
            };

            attackerGrid.innerHTML = generateGridHTML(blacksmithGrid, false, attackerRestrictions) + 
                                   '<div class="separator-line thick-separator"></div>' + 
                                   generateGridHTML(otherGrid, false, attackerRestrictions);
            
            defenderGrid.innerHTML = generateGridHTML(blacksmithGrid, true, defenderRestrictions) + 
                                   '<div class="separator-line thick-separator"></div>' + 
                                   generateGridHTML(otherGrid, true, defenderRestrictions);

            // Add event listeners for full upgrade checkboxes
            const attackerFullUpgrade = document.getElementById('attacker-full-upgrade');
            const defenderFullUpgrade = document.getElementById('defender-full-upgrade');

            attackerFullUpgrade.addEventListener('change', function() {
                const unitId = document.getElementById('attacker-box').getAttribute('data-unit-id');
                if (unitId) {
                    fetch(`/get-unit-upgrades?unit_id=${unitId}`)
                        .then(response => response.json())
                        .then(upgrades => {
                            const icons = attackerGrid.querySelectorAll('.upgrade-icon:not(.restricted)');
                            icons.forEach(icon => {
                                const position = icon.getAttribute('data-position');
                                if (this.checked && upgrades.includes(position)) {
                                    icon.classList.add('selected');
                                } else {
                                    icon.classList.remove('selected');
                                }
                            });
                        });
                }
            });

            defenderFullUpgrade.addEventListener('change', function() {
                const unitId = document.getElementById('defender-box').getAttribute('data-unit-id');
                if (unitId) {
                    fetch(`/get-unit-upgrades?unit_id=${unitId}`)
                        .then(response => response.json())
                        .then(upgrades => {
                            const icons = defenderGrid.querySelectorAll('.upgrade-icon:not(.restricted)');
                            icons.forEach(icon => {
                                const position = icon.getAttribute('data-position');
                                if (this.checked && upgrades.includes(position)) {
                                    icon.classList.add('defender-selected');
                                } else {
                                    icon.classList.remove('defender-selected');
                                }
                            });
                        });
                }
            });
        }))
    .catch(error => console.error('Error loading upgrades:', error));
}

document.addEventListener('mousemove', function(e) {
    const tooltip = document.getElementById('tooltip');
    const target = e.target.closest('[data-tooltip]');
    if (target) {
        tooltip.textContent = target.getAttribute('data-tooltip');
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

function loadUpgrades() {
    const attackerGrid = document.getElementById('attacker-upgrades-grid');
    const defenderGrid = document.getElementById('defender-upgrades-grid');
    attackerGrid.innerHTML = '';
    defenderGrid.innerHTML = '';

    const attackerId = document.getElementById('attacker-box').getAttribute('data-unit-id');
    const defenderId = document.getElementById('defender-box').getAttribute('data-unit-id');

    // Fetch all necessary data
    Promise.all([
        fetchCivRestrictions(attackerCiv),
        fetchCivRestrictions(defenderCiv),
        fetch(`/get-unit-upgrades?unit_id=${attackerId}`),
        fetch(`/get-unit-upgrades?unit_id=${defenderId}`),
        fetch('/get-upgrades')
    ])
    .then(([
        attackerCivRestrictions, 
        defenderCivRestrictions, 
        attackerUpgradesResponse,
        defenderUpgradesResponse,
        upgradesResponse
    ]) => Promise.all([
        attackerCivRestrictions,
        defenderCivRestrictions,
        attackerUpgradesResponse.json(),
        defenderUpgradesResponse.json(),
        upgradesResponse.json()
    ]))
    .then(([
        attackerCivRestrictions, 
        defenderCivRestrictions, 
        attackerUnitUpgrades,
        defenderUnitUpgrades,
        upgrades
    ]) => {
        // Create the grids with both civ and unit restrictions
        const generateGridHTML = (grid, isDefender, civRestrictions, unitUpgrades) => {
            return grid.map(row => row.map(icon => {
                if (icon) {
                    const position = icon.slice(0, 2);
                    let tooltipText = icon.slice(2, -4).replace(/^\./, '');
                    const isCivRestricted = civRestrictions.includes(position);
                    const isUnitRestricted = !unitUpgrades.includes(position);
                    const isRestricted = isCivRestricted || isUnitRestricted;
                    
                    // Add appropriate suffix to tooltip based on restriction type
                    if (isCivRestricted) {
                        tooltipText += " - Not available for the selected civilization";
                    } else if (isUnitRestricted) {
                        tooltipText += " - Not available for the selected unit";
                    }
                    
                    return `
                        <div class="upgrade-icon ${isRestricted ? 'upgrade-restricted' : ''}" 
                             onclick="${isRestricted ? '' : `toggleUpgradeSelection(this, ${isDefender})`}"
                             data-tooltip="${tooltipText}"
                             data-position="${position}"
                             style="${isRestricted ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                            <img src="/static/images/Upgrades/${icon}" alt="${tooltipText}">
                            ${isRestricted ? `<div class="upgrade-restricted-overlay" 
                                                style="color: ${isCivRestricted ? '#ff0000' : '#00ff00'};">×</div>` : ''}
                        </div>
                    `;
                }
                return '';
            }).join('')).join('');
        };

        // Sort and organize icons
        const sortedIcons = upgrades.sort((a, b) => a.slice(0, 2).localeCompare(b.slice(0, 2)));
        const blacksmithGrid = Array.from({ length: 3 }, () => Array(5).fill(null));
        const otherGrid = Array.from({ length: 1 }, () => Array(5).fill(null));

        sortedIcons.forEach(icon => {
            const pos = icon.slice(0, 2);
            const row = parseInt(pos[1]) - 1;
            const col = pos[0].charCodeAt(0) - 'a'.charCodeAt(0);
            
            if (row < 3) {
                blacksmithGrid[row][col] = icon;
            } else {
                otherGrid[0][col] = icon;
            }
        });

        // Generate grids with both civ and unit restrictions
        attackerGrid.innerHTML = generateGridHTML(blacksmithGrid, false, attackerCivRestrictions, attackerUnitUpgrades) + 
                               '<div class="separator-line thick-separator"></div>' + 
                               generateGridHTML(otherGrid, false, attackerCivRestrictions, attackerUnitUpgrades);
        
        defenderGrid.innerHTML = generateGridHTML(blacksmithGrid, true, defenderCivRestrictions, defenderUnitUpgrades) + 
                               '<div class="separator-line thick-separator"></div>' + 
                               generateGridHTML(otherGrid, true, defenderCivRestrictions, defenderUnitUpgrades);

        // Setup full upgrade checkboxes
        setupFullUpgradeCheckbox('attacker-full-upgrade', attackerGrid, attackerUnitUpgrades, 'selected');
        setupFullUpgradeCheckbox('defender-full-upgrade', defenderGrid, defenderUnitUpgrades, 'defender-selected');
    })
    .catch(error => console.error('Error loading upgrades:', error));
}

// Add this helper function to handle checkbox setup
function setupFullUpgradeCheckbox(checkboxId, grid, unitUpgrades, selectedClass) {
    const checkbox = document.getElementById(checkboxId);
    if (!checkbox) return;

    checkbox.addEventListener('change', function() {
        const icons = grid.querySelectorAll('.upgrade-icon:not(.upgrade-restricted)');
        icons.forEach(icon => {
            const position = icon.getAttribute('data-position');
            if (unitUpgrades.includes(position)) {
                if (this.checked) {
                    icon.classList.add(selectedClass);
                } else {
                    icon.classList.remove(selectedClass);
                }
            }
        });

        // Update unit vs unit display if necessary
        if (selectedAttacker && selectedDefender) {
            fetchUnitVsUnitData(selectedAttacker, selectedDefender);
        }
    });

    // Set initial checkbox state
    const availableIcons = grid.querySelectorAll('.upgrade-icon:not(.upgrade-restricted)');
    const selectedIcons = grid.querySelectorAll(`.upgrade-icon.${selectedClass}`);
    checkbox.checked = availableIcons.length > 0 && availableIcons.length === selectedIcons.length;
}

// Update toggleUpgradeSelection to handle checkbox state
function toggleUpgradeSelection(element, isDefender = false) {
    if (element.classList.contains('upgrade-restricted')) {
        return;
    }

    const selectedClass = isDefender ? 'defender-selected' : 'selected';
    const position = element.getAttribute('data-position');
    const gridId = isDefender ? 'defender-upgrades-grid' : 'attacker-upgrades-grid';
    const grid = document.getElementById(gridId);
    
    // Get the column letter and row number
    const col = position[0];
    const row = parseInt(position[1]);

    if (element.classList.contains(selectedClass)) {
        // Deselection logic
        element.classList.remove(selectedClass);
        
        // When deselecting, also deselect all higher tiers in the same column (only for the first grid)
        if (row <= 3) {
            for (let i = row + 1; i <= 3; i++) {
                const higherUpgrade = grid.querySelector(`[data-position="${col}${i}"]:not(.restricted)`);
                if (higherUpgrade) {
                    higherUpgrade.classList.remove(selectedClass);
                }
            }
        }
    } else {
        // Selection logic
        element.classList.add(selectedClass);
        
        // When selecting, also select all lower tiers in the same column (only for the first grid)
        if (row <= 3) {
            for (let i = row - 1; i >= 1; i--) {
                const lowerUpgrade = grid.querySelector(`[data-position="${col}${i}"]:not(.restricted)`);
                if (lowerUpgrade) {
                    lowerUpgrade.classList.add(selectedClass);
                }
            }
        }
    }

    // Update full upgrade checkbox
    const checkboxId = isDefender ? 'defender-full-upgrade' : 'attacker-full-upgrade';
    const checkbox = document.getElementById(checkboxId);
    const allIcons = grid.querySelectorAll('.upgrade-icon:not(.restricted)');
    const selectedIcons = grid.querySelectorAll(`.upgrade-icon.${selectedClass}`);
    
    checkbox.checked = allIcons.length === selectedIcons.length;

    if (!isDefender) {
        // After toggling selection, update the unit vs unit display
        updateUnitVsUnitUpgrades();
    }

    if (selectedAttacker && selectedDefender) {
        // Re-fetch and update the unit vs unit display when either attacker or defender upgrades change
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
    }
}

function calculateBonusAttackWithUpgrades(unit, upgrades, enemy, isDefender) {
    // ...existing code...
    
    // Calculate pierce attack upgrades
    if (unit.base_pierce > 0) {
        let pierceUpgradeCount = 0;
        if (upgrades.includes('a1')) pierceUpgradeCount++;
        if (upgrades.includes('a2')) pierceUpgradeCount++;
        if (upgrades.includes('a3')) pierceUpgradeCount++;
        if (upgrades.includes('a4')) pierceUpgradeCount++;
        
        // Add the pierce attack upgrades to the base pierce
        attack += pierceUpgradeCount;
    }

    // ...existing code...
}

function updateUnitVsUnitPanel() {
    // ...existing code...
    
    // When calculating the damage, ensure pierce attack upgrades are included
    let attackerDamage = calculateBonusAttackWithUpgrades(attacker, attackerUpgrades, defender, false);
    let defenderDamage = calculateBonusAttackWithUpgrades(defender, defenderUpgrades, attacker, true);
    
    // ...existing code...
}

// Add this helper function to calculate new total
function calculateTotalWithUpgrades(baseAmount, hasBasePierce) {
    const upgradeCount = countPierceAttackUpgrades();
    if (hasBasePierce) {
        return baseAmount + upgradeCount;
    }
    return baseAmount;
}

// Add new function to calculate defender armor upgrades based on armor type
function calculateDefenderArmorUpgrades(isPierceArmor) {
    const grid = document.getElementById('defender-upgrades-grid');
    let armorBonus = 0;

    // Helper function to check if an upgrade is selected
    const isUpgradeSelected = position => {
        const upgrade = grid.querySelector(`[data-position="${position}"]`);
        return upgrade && upgrade.classList.contains('defender-selected');
    };

    // Common upgrades that affect both armor types
    if (isUpgradeSelected('b1')) armorBonus += 1;
    if (isUpgradeSelected('b2')) armorBonus += 1;
    if (isUpgradeSelected('d1')) armorBonus += 1;
    if (isUpgradeSelected('d2')) armorBonus += 1;
    if (isUpgradeSelected('e1')) armorBonus += 1;
    if (isUpgradeSelected('e2')) armorBonus += 1;

    // Add +1 pierce armor when b4 is selected
    if (isPierceArmor && isUpgradeSelected('b4')) {
        armorBonus += 1;
    }

    // Upgrades with different effects based on armor type
    if (isPierceArmor) {
        if (isUpgradeSelected('b3')) armorBonus += 2;
        if (isUpgradeSelected('d3')) armorBonus += 2;
        if (isUpgradeSelected('d4')) armorBonus += 2;
        if (isUpgradeSelected('e3')) armorBonus += 2;
    } else {
        if (isUpgradeSelected('b3')) armorBonus += 1;
        if (isUpgradeSelected('d3')) armorBonus += 1;
        if (isUpgradeSelected('d4')) armorBonus += 1;
        if (isUpgradeSelected('e3')) armorBonus += 1;
    }

    return armorBonus;
}

// Modify the displayUnitVsUnitData function
function displayUnitVsUnitData(data) {
    const panel = document.getElementById('unit-vs-unit-panel');
    const content = document.getElementById('unit-vs-unit-content');

    if (data.error) {
        content.innerHTML = `<p class="error-message">${data.error}</p>`;
        return;
    }

    // Determine if attacker uses pierce or melee attack
    const hasBasePierce = data.matching_classes.some(cls => 
        cls["Attack Class Name"] === "Base Pierce" && cls["Attack Amount"] !== 0
    );
    
    // Calculate upgrades
    const attackUpgradeBonus = hasBasePierce ? countPierceAttackUpgrades() : countMeleeAttackUpgrades();
    const armorUpgradeBonus = calculateDefenderArmorUpgrades(hasBasePierce);
    const armorType = hasBasePierce ? "Pierce Armor" : "Melee Armor";

    // Separate base attacks from bonus attacks
    const baseAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] === "Base Pierce" || 
        cls["Attack Class Name"] === "Base Melee"
    );

    const bonusAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] !== "Base Pierce" && 
        cls["Attack Class Name"] !== "Base Melee" &&
        cls["Attack Amount"] !== 0
    );

    // Calculate base attack total
    const baseAttackTotal = baseAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);
    
    // Calculate bonus attack total
    const bonusAttackTotal = bonusAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);

    // Generate HTML sections
    const baseAttacksHTML = baseAttacks.map(cls => `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span style="color: #fff;">${cls["Attack Class Name"]}:</span>
            <span style="color: #00ff00; margin-left: 10px;">${cls["Attack Amount"]}</span>
        </div>
    `).join('');

    const bonusAttacksHTML = bonusAttacks.length > 0 ? `
        <h3 style="color: #ffd700; margin: 10px 0; text-align: left;">Bonus Damage</h3>
        ${bonusAttacks.map(cls => `
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span style="color: #fff;">${cls["Attack Class Name"]}:</span>
                <span style="color: #00ff00; margin-left: 10px;">${cls["Attack Amount"]}</span>
            </div>
        `).join('')}
    ` : '';

    // Fetch defender stats to get base armor value
    fetch(`/get-unit-details?unit_id=${selectedDefender}`)
        .then(response => response.json())
        .then(defenderData => {
            const baseArmorValue = hasBasePierce ? 
                defenderData.pierce_armor : 
                defenderData.melee_armor;
            
            // Calculate total armor including upgrades
            const totalArmorValue = baseArmorValue + armorUpgradeBonus;

            // Calculate total net attack (minimum 1)
            // (Base attack + Attack upgrades) + Bonus attack - (Base armor + Armor upgrades)
            const totalNetAttack = Math.max(1, 
                (baseAttackTotal + attackUpgradeBonus) + 
                bonusAttackTotal - 
                totalArmorValue
            );

            content.innerHTML = `
                <h3 style="color: #ffd700; margin-bottom: 10px; text-align: left;">Attack</h3>
                ${baseAttacksHTML}
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">Attack Upgrades:</span>
                    <span style="color: #00ff00; margin-left: 10px;">${attackUpgradeBonus}</span>
                </div>
                ${bonusAttacksHTML}
                <h3 style="color: #ffd700; margin: 10px 0; text-align: left;">Opponent Armour</h3>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">${armorType}:</span>
                    <span style="color: #ff4444; margin-left: 10px;">${baseArmorValue}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #fff;">Armour Upgrades:</span>
                    <span style="color: #ff4444; margin-left: 10px;">${armorUpgradeBonus}</span>
                </div>
                <div style="margin-top: 15px; background-color: rgba(0, 0, 0, 0.5); padding: 10px; border-radius: 5px; border: 1px solid rgba(255, 215, 0, 0.3);">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ffd700; font-weight: bold; font-size: 1.1em;">Total Net Attack:</span>
                        <span style="color: #00ff00; font-weight: bold; font-size: 1.1em; margin-left: 10px;">${totalNetAttack}</span>
                    </div>
                </div>
            `;
        });

    panel.style.display = 'block';
}

function countMeleeAttackUpgrades() {
    const grid = document.getElementById('attacker-upgrades-grid');
    let upgradeBonus = 0;
    
    // Check each melee attack upgrade (c1 through c3)
    const c1 = grid.querySelector('[data-position="c1"]');
    const c2 = grid.querySelector('[data-position="c2"]');
    const c3 = grid.querySelector('[data-position="c3"]');
    const d4 = grid.querySelector('[data-position="d4"]');

    if (c1 && c1.classList.contains('selected')) upgradeBonus += 1;
    if (c2 && c2.classList.contains('selected')) upgradeBonus += 1;
    if (c3 && c3.classList.contains('selected')) upgradeBonus += 2;

    // Check for Logistica (d4) bonus against specific units
    if (d4 && d4.classList.contains('selected') && selectedDefender) {
        const defenderUnitId = parseInt(selectedDefender);
        if ([93, 358, 359].includes(defenderUnitId)) {
            upgradeBonus += 2; // Add +2 attack when attacking Spearman-line units
        }
    }

    return upgradeBonus;
}