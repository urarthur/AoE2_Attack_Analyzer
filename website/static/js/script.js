const buildings = [
    'BARRACKS',
    'STABLE',
    'ARCHERY_RANGE',
    'SIEGE_WORKSHOP',
    'CASTLE',
    'DOCK',
    'MONASTERY',
    'MARKET',
    'TOWN_CENTER'
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
let attackerCiv = '';
let defenderCiv = '';

// Add new helper function for resource-based battle simulation
function calculateUnitsFor1000Resources(costs) {
    const totalCost = (costs.food || 0) + (costs.gold || 0) + (costs.wood || 0) + (costs.stone || 0);
    return Math.floor(1000 / totalCost);
}

function simulateBattle(attackerCount, defenderCount, attackerDamage, defenderHp, defenderDamage, attackerHp) {
    // Arrays to track remaining HP of each unit
    let attackers = Array(attackerCount).fill(attackerHp);
    let defenders = Array(defenderCount).fill(defenderHp);
    let isAttackerTurn = true;
    
    while (attackers.length > 0 && defenders.length > 0) {
        if (isAttackerTurn) {
            // Attackers turn - each attacker deals damage
            let totalDamage = attackers.length * attackerDamage;
            
            // Apply damage to defenders until damage is used up
            while (totalDamage > 0 && defenders.length > 0) {
                // Apply damage to first defender
                defenders[0] -= totalDamage;
                
                // If defender is dead, remove it
                if (defenders[0] <= 0) {
                    defenders.shift();
                }
                
                // All damage is used in one attack
                break;
            }
        } else {
            // Defenders turn - each defender deals damage
            let totalDamage = defenders.length * defenderDamage;
            
            // Apply damage to attackers until damage is used up
            while (totalDamage > 0 && attackers.length > 0) {
                // Apply damage to first attacker
                attackers[0] -= totalDamage;
                
                // If attacker is dead, remove it
                if (attackers[0] <= 0) {
                    attackers.shift();
                }
                
                // All damage is used in one attack
                break;
            }
        }
        isAttackerTurn = !isAttackerTurn;
    }
    
    return {
        winner: attackers.length > 0 ? 'attacker' : 'defender',
        remaining: Math.floor(attackers.length > 0 ? attackers.length : defenders.length)
    };
}

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
            <img src="/images/Buildings/${building.toLowerCase()}.png" 
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
                                if (isEliteUnit(unitName)) return 4;
                                else return 3;
                            }
                            return 5;
                        }

                        const priorityA = getPriority(a);
                        const priorityB = getPriority(b);

                        if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                        } else {
                            const baseNameA = stripElitePrefix(a.NAME.trim().toUpperCase());
                            const baseNameB = stripElitePrefix(b.NAME.trim().toUpperCase());

                            if (baseNameA === baseNameB) {
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
    
    box.setAttribute('data-unit-id', unit.UNIT_ID);
    
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
        const container = document.getElementById('counter-unit-details');
        container.innerHTML = `
            <div class="counter-unit-container">
                <div class="counter-unit-panel" style="text-align: left;">
                    <h2 id="top-opponents-title"></h2>
                    <table class="counter-unit-table">
                        <thead>
                            <tr>
                                <th>STRONG vs.</th>
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
        
        if (selectedDefender) {
            fetchCounterUnitDetails(selectedDefender);
        }
    }

    if (selectedAttacker && selectedDefender) {
        document.getElementById('instruction-text').style.display = 'none';
        document.querySelector('.switch-box').style.display = 'flex';
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
    } else {
        document.getElementById('instruction-text').style.display = 'block';
        document.querySelector('.switch-box').style.display = 'none';
    }

    fetchUnitDetails(unit.UNIT_ID, isDefenderMode);

    if (isDefenderMode) {
        document.getElementById('right-panel').style.display = 'flex';
    } else {
        document.getElementById('left-panel').style.display = 'flex';
    }

    if (selectedAttacker && selectedDefender) {
        document.getElementById('upgrades-panel').style.display = 'block';
        loadUpgrades();
    }

    updateEmblemVisibility();

    if (selectedAttacker && selectedDefender) {
        document.getElementById('combat-stats-panel').style.display = 'block';
        document.getElementById('upgrades-panel').style.display = 'block';
        loadUpgrades();
    }
}

function updateEmblemVisibility() {
    const attackerEmblem = document.querySelector('#attacker-box .civ-emblem-container');
    const defenderEmblem = document.querySelector('#defender-box .civ-emblem-container');
    
    if (attackerEmblem && defenderEmblem) {
        const shouldShow = selectedAttacker && selectedDefender;
        attackerEmblem.classList.toggle('show', shouldShow);
        defenderEmblem.classList.toggle('show', shouldShow);
    }
}

function displayUnits(unitsData) {
    const unitsBox = document.getElementById('units-box');
    
    if (typeof unitsData === 'string') {
        unitsBox.innerHTML = `<p class="error-message">${unitsData}</p>`;
        return;
    }

    const groupedUnits = {};
    unitsData.forEach(unit => {
        const columnNumber = Math.floor(unit.SORTING);
        if (!groupedUnits[columnNumber]) {
            groupedUnits[columnNumber] = [];
        }
        groupedUnits[columnNumber].push(unit);
    });

    Object.keys(groupedUnits).forEach(key => {
        groupedUnits[key].sort((a, b) => a.SORTING - b.SORTING);
    });

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
function fetchUnitDetails(unitId, isDefender) {
    fetch(`/get-unit-details?unit_id=${unitId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit details:', data);
            displayUnitStats(data, isDefender);
            if (isDefender) {
                fetchUnitArmours(unitId);
            } else {
                fetchUnitAttacks(unitId, isDefender);
            }
        })
        .catch(error => {
            console.error('Error fetching unit details:', error);
        });
}

