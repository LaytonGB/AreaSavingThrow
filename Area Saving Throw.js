var AreaSavingThrow = AreaSavingThrow || (function () {
    'use strict';
    var stateName = 'AST',
        states = [
            ['individualRolls'],
            ['hpBar', [1, 2, 3], 3],
            ['notifyGM'],
            ['notifyPlayer'],
            ['showDmgFormula'],
            ['showDC'],
            ['showResistance']
        ],
        name = 'Area Save',
        nameError = name + ' ERROR',
        nameLog = name + ': ',

        checkMacros = function () {
            let playerList = findObjs({
                _type: 'player',
                _online: true
            }),
                gm = _.find(playerList, player => {
                    return playerIsGM(player.id) === true;
                }),
                macrosArr = [
                    [
                        'AreaSave', 
                        '!ast ?{Saving throw attribute?|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma} ?{Advantage?|None|Advantage|Disadvantage} ?{Save DC|12} ?{Effect on a success|Half Damage,half|No Damage,no|Full Damage,full} ?{Damage|1d8+3} ?{Damage Type|None,|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder}'
                    ],
                    [
                        'AreaSaveCustom', 
                        '!ast ?{Saving throw bonus?|5} ?{Advantage?|None|Advantage|Disadvantage} ?{Save DC|12} ?{Effect on a success|Half Damage,half|No Damage,no|Full Damage,full} ?{Damage|1d8+3} ?{Damage Type|None,|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder}'
                    ],
                    [
                        'AreaSaveConfig', 
                        '!ast config'
                    ],
                    [
                        'AreaSaveHelp', 
                        '!ast help'
                    ],
                    [
                        'AddPCResistance',
                        '!ast ?{Resistance or Immunity?|Resistance|Immunity} ?{Damage Type|None,|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder}'
                    ]
                ];
            _.each(macrosArr, macro => {
                let macroObj = findObjs({
                    _type: 'macro',
                    name: macro[0]
                })[0];
                if (macroObj) {
                    if (macroObj.get('visibleto').includes('all') === false) {
                        macroObj.set('visibleto', 'all');
                        toChat(`**Macro '${macro[0]}' was made visible to all.**`, true);
                    }
                    if (macroObj.get('action') !== macro[1]) {
                        macroObj.set('action', macro[1]);
                        toChat(`**Macro '${macro[0]}' was corrected.**`, true);
                    }
                } else if (gm && playerIsGM(gm.id)) {
                    createObj('macro', {
                        _playerid: gm.id,
                        name: macro[0],
                        action: macro[1],
                        visibleto: 'all'
                    })
                    toChat(`**Macro '${macro[0]}' was created and assigned to ${gm.get('_displayname')}.**`, true);
                }
            })
        },

        playerName,
        handleInput = function (msg) {
            if (msg.type === 'api' && msg.content.split(' ')[0] === '!ast') {
                playerName = getObj('player', msg.playerid).get('_displayname').split(' ')[0];
                let parts = msg.content.split(' ');
                if (parts[1] === 'help') {
                    showHelp(msg);
                } else if (playerIsGM(msg.playerid)) {
                    if (parts[1] === 'config') {
                        if (!parts[2]) {
                            showConfig();
                        } else {
                            setConfig(msg);
                        }
                    } else if (parts[1] === 'revert') {
                        revert(msg);
                    } else if (msg.selected && msg.selected[0]) {
                        if (parts[1] === 'resistance' || parts[1] === 'immunity') {
                            addPCAttr(msg);
                        } else {
                            areaSavingThrow(msg);
                        }
                    } else {
                        error(`At least one token must be selected.`, 7);
                        return;
                    }
                } else {
                    error(`Sorry ${playerName}, but only GMs can access this api.`, 0);
                    return;
                }
            }
        },

        showHelp = function (msg) {
            let commandsArr = [
                [
                    '!ast help',
                    'Lists all commands, their parameters, and their usage.',
                    `${code('!ast')} ${code('help')}`,
                ],
                [
                    `!ast config`,
                    'Shows the config, or if called with more variables, changes settings.',
                    `${code('!ast')} ${code('config')} ${code('setting')} ${code('newValue')}`,
                    ['!ast<br>config', 'It is recommended to use this command and change settings from the resultant menu.']
                ],
                [
                    `!ast resistance/immunity`,
                    `Adds resistance or immunity of the specified damage type to the selected token's Character.`,
                    `${code('!ast')} ${code('resistance/immunity')} ${code(`damageType`)}`,
                    [`resistance/<br>immunity`, `Either ${code('resistance')} or ${code('immunity')}.`],
                    [`damage<br>Type`, `The type of damage that the PC will become resistant or immune to (eg. ${code('Fire')}).`]
                ],
                [
                    '!ast',
                    'Rolls the specified save for every selected token, and adjusts their health automatically based on rolls and the input damages.',
                    `${code('!ast')} ${code('attribute/bonus')} ${code('advantage')} ${code('saveDC')} ${code('effectOnSuccess')} ${code('dmgFormula')} ${code('dmgType')}`,
                    [`attribute/<br>bonus`, `Either an Attribute such as ${code('Strength')} or ${code('Wisdom')}, or a number such as ${code('5')}. If a number is provided, all selected creatures will use that number as their save bonus.`],
                    [`advantage`, `${code('None')}, ${code('Advantage')}, or ${code('Disadvantage')}. All selected creatures will roll with the selected option.`],
                    [`saveDC`, `The DC that all selected creatures must meet or exceed to succeed at their save.`],
                    [`effect<br>On<br>Success`, `${code('Half Damage')}, ${code('No Damage')}, or ${code('No Change')}. If a creature succeeds its save, this is how much of the rolled damage they will take.`],
                    [`dmg<br>Formula`, `The damage formula to be rolled. This must match the kind of input Roll20 can take with the ${code('/r')} command.`],
                    [`dmg<br>Type`, `The type of incoming damage. Each creature will be checked for immunity and resistance to this damage, and the damage they take will be adjusted appropriately.`]
                ]
            ];
            _.each(commandsArr, command => {
                let output = `&{template:default} {{name=${code(command[0])} Help}}`;
                _.each(command, function (part, index) {
                    if (index < 3) {
                        let section;
                        switch (index) {
                            case 0:
                                section = 'Command';
                                break;
                            case 1:
                                section = 'Function';
                                break;
                            case 2:
                                section = 'Typical Input';
                                break;
                        }
                        output += `{{${section}=${part}}}`;
                    } else {
                        output += `{{${part[0]}=${part[1]}}}`;
                    }
                })
                toPlayer(output);
            })
            return;
        },

        showConfig = function () {
            let output = `&{template:default} {{name=Area Saving Throw Config}}`;
            _.each(states, value => {
                let acceptableValues = value[1] ? value[1] : [true, false],
                    defaultValue = value[2] ? value[2] : true,
                    currentValue = `${getState(value[0])}`,
                    stringVals = valuesToString(acceptableValues, defaultValue);
                output += `{{${value[0]}=[${currentValue}](!ast config ${value[0]} ?{New ${value[0]} value${stringVals}})}}`;
            })
            toPlayer(output);
            return;

            function valuesToString(values, defaultValue) {
                let output = '',
                    index = values.indexOf(defaultValue);
                if (index !== -1) {
                    let val = values.splice(index, 1);
                    values.unshift(val);
                }
                _.each(values, value => {
                    output += `|${value}`;
                })
                return output;
            }
        },

        setConfig = function (msg) {
            let parts = msg.content.split(' ');
            toPlayer(`**${parts[2]}** has been changed **from ${state[`${stateName}_${parts[2]}`]} to ${parts[3]}**.`, true);
            state[`${stateName}_${parts[2]}`] = parts[3];
            showConfig();
            return;
        },

        areaSavingThrow = function (msg) {
            let parts = msg.content.split(' ');

            let attr,
                saveBonus;
            if (parseInt(parts[1])) {
                saveBonus = parts[1];
            } else {
                switch (parts[1]) {
                    case 'Strength':
                    case 'Dexterity':
                    case 'Constitution':
                    case 'Intelligence':
                    case 'Wisdom':
                    case 'Charisma':
                        attr = parts[1];
                        break;
                    default:
                        error(`Attribute or Bonus '${parts[1]}' not understood.`, 1);
                        return;
                }
            }

            let advantage;
            switch (parts[2]) {
                case 'None':
                    advantage = 'd20';
                    break;
                case 'Advantage':
                    advantage = '2d20kh1';
                    break;
                case 'Disadvantage':
                    advantage = '2d20kl1';
                    break;
                default:
                    error(`Advantage '${parts[2]}' not understood.`, 2);
                    return;
            }

            let saveDC;
            if (parseInt(parts[3])) {
                saveDC = parts[3];
            } else {
                error(`SaveDC '${parts[3]}' not understood.`, 3);
                return;
            }

            let successEffect;
            switch (parts[4]) {
                case 'half':
                case 'no':
                    successEffect = parts[4];
                    break;
                case 'full':
                    successEffect = 'none';
                    break;
                default:
                    error(`Effect on Success '${parts[4]}' not understood.`, 4);
                    return;
            }

            let dmgFormula;
            if (parts[5].search(/[^d+\d-]/g) !== -1) {
                error(`You entered damage as '${parts[5]}' and damage can only contain 'd, +, -' and integers.`, 5);
            } else {
                dmgFormula = parts[5];
            }

            let dmgType;
            if (parts[6]) {
                dmgType = parts[6];
            }

            let dmgTotal = 0;
            if (!state[`${stateName}_individualRolls`]) {
                dmgTotal = roll(dmgFormula);
                dmgTotal.then(dmg => {
                    if (isNaN(dmg)) {
                        error(`Damage formula '${dmgFormula}' was not understood.`, 6);
                        return;
                    }
                });
            }

            _.each(msg.selected, obj => {
                if (obj._type !== 'graphic') {
                    error(`A selected object was not a graphic.`, 10);
                    return;
                } else {
                    let token = getObj(obj._type, obj._id),
                        char = token.get('represents') ? getObj('character', token.get('represents')) : '',
                        isNPC = !char ? 1 : getAttrByName(char.id, 'npc') == 1 ? 1 : 0;

                    if (state[`${stateName}_individualRolls`]) {
                        dmgTotal = roll(dmgFormula);
                        dmgTotal.then(dmg => {
                            if (isNaN(dmg)) {
                                error(`Damage formula '${dmgFormula}' was not understood.`, 11);
                                return;
                            }
                        });
                    }

                    let resAttr = isNPC ? 'npc_resistances' : 'resistances',
                        resistances = findObjs({_type: 'attribute', _characterid: char.id, name: resAttr})[0] ? getAttrByName(char.id, resAttr).toLowerCase() : '',
                        resistanceMod = 1,
                        immAttr = isNPC ? 'npc_immunities' : 'immunities',
                        immunities = findObjs({_type: 'attribute', _characterid: char.id, name: immAttr})[0] ? getAttrByName(char.id, immAttr).toLowerCase() : '',
                        immune;
                    if (char && dmgType) {
                        if (immunities) {
                            immune = immunities.includes(dmgType.toLowerCase());
                        }
                        if (resistances) {
                            resistanceMod = resistances.includes(dmgType.toLowerCase()) ? .5 : 1;
                        }
                    }

                    let saveAttr;
                    if (!saveBonus) {
                        if (!char) {
                            error('Some selected tokens did not represent a sheet, and so have no save bonus.', 9);
                            saveBonus = 0;
                        } else if (isNPC) {
                            saveAttr = `npc_${attr.toLowerCase().slice(0, 3)}_save`;
                            saveBonus = getAttrByName(char.id, saveAttr);
                            if (isNaN(saveBonus)) {
                                saveBonus = Math.floor((getAttrByName(char.id, attr.toLowerCase()) - 10) / 2);
                            }
                        } else {
                            saveAttr = attr.toLowerCase() + '_save_bonus';
                            saveBonus = getAttrByName(char.id, saveAttr);
                        }
                    }

                    let result = roll(`${advantage}+${saveBonus}`),
                        successMod = 1,
                        success;
                    result.then(result => {
                        success = result >= saveDC ? true : false;
                        if (success) {
                            if (successEffect === 'half') {
                                successMod = .5;
                            } else if (successEffect === 'no') {
                                successMod = 0;
                            }
                        }
                    })

                    Promise.all([result, dmgTotal]).then(results => {
                        let tokenName = token.get('name') ? token.get('name') : 'Creature',
                            players = char.get('controlledby') ? char.get('controlledby').split(',') : token.get('controlledby') ? token.get('controlledby').split(',') : [],
                            dmgFinal = immune ? 0 : Math.floor(results[1] * successMod * resistanceMod) < 1 ? 1 : Math.floor(results[1] * successMod * resistanceMod),
                            chatDC = getState(`showDC`) ? `DC ${saveDC} ` : ``,
                            chatAdv = parts[2] !== 'None' ? `with ${parts[2]} ` : ``,
                            chatSucEffect = successEffect === 'half' ? 'to half' : successEffect === 'no' ? 'to nullify' : 'against',
                            chatDmgFormula = getState(`showDmgFormula`) ? ` [${dmgFormula}]` : ``,
                            chatDmgType = dmgType !== 'None' ? ` ${dmgType}` : '',
                            chatSuccess = successMod !== 1 ? `succeeded` : `failed`,
                            saveResultFormula = ` [${advantage} + ${saveBonus} ${attr.toUpperCase().slice(0,3)}]`,
                            chatSaveResult = `${results[0]}${saveResultFormula}`,
                            chatResistance = getState(`showResistance`) ? immune ? ` but was **Immune to ${dmgType}**` : resistanceMod !== 1 ? ` and had **Resistance to ${dmgType}**` : `` : ``,
                            hpAdjResistance = getState(`showResistance`) ? resistanceMod !== 1 ? ` x ${resistanceMod} RESIST` : '' : '',
                            hpAdjImmune = getState(`showResistance`) ? immune ? ` x 0 IMMUNE` : '' : '',
                            chatHpAdjusted = immune ? `no` : getState(`showDmgFormula`) ? `[[${dmgFinal} [${results[1]}${hpAdjResistance}${hpAdjImmune}] +d0]]` : `[[${dmgFinal}]]`,
                            colorSuccess = success ? true : immune ? true : false,
                            target = char ? char : token;
                        let oldHP = dmgFinal ? dealDamage(target, results[1]) : ''; // ready to build in "revert damage" functionality
                        _.map(players, id => {
                            let controllerName = getObj('player', id).get('_displayname'),
                                shortName = controllerName.split(' ', 1)[0];
                            return shortName;
                        });
                        if (getState(`notifyPlayer`)) {
                            if (getState(`notifyGM`)) {
                                players.unshift(`gm`);
                            }
                            _.each(players, controllerName => {
                                toChat(buildOutput(), colorSuccess, controllerName);
                            })
                        } else if (getState(`notifyGM`)) {
                            toChat(buildOutput(), colorSuccess, `gm`);
                        }
                        return;

                        function buildOutput() {
                            let output = `**${tokenName}** attempted a **${chatDC}${attr}** save, ${chatAdv}**${chatSucEffect} [[${results[1]}${chatDmgFormula} +d0]]${chatDmgType}** damage.<br>**${tokenName} ${chatSuccess}** the save with a roll of [[${chatSaveResult} +d0]]${chatResistance}, so **lost ${chatHpAdjusted} hit points.**<br><div style="text-align: center">[REVERT](!ast revert ${token.id} ${oldHP})</div>`;
                            return output;
                        }
                    });
                }
            });
        },

        addPCAttr = function (msg) {
            let parts = msg.content.split(' '),
                dmgTypes = ['Acid', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Poison', 'Psychic', 'Radiant', 'Thunder'],
                resTypes = ['Resistance', 'Immunity'];
            if (dmgTypes.includes(parts[2]) && resTypes.includes(parts[1])) {
                _.each(msg.selected, obj => {
                    let token = getObj(obj._type, obj._id),
                        charid = token.get('represents'),
                        char = charid ? getObj('character', charid) : '';
                    if (char) {
                        let attr = findObjs({_type: 'attribute', _characterid: charid, name: parts[1].toLowerCase()})[0];
                        if (attr) {
                            attr.set('value', getAttrByName(charid, parts[1])+`, ${parts[2]}`);
                            toChat(`${parts[1]} to ${parts[2]} added for ${char.get('name')}!`, true, playerName);
                        } else {
                            createObj('attribute', {
                                _characterid: charid,
                                name: parts[1].toLowerCase(),
                                value: parts[2]
                            });
                        }
                    } else {
                        error(`Could not find a character sheet for token '${token}'. Are you sure the token represents a sheet?`, 13);
                        return;
                    }
                });
            } else if (!resTypes.includes(parts[1])) {
                error(`This API can only grant characters 'resistance' or 'immunity'. You entered '${parts[1]}'.`, 14);
                return;
            } else {
                error(`Could not add a ${parts[1]} to ${parts[2]} because no such damage type exists.`, 12);
                return;
            }
        },

        dealDamage = function (target, dmg) {
            let currentHP,
                newHP;
            if (target.get('_type') === 'character') {
                currentHP = getAttrByName(target.id, 'hp');
                newHP = currentHP - dmg;
                let attr = findObjs({ _type: 'attribute', _characterid: target.id, name: 'hp' })[0];
                attr.setWithWorker({ current: newHP });
            } else {
                currentHP = target.get(`bar${getState('hpBar')}_value`);
                newHP = currentHP - dmg;
                target.set(`bar${getState('hpBar')}_value`);
            }
            return currentHP;
        },

        revert = function (msg) {
            let parts = msg.content.split(' '),
                token = getObj('graphic', parts[2]),
                charid = token.get('represents'),
                char = charid ? getObj('character', charid) : '';
            if (char) {
                let attr = findObjs({ _type: 'attribute', _characterid: charid, name: 'hp' })[0],
                    hp = !isNaN(parts[3]) ? parts[3] : getAttrByName(charid, 'hp', 'max');
                attr.setWithWorker({ current: hp });
                toChat(`**Character ${token.get('name')}'s hp reverted to ${hp}.**`, true);
            } else {
                let hp = !isNaN(parts[3]) ? parts[3] : token.get(`bar${getState('hpBar')}_max`);
                token.set({ current: hp });
                toChat(`**Token ${token.get('name')}'s bar${getState('hpBar')} reverted to ${hp}.**`, true);
            }
            return;
        },

        getState = function (value) {
            return state[`${stateName}_${value}`];
        },

        roll = function (formula) {
            return new Promise(resolve => {
                sendChat('', '/r ' + formula, results => {
                    resolve(JSON.parse(results[0].content).total);
                });
            });
        },
        
        code = function (snippet) {
            return `<span style="background-color: rgba(0, 0, 0, 0.5); color: White; padding: 2px; border-radius: 3px;">${snippet}</span>`;
        },

        toChat = function (message, success, target) {
            let style = '<div>',
                whisper = target ? `/w ${target} ` : '';
            if (success === true) {
                style = `<br><div style="background-color: #5cd65c; color: Black; padding: 5px; border-radius: 10px;">`;
            } else if (success === false) {
                style = `<br><div style="background-color: #ff6666; color: Black; padding: 5px; border-radius: 10px;">`;
            }
            sendChat(name, `${whisper}${style}${message}</div>`);
        },

        toPlayer = function (message, success) {
            if (!success) {
                sendChat(name, `/w ${playerName} ` + message);
            } else {
                sendChat(name, `/w ${playerName} ` + '<br><div style="background-color: #5cd65c; color: Black; padding: 5px; border-radius: 10px;">' + message + '</div>');
            }
        },

        error = function (error, code) {
            if (playerName) {
                sendChat(nameError, `/w ${playerName} <br><div style="background-color: #ff6666; color: Black; padding: 5px; border-radius: 10px;">**${error}** Error code ${code}.</div>`);
            } else {
                sendChat(nameError, `<br><div style="background-color: #ff6666; color: Black; padding: 5px; border-radius: 10px;">**${error}** Error code ${code}.</div>`);
            }
            log(nameLog + error + ` Error code ${code}.`);
        },

        startupChecks = function () {
            _.each(states, variable => {
                let values = variable[1] ? variable[1] : [true, false],
                    defaultValue = variable[2] ? variable[2] : true;
                if (!state[`${stateName}_${variable[0]}`] || !values.includes(state[`${stateName}_${variable[0]}`])) {
                    error(`**'${variable[0]}'** value **was '${state[`${stateName}_${variable[0]}`]}'** but has now been **set to its default** value, '${defaultValue}'.`, -1);
                    state[`${stateName}_${variable[0]}`] = defaultValue;
                }
            })
        },

        registerEventHandlers = function () {
            on('chat:message', handleInput);
        };

    return {
        StartupChecks: startupChecks,
        RegisterEventHandlers: registerEventHandlers,
        CheckMacros: checkMacros
    };
}());

on('ready', function () {
    'use strict';
    AreaSavingThrow.StartupChecks();
    AreaSavingThrow.RegisterEventHandlers();
    AreaSavingThrow.CheckMacros();
});