function displayUnitStats(unitDetails, isDefender) {
    const unitStatsContent = document.getElementById(isDefender ? 'defender-stats-content' : 'attacker-stats-content');
    if (unitDetails.error) {
        unitStatsContent.innerHTML = `<p class="error-message">${unitDetails.error}</p>`;
        return;
    }

    const cost = [];
    if (unitDetails.cost.wood > 0) cost.push(`<span><img src="/static/images/Other/wood.png" alt="Wood" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.wood}</span>`);
    if (unitDetails.cost.food > 0) cost.push(`<span><img src="/static/images/Other/food.png" alt="Food" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.food}</span>`);
    if (unitDetails.cost.gold > 0) cost.push(`<span><img src="/static/images/Other/gold.png" alt="Gold" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.gold}</span>`);
    if (unitDetails.cost.stone > 0) cost.push(`<span><img src="/static/images/Other/stone.png" alt="Stone" style="height: 20px; vertical-align: middle;"> ${unitDetails.cost.stone}</span>`);

    unitStatsContent.innerHTML = `
        <div class="unit-stats-grid">
            <div class="unit-stats-item">
                <strong style="flex-shrink: 0;">Cost:</strong>
                <div style="display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; flex: 1;">
                    ${cost.join(' ')}
                </div>
            </div>
            <div class="unit-stats-item">
                <strong>Attack:</strong> <span>${unitDetails.attack}</span>
            </div>
            <div class="unit-stats-item">
                <strong>Melee Armor:</strong> <span>${unitDetails.melee_armor}</span>
            </div>
            <div class="unit-stats-item">
                <strong>Pierce Armor:</strong> <span>${unitDetails.pierce_armor}</span>
            </div>
            <div class="unit-stats-item">
                <strong>Hit Points:</strong> <span>${unitDetails.hit_points}</span>
            </div>
        </div>
    `;
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
        return;
    }

    const basicStats = unitStatsContent.querySelector('.unit-stats-grid:first-child')?.outerHTML || '';

    const armours = armourDetails.map(armour => `
        <div class="unit-stats-item" style="word-break: break-word;">
            <strong>${armour["Armour Class Name"]}:</strong> ${armour["Armour Amount"]}
        </div>
    `).join('');

    unitStatsContent.innerHTML = `
        ${basicStats}
        <h2 style="margin-top: 40px; text-align: left;">Armour Classes</h2>
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

function displayUnitAttacks(attackDetails, isDefender) {
    const unitStatsContent = document.getElementById(isDefender ? 'defender-stats-content' : 'attacker-stats-content');
    
    if (attackDetails.error) {
        return;
    }

    const basicStats = unitStatsContent.querySelector('.unit-stats-grid:first-child')?.outerHTML || '';

    const baseAttacks = attackDetails.filter(attack => 
        attack["Attack Class Name"] === "Base Pierce" || attack["Attack Class Name"] === "Base Melee"
    );
    const otherAttacks = attackDetails.filter(attack => 
        attack["Attack Class Name"] !== "Base Pierce" && 
        attack["Attack Class Name"] !== "Base Melee" &&
        attack["Attack Class Name"] !== "Cavalry Resistance"
    );

    const sortedAttacks = [...baseAttacks, ...otherAttacks].sort((a, b) => b["Attack Amount"] - a["Attack Amount"]);
    const attacks = sortedAttacks.map(attack => `
        <div class="unit-stats-item" style="word-break: break-word;">
            <strong>${attack["Attack Class Name"]}:</strong> ${attack["Attack Amount"]}
        </div>
    `).join('');

    unitStatsContent.innerHTML = `
        ${basicStats}
        <h2 style="margin-top: 40px;">Attack Classes</h2>
        <div class="unit-stats-grid">
            ${attacks}
        </div>
    `;
}
function fetchUnitVsUnitData(attackerId, defenderId) {
    fetch(`/get-unit-vs-unit?attacker_id=${attackerId}&defender_id=${defenderId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Unit vs Unit data:', data);
            displayUnitVsUnitData(data);
            fetch(`/get-unit-details?unit_id=${defenderId}`)
                .then(response => response.json())
                .then(defenderData => {
                    console.log('Defender details:', defenderData);
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

    const hasBasePierce = data.matching_classes.some(cls => 
        cls["Attack Class Name"] === "Base Pierce" && cls["Attack Amount"] !== 0
    );
    
    const attackUpgradeBonus = hasBasePierce ? countPierceAttackUpgrades() : countMeleeAttackUpgrades();
    const armorUpgradeBonus = calculateDefenderArmorUpgrades(hasBasePierce);
    const armorType = hasBasePierce ? "Pierce Armor" : "Melee Armor";

    const baseAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] === "Base Pierce" || 
        cls["Attack Class Name"] === "Base Melee"
    );

    const bonusAttacks = data.matching_classes.filter(cls => 
        cls["Attack Class Name"] !== "Base Pierce" && 
        cls["Attack Class Name"] !== "Base Melee" &&
        cls["Attack Amount"] !== 0
    );

    const baseAttackTotal = baseAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);
    const bonusAttackTotal = bonusAttacks.reduce((sum, attack) => sum + attack["Attack Amount"], 0);

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

    // Fetch both attacker and defender details for resource battle simulation
    Promise.all([
        fetch(`/get-unit-details?unit_id=${selectedAttacker}`),
        fetch(`/get-unit-details?unit_id=${selectedDefender}`)
    ])
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(([attackerData, defenderData]) => {
            const baseArmorValue = hasBasePierce ? 
                defenderData.pierce_armor : 
                defenderData.melee_armor;
            
            const totalArmorValue = baseArmorValue + armorUpgradeBonus;
            
            // Check if base attack is 0 (for special units like monks)
            const hasZeroAttack = baseAttackTotal === 0 && bonusAttackTotal === 0;
            const totalNetAttack = hasZeroAttack ? 
                0 : 
                Math.max(1, (baseAttackTotal + attackUpgradeBonus) + bonusAttackTotal - totalArmorValue);

            // For units with zero attack, set hits to kill to Infinity or display "N/A"
            const hitsToKill = hasZeroAttack ? 
                "N/A" : 
                Math.ceil(defenderData.hit_points / totalNetAttack);

            const attackerName = document.querySelector('#attacker-box span')?.textContent || 'Attacker';
            const defenderName = document.querySelector('#defender-box span')?.textContent || 'Defender';

            // Calculate units per 1000 resources
            const attackerUnits = calculateUnitsFor1000Resources(attackerData.cost);
            const defenderUnits = calculateUnitsFor1000Resources(defenderData.cost);

            // Simulate the battle
            const battleResult = simulateBattle(
                attackerUnits, 
                defenderUnits,
                totalNetAttack,
                defenderData.hit_points,
                Math.max(1, defenderData.attack - attackerData.melee_armor), // Add armor consideration
                attackerData.hit_points
            );

            // Update combat stats panel
            const combatStatsPanel = document.getElementById('combat-stats-panel');
            combatStatsPanel.innerHTML = `
                <div style="text-align: left; padding: 10px; font-size: 0.9em;">
                    • <span style="color: #ffd700;">${attackerName}</span> kills <span style="color: #ffd700;">${defenderName}</span> after <span style="color: #00ff00;">${hitsToKill}</span> <span style="color: white;">${hitsToKill === 1 ? 'attack' : 'attacks'}</span>
                    <br>
                    • It takes <span style="color: #00ff00;">${Math.ceil(defenderData.hit_points / totalNetAttack)}</span> <span style="color: #ffd700;">${attackerName}</span> to one-shot <span style="color: #ffd700;">${defenderName}</span>
                    <br>
                    • On equal <span style="color: #ff4444;">1000</span> resources, <span style="color: #00ff00;">${attackerUnits}</span> <span style="color: #ffd700;">${attackerName}</span> vs <span style="color: #00ff00;">${defenderUnits}</span> <span style="color: #ffd700;">${defenderName}</span>, 
                      ${battleResult.winner === 'attacker' ? `<span style="color: #ffd700;">${attackerName}</span>` : `<span style="color: #ffd700;">${defenderName}</span>`} <span style="color: white;">wins with</span> 
                      <span style="color: #00ff00;">${battleResult.remaining}</span> <span style="color: white;">units remaining</span>
                </div>
            `;

            content.innerHTML = `
    <div style="position: relative;">
        <div class="help-icon" onclick="openPopup('explanation-popup')" style="position: absolute; top: -30px; right: 0; cursor: pointer; color: #ffd700; font-weight: bold; background-color: rgba(0, 0, 0, 0.5); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">?</div>
                    <h3 style="color: #ffd700; margin: 20px 0 10px 0; text-align: left;">Attack</h3>
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
                </div>
            `;
        });

    panel.style.display = 'block';
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
    
    if (selectedAttacker) {
        content += `
            <div class="counter-unit-panel">
                <h2 id="top-opponents-title"></h2>
                <table class="counter-unit-table">
                    <thead>
                        <tr>
                            <th>STRONG vs.</th>
                            <th>Net Attack</th>
                        </tr>
                    </thead>
                    <tbody id="top-opponents-body">
                    </tbody>
                </table>
            </div>
        `;
    }

    content += `
        <div class="counter-unit-panel" style="margin-left: ${selectedAttacker ? 'auto' : '0'};">
            <div style="display: flex; align-items: center; gap: 30px;">
                <h2 style="text-align: center; flex: 1; margin: 0;">${defenderName.replace(/_/g, ' ')}     </h2>
                <div>
                    <input type="checkbox" id="excludeSiege" checked>
                    <span class="tooltip-icon" data-tooltip="Exclude Siege & Dock Units">?</span>
                </div>
            </div>
            <table class="counter-unit-table">
                <thead>
                    <tr>
                        <th>WEAK vs.</th>
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

    if (selectedAttacker) {
        fetchTopOpponents(selectedAttacker);
    }

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
        .slice(0, 20);

    return filteredDetails.map(unit => `
        <tr>
            <td>${formatUnitName(unit.Name)}</td>
            <td>${unit["Net Damage"]}</td>
        </tr>
    `).join('');
}

function formatUnitName(name) {
    let formattedName = name.replace(/_/g, ' ');
    if (formattedName.length > 19) {
        formattedName = formattedName.substring(0, 19) + '.';
    }
    return formattedName;
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
                            <th>STRONG vs.</th>
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
function toggleUpgradeSelection(element, isDefender = false) {
    if (element.classList.contains('upgrade-restricted')) {
        return;
    }

    const selectedClass = isDefender ? 'defender-selected' : 'selected';
    const position = element.getAttribute('data-position');
    const gridId = isDefender ? 'defender-upgrades-grid' : 'attacker-upgrades-grid';
    const grid = document.getElementById(gridId);
    
    const col = position[0];
    const row = parseInt(position[1]);

    if (element.classList.contains(selectedClass)) {
        // Handle deselection
        element.classList.remove(selectedClass);
        
        if (row <= 3) {
            // When deselecting, also deselect higher tier upgrades
            for (let i = row + 1; i <= 3; i++) {
                const higherUpgrade = grid.querySelector(`[data-position="${col}${i}"]:not(.restricted)`);
                if (higherUpgrade) {
                    higherUpgrade.classList.remove(selectedClass);
                }
            }
        }
    } else {
        // Handle selection
        element.classList.add(selectedClass);
        
        if (row <= 3) {
            // When selecting, also select lower tier upgrades
            for (let i = row - 1; i >= 1; i--) {
                const lowerUpgrade = grid.querySelector(`[data-position="${col}${i}"]:not(.restricted)`);
                if (lowerUpgrade) {
                    lowerUpgrade.classList.add(selectedClass);
                }
            }
        }
    }

    // Update checkbox state
    const checkboxId = isDefender ? 'defender-full-upgrade' : 'attacker-full-upgrade';
    const checkbox = document.getElementById(checkboxId);
    const allIcons = grid.querySelectorAll('.upgrade-icon:not(.upgrade-restricted)');
    const selectedIcons = grid.querySelectorAll(`.upgrade-icon.${selectedClass}`);
    checkbox.checked = allIcons.length === selectedIcons.length;

    // Always fetch new data when changing upgrades
    if (selectedAttacker && selectedDefender) {
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
    }
}

function countPierceAttackUpgrades() {
    const grid = document.getElementById('attacker-upgrades-grid');
    let count = 0;
    
    for (let i = 1; i <= 4; i++) {
        const upgrade = grid.querySelector(`[data-position="a${i}"]`);
        if (upgrade && upgrade.classList.contains('selected')) {
            count++;
        }
    }

    const d4 = grid.querySelector('[data-position="d4"]');
    if (d4 && d4.classList.contains('selected') && selectedDefender) {
        const defenderUnitId = parseInt(selectedDefender);
        if ([93, 358, 359].includes(defenderUnitId)) {
            count += 2;
        }
    }

    return count;
}

function countMeleeAttackUpgrades() {
    const grid = document.getElementById('attacker-upgrades-grid');
    let upgradeBonus = 0;
    
    const c1 = grid.querySelector('[data-position="c1"]');
    const c2 = grid.querySelector('[data-position="c2"]');
    const c3 = grid.querySelector('[data-position="c3"]');
    const d4 = grid.querySelector('[data-position="d4"]');

    if (c1 && c1.classList.contains('selected')) upgradeBonus += 1;
    if (c2 && c2.classList.contains('selected')) upgradeBonus += 1;
    if (c3 && c3.classList.contains('selected')) upgradeBonus += 2;

    if (d4 && d4.classList.contains('selected') && selectedDefender) {
        const defenderUnitId = parseInt(selectedDefender);
        if ([93, 358, 359].includes(defenderUnitId)) {
            upgradeBonus += 2;
        }
    }

    return upgradeBonus;
}

function calculateDefenderArmorUpgrades(isPierceArmor) {
    const grid = document.getElementById('defender-upgrades-grid');
    let armorBonus = 0;

    const isUpgradeSelected = position => {
        const upgrade = grid.querySelector(`[data-position="${position}"]`);
        return upgrade && upgrade.classList.contains('defender-selected');
    };

    if (isUpgradeSelected('b1')) armorBonus += 1;
    if (isUpgradeSelected('b2')) armorBonus += 1;
    if (isUpgradeSelected('d1')) armorBonus += 1;
    if (isUpgradeSelected('d2')) armorBonus += 1;
    if (isUpgradeSelected('e1')) armorBonus += 1;
    if (isUpgradeSelected('e2')) armorBonus += 1;

    if (isPierceArmor && isUpgradeSelected('b4')) {
        armorBonus += 1;
    }

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

function updateUnitVsUnitUpgrades() {
    const content = document.getElementById('unit-vs-unit-content');
    if (!content) return;

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

    if (baseMeleeIndex !== -1) {
        baseAttackValue = parseInt(attackDivs[baseMeleeIndex].querySelector('span:last-child').textContent);
        upgradeBonus = countMeleeAttackUpgrades();
        armorType = 'Melee Armor:';
    } else if (basePierceIndex !== -1) {
        baseAttackValue = parseInt(attackDivs[basePierceIndex].querySelector('span:last-child').textContent);
        upgradeBonus = countPierceAttackUpgrades();
        armorType = 'Pierce Armor:';
    }

    const upgradesDiv = attackDivs.find(div => div.textContent.includes('Attack Upgrades:'));
    if (upgradesDiv) {
        const valueSpan = upgradesDiv.querySelector('span:last-child');
        valueSpan.textContent = upgradeBonus;
    }

    const armorDiv = attackDivs.find(div => div.textContent.includes(armorType));
    const armorValue = armorDiv ? parseInt(armorDiv.querySelector('span:last-child').textContent) : 0;

    const newTotal = Math.max(1, (baseAttackValue + upgradeBonus) - armorValue);

    const totalAttackDiv = content.querySelector('div[style*="background-color"]');
    if (totalAttackDiv) {
        const totalValueSpan = totalAttackDiv.querySelector('span:last-child');
        totalValueSpan.textContent = newTotal;
    }
}
function loadUpgrades() {
    const attackerGrid = document.getElementById('attacker-upgrades-grid');
    const defenderGrid = document.getElementById('defender-upgrades-grid');
    attackerGrid.innerHTML = '';
    defenderGrid.innerHTML = '';

    const attackerId = document.getElementById('attacker-box').getAttribute('data-unit-id');
    const defenderId = document.getElementById('defender-box').getAttribute('data-unit-id');

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
        const generateGridHTML = (grid, isDefender, civRestrictions, unitUpgrades) => {
            return grid.map(row => row.map(icon => {
                if (icon) {
                    const position = icon.slice(0, 2);
                    let tooltipText = icon.slice(2, -4).replace(/^\./, '');
                    const isCivRestricted = civRestrictions.includes(position);
                    const isUnitRestricted = !unitUpgrades.includes(position);
                    const isRestricted = isCivRestricted || isUnitRestricted;
                    
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

        attackerGrid.innerHTML = generateGridHTML(blacksmithGrid, false, attackerCivRestrictions, attackerUnitUpgrades) + 
                               '<div class="separator-line thick-separator"></div>' + 
                               generateGridHTML(otherGrid, false, attackerCivRestrictions, attackerUnitUpgrades);
        
        defenderGrid.innerHTML = generateGridHTML(blacksmithGrid, true, defenderCivRestrictions, defenderUnitUpgrades) + 
                               '<div class="separator-line thick-separator"></div>' + 
                               generateGridHTML(otherGrid, true, defenderCivRestrictions, defenderUnitUpgrades);

        setupFullUpgradeCheckbox('attacker-full-upgrade', attackerGrid, attackerUnitUpgrades, 'selected');
        setupFullUpgradeCheckbox('defender-full-upgrade', defenderGrid, defenderUnitUpgrades, 'defender-selected');
    })
    .catch(error => console.error('Error loading upgrades:', error));
}

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

        if (selectedAttacker && selectedDefender) {
            fetchUnitVsUnitData(selectedAttacker, selectedDefender);
        }
    });

    const availableIcons = grid.querySelectorAll('.upgrade-icon:not(.upgrade-restricted)');
    const selectedIcons = grid.querySelectorAll(`.upgrade-icon.${selectedClass}`);
    checkbox.checked = availableIcons.length > 0 && availableIcons.length === selectedIcons.length;
}

// Tooltip system
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

// Fetch civilization restrictions
function fetchCivRestrictions(civ) {
    return fetch(`/get-civ-restrictions?civ=${encodeURIComponent(civ)}`)
        .then(response => response.json());
}

// Calculate helper for battle simulation
function calculateTotalWithUpgrades(baseAmount, hasBasePierce) {
    const upgradeCount = countPierceAttackUpgrades();
    return hasBasePierce ? baseAmount + upgradeCount : baseAmount;
}

function switchUnits() {
    // Get both boxes and panels
    const attackerBox = document.getElementById('attacker-box');
    const defenderBox = document.getElementById('defender-box');
    const attackerStats = document.getElementById('attacker-stats-content');
    const defenderStats = document.getElementById('defender-stats-content');

    // Store current values
    const tempAttackerId = selectedAttacker;
    const tempDefenderId = selectedDefender;
    const tempAttackerHtml = attackerBox.innerHTML;
    const tempDefenderHtml = defenderBox.innerHTML;
    const tempAttackerCiv = attackerCiv;
    const tempDefenderCiv = defenderCiv;
    const tempAttackerStats = attackerStats.innerHTML;
    const tempDefenderStats = defenderStats.innerHTML;

    // Swap unit IDs
    selectedAttacker = tempDefenderId;
    selectedDefender = tempAttackerId;

    // Swap HTML content
    attackerBox.innerHTML = tempDefenderHtml;
    defenderBox.innerHTML = tempAttackerHtml;

    // Swap stats content
    attackerStats.innerHTML = tempDefenderStats;
    defenderStats.innerHTML = tempAttackerStats;

    // Swap data-unit-id attributes
    attackerBox.setAttribute('data-unit-id', tempDefenderId || '');
    defenderBox.setAttribute('data-unit-id', tempAttackerId || '');

    // Swap civilizations
    attackerCiv = tempDefenderCiv;
    defenderCiv = tempAttackerCiv;

    // Update panels and data
    if (selectedAttacker && selectedDefender) {
        // Fetch new stats with swapped roles
        fetchUnitDetails(selectedAttacker, false);  // Update attacker stats
        fetchUnitDetails(selectedDefender, true);   // Update defender stats
        fetchUnitVsUnitData(selectedAttacker, selectedDefender);
        fetchCounterUnitDetails(selectedDefender);
        fetchTopOpponents(selectedAttacker);
        loadUpgrades();
    }
}