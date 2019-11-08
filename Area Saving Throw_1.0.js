/*
README
To add resistances to players, add the damage type they have resistance to in an attribute named "resistances" on their character sheet.
(eg. https://dl.dropbox.com/s/odd6jvccosgiho8/resistances_example.png )

When a GM first joins the game, two macros will be created: "AST" and "ASTcustom".
AST is the default Macro and the one I recommend using. It is most appropriate for dealing with NPC and Player tokens that represent sheets. If tokens do not represent a sheet, use "ASTcustom".
ASTcustom takes a number input for the Saving Throw Bonus, rather than the relevent attribute (4 instead of DEX) so that tokens that do not represent a sheet can still roll using this API.

Area Saving Throw written by Layton - https://app.roll20.net/users/1519557/layton
Typical Input: !ast dex no 15 half 30 fire
Macro: !ast ?{Saving throw attribute?|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma} ?{Advantage?|No|Advantage|Disadvantage} ?{Save DC} ?{Effect on a success|Half Damage,half|No Damage,none} ?{Damage} ?{Damage Type|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder}
*/

// Standard Setups
const AST_name = 'AST';
const AST_state_name = 'AREASAVINGTHROW';
const AST_error = AST_name+" ERROR";

// Debugging
const AST_debug = false;

// Roll Settings
let AST_individualRolls = true; // Roll damage for each character seperately (if formula)
let AST_hpbar = 3; // which token bar to adjust for hp

// Chat Outputs
let AST_notifyGm = true; // send the GM a private message about every creature that this api affects
let AST_notifyPlayers = true; // if this api affects a token that is controlled by a player, notify that player of what affected their token
let AST_showDmg = true; // show damage formula in output (total will be shown regardless)
let AST_showDc = true; // show DC in output (success or fail will be shown regardless)
let AST_showResistance = true; // show resistance in output
let AST_showAdv = true; // show advantage in output

// Area Saving Throw
on("ready", function() {
    log("Area Saving Throw API Ready!");
    if (findObjs({_type: "player", _online: true})[0] !== undefined) { // if there is a player online when the macro loads
        for (let i = 0; i < findObjs({_type: "player", _online: true}).length; i++) { // test every player online
            if (findObjs({_type: "macro", name: "ast"}, {caseInsensitive: true})[0] === undefined && (playerIsGM(findObjs({_type: "player", _online: true})[i].id))) { // if there is not a macro and an online player is gm, create macro
                sendChat(AST_name, "/w gm Created AST macro.")
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "AST",
                    visibleto: "all",
                    action: "!ast ?{Saving throw attribute?|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma} ?{Advantage?|No|Advantage|Disadvantage} ?{Save DC} ?{Effect on a success|Half Damage,half|No Damage,none} ?{Damage} ?{Damage Type|None,|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder}"
                });
            }
            if (findObjs({_type: "macro", name: "astcustom"}, {caseInsensitive: true})[0] === undefined && playerIsGM(findObjs({_type: "player", _online: true})[i].id)) {
                sendChat(AST_name, "/w gm Created ASTcustom macro.")
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "ASTcustom",
                    visibleto: "all",
                    action: "!ast ?{Saving throw bonus|0} ?{Advantage?|No|Advantage|Disadvantage} ?{Save DC|} ?{Effect on a success|Half Damage,half|No Damage,none} ?{Damage} ?{Damage Type|None,|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder}"
                });
            }
        }
    }
    on("chat:message", function (msg) {
        if (msg.type === "api" && msg.content.split(' ')[0] === "!ast" && playerIsGM(msg.playerid))  {
            AreaSavingThrow(msg);
        } else if (msg.type === "api" && msg.content.split(' ')[0] === "!ast" && !playerIsGM(msg.playerid)) {
            sendChat(AST_error, "Sorry, "+msg.who+". Only DM's can use the Area Saving Throw API.");
        }
    });
});

function AreaSavingThrow(msg)
{
    if (AST_debug) {log("AST Main function called.");}

    let parts;
    if (!msg.selected) { 
        sendChat(AST_error, "/w gm No token was selected.");
        return; 
    } else {
        parts = msg.content.toLowerCase();
        parts = parts.split(' ');
    }

    // Part 0 check
    if (!msg.content.replace("!ast","")) {
        sendChat(AST_error, "/w gm No command.");
        return;
    }

    if (!parts[3] || isNaN(parseInt(parts[3]))) {
        if (AST_debug) {log("Save DC caused issue.");}
        sendChat(AST_error, "/w gm Save DC incorrectly entered."); return;
    } else if (!parts[4] || (parts[4] != "half" && parts[4] != "none")) {
        if (AST_debug) {log("Damage on success caused issue: "+parts[4]);}
        sendChat(AST_error, "/w gm Damage on success incorrectly entered."); return;
    } else if (!parts[5]) {
        if (AST_debug) {log("Damage input caused issue.");}
        sendChat(AST_error, "/w gm Damage incorrectly entered."); return;
    } else {
        if (AST_debug) {log("DC & Damage checks passed.");}
    }

    // All Parts check
    if (parts.length < 5) { // if there are less than five parts
        sendChat(AST_error, "/w gm Not all variables entered correctly."); return; // error msg and return nothing
    } else if (parts.legnth > 6) {
        sendChat(AST_error, "/w gm Not all variables entered correctly."); return; // error msg and return nothing
    } else {
        for (let i = 1; i < 5; i++) { // if any of those 5 parts are empty strings
            if (!parts[i]) {
                sendChat(AST_error, "/w gm Not all variables entered correctly."); return; // error msg and return nothing
            }
        }
    }

    // If all parts checked out
    if (AST_debug) {log("Got through allClear")};

    // Part 1, Ability Attribute
    let attr = "";
    let attrNpcSave = "";
    let useAttr = true;
    let attrChat = "";
    if (!parseInt(parts[1])) {
        switch (parts[1]) {
            case "str":
            case "strength":
                attr = "strength_mod";
                attrNpcSave = "npc_str_save_base";
                break;
            case "dex":
            case "dexterity":
                attr = "dexterity_mod";
                attrNpcSave = "npc_dex_save_base";
                break;
            case "con":
            case "constitution":
                attr = "constitution_mod";
                attrNpcSave = "npc_dex_save_base";
                break;
            case "int":
            case "intelligence":
                attr = "intelligence_mod";
                attrNpcSave = "npc_int_save_base";
                break;
            case "wis":
            case "wisdom":
                attr = "wisdom_mod";
                attrNpcSave = "npc_wis_save_base";
                break;
            case "cha":
            case "charisma":
                attr = "charisma_mod";
                attrNpcSave = "npc_cha_save_base";
                break;
            default:
                sendChat(AST_name, "/w gm Ability attribute entered incorrectly. As an example, to use Strength enter \"str\" or \"Strength\".");
                return;
        }
        attrChat = attr.replace("_mod","");
    } else {
        useAttr = false;
        attr = parts[1];
        if (attr.search('-') === -1) {
            attrChat = "+"+String(attr)+" modifier";
        } else {
            attrChat = String(attr)+" modifier";
        }
    }

    // Part 2, Advantage
    let adv = 0;
    switch (parts[2]) {
        case "no":
        case "none":
            adv = 0;
            break;
        case "adv":
        case "advantage":
            adv = 1;
            break;
        case "dis":
        case "disadv":
        case "disadvantage":
            adv = 2;
            break;
        default:
            sendChat(AST_error, "/w gm Advantage variable entered incorrectly. Enter \"no\" for no advantage, \"adv\" for advantage, or \"dis\" for disadvantage.");
            return;
    }

    // Part 3, Save DC
    let dc = parseInt(parts[3]);

    // Part 4, Effect on Success
    let successMod = 2;
    switch (parts[4]) {
        case "half":
            successMod = 2;
            break;
        case "none":
            successMod = 1;
            break;
        default:
            sendChat(AST_error, "/w gm Effect on success entered incorrectly. Enter \"half\" for half damage, or \"none\" for no damage.");
            return;
    }

    // Part 5, Damage
    if (AST_debug) {log("Before Damage: parts[5]="+parts[5])}
    let dmgIn = [3];
    parts[5] = parts[5].replace(" ", ""); // Remove spaces
    if (parts[5].search("-") === 0 || parts[5].charAt(parts[5].search("d")+1) === "-") {sendChat(AST_error, "Damage cannot be negative."); return;} // if input is negative post error and return nothing
    dmgIn = parts[5].split(/[d\\+\-]/i); // Create array "dmgIn" that contains xDy+z to be rolled as a damage variable
    if (AST_debug) {log("Midway Through Damage: dmgIn="+dmgIn)}
    if (parts[5].search('\-') != -1 && dmgIn[2]) {
        dmgIn[2] = parts[5].slice(parts[5].search('\-')); // if the formula contains a negative, set dmgIn[2] to that negative
    } else if (parts[5].search('\-') != -1 && dmgIn[1]) {
        dmgIn[1] = parts[5].slice(parts[5].search('\-')); // same with dmgIn[1] if there are only 2 inputs
    }
    // Formula Chat Output
    let dmgFormula = "";
    if (AST_showDmg) {
        dmgFormula = "("+parts[5]+")";
        dmgFormula = dmgFormula.replace(",", "d");
    }
    if (AST_debug) {log("Damage: dmgIn="+dmgIn+" | parts[5]="+parts[5]+" | dmgFormula="+dmgFormula+" | parts[5].split="+parts[5].split(/['d','\\+','\-']/))}

    // Part 6, Damage Type
    let dmgInType = "";
    if (parts[6]) {
        dmgInType = parts[6];
    } 

    // Clear chat slightly
    sendChat(AST_name, "/w gm - AST -");

    let dmg;
    // Damage if individualRolls = false
    if (!AST_individualRolls) {
        dmg = calcDmg(parts[5], dmgIn);
    }

    // Outputs
    _.each(msg.selected, function (obj) {
        if (obj._type === "graphic") {

            if (AST_debug) {log("o._type = graphic.");}

            // get objects
            let token = getObj(obj._type, obj._id);
            let char;
            if (getObj("character", token.get("represents"))) {
                char = getObj("character", token.get("represents"));
            }

            // dmg setup
            if (AST_individualRolls) {
                dmg = calcDmg(parts[5], dmgIn);
            }
            // dmg chat output setup
            let dmgChat = "";
            if (AST_individualRolls) {
                dmgChat = " received [["+dmg+"]] "+dmgFormula+" "+dmgInType+" damage,";
            }

            // Resistances setup
            let dmgMod = 1;
            let resistant = "";
            let resPC = findObjs({name: "resistances",_type: "attribute", _characterid: char.id}, {caseInsensitive: true})[0];
            let resNPC = findObjs({name: "npc_resistances",_type: "attribute", _characterid: char.id}, {caseInsensitive: true})[0];
            if (dmgInType) {
                if (token.get("represents")) { // if the token represents a character
                    if (resNPC) { // and the character has anything in the "npc_resistances" field
                        if (resNPC.get("current").toLowerCase().search(dmgInType) !== -1) { // compare that field to the type of damage
                            dmgMod = 2; // if found, half the damage that token takes
                            resistant = " **was resistant** and";
                        }
                    }
                    if (resPC) {
                        if (resPC.get("current").toLowerCase().search(dmgInType) !== -1) {
                            dmgMod = 2;
                            resistant = " **was resistant** and";
                        }
                    }
                }
            }

            // - - - Saving Throw Roll - - -
            if (AST_debug) {log("useAttr = " + useAttr + " | Token Represents = " + token.get("represents"));}

            // Set Attribute bonus
            let attrBonus = 0;
            let attrProf = attr.replace("_mod", "_save_prof");
            if (useAttr && token.get("represents")) { // if using attributes and the token represents a sheet
                // Get Attribute Bonuses
                let charAttr = findObjs({type: "attribute", _characterid: char.id, name: attr})[0];
                let charAttrVal;
                if (charAttr) {
                    charAttrVal = parseInt(charAttr.get("current"));
                }
                let charAttrCheck = findObjs({type: "attribute", _characterid: char.id, name: attrProf})[0];
                let charAttrProf = findObjs({type: "attribute", _characterid: char.id, name: "pb"})[0];
                let charAttrProfVal;
                if (charAttrCheck) {
                    charAttrProfVal = parseInt(charAttrProf.get("current"));
                }
                let npcAttrSave = findObjs({type: "attribute", _characterid: char.id, name: attrNpcSave})[0];
                let npcAttrSaveVal;
                if (npcAttrSave) {
                    npcAttrSaveVal = parseInt(npcAttrSave.get("current"));
                }
                // Set which attribute bonus is to be used
                if (!isNaN(charAttrVal) && !isNaN(charAttrProfVal)) { // if the character sheet has the relevant attribute and proficiency
                    attrBonus = charAttrVal + charAttrProfVal; // attrBonus = attribute mod + proficiency bonus
                } else if (!isNaN(npcAttrSaveVal)) { // if character sheet has NPC save proficiency
                    attrBonus = npcAttrSaveVal; // attrBonus = npc save bonus
                } else if (!isNaN(charAttrVal)) { // if character sheet has relevant attribute (no proficiency)
                    attrBonus = charAttrVal; // attrBonus = attribute mod
                } else {
                    sendChat(AST_error, "/w gm Some selected tokens had no relevant bonus on their sheets. For these tokens, attrBonus = 0");
                    attrBonus = 0;
                }
            } else if (useAttr) {
                sendChat(AST_error, "/w gm Some selected tokens did not represent a sheet. For these tokens, attrBonus = 0");
            } else if (!useAttr) {
                attrBonus = parseInt(parts[1]);
            } else {
                sendChat(AST_error, "/w gm Unknown error related to Attribute bonus.");
                return;
            }

            // Advantage chat setup
            let advChat;
            if (adv === 0) {
                advChat = "";
            } if (adv === 1) {
                advChat = " with **advantage**";
            } if (adv === 2) {
                advChat = " with **disadvantage**";
            }

            // Set success
            let success = 0;
            let successMsg = "";
            let roll = rollSave(adv);
            let result = roll + attrBonus;
            if (result >= dc) {
                success = 2;
            } else {success = 1}
            // Set success message
            if (success === 2) {
                if (AST_debug) {log("AST DEBUG", "Roll: "+String(roll)+" | attrBonus: "+String(attrBonus));}
                successMsg = " **succeeded** at their save with a [["+String(roll)+"+"+String(attrBonus)+"]] and";
            } else if (success === 1) {
                if (AST_debug) {log("AST DEBUG", "Roll: "+String(roll)+" | attrBonus: "+String(attrBonus));}
                successMsg = " **failed** at their save with a [["+String(roll)+"+"+String(attrBonus)+"]] and";
            } else {
                sendChat(AST_error, "/w gm Unknown error occured during saving throw roll: Success was never determined.");
                return;
            }
            // Half Damage on Success Setup
            if (successMod === 2) { // if half damage on success
                successMod = success; // set the success mod to match success
            } else {
                successMod = 1;
            }
            
            // Name setup
            let name = "";
            if (token.get("name")) {
                name = token.get("name");
            } else {
                name = "Creature";
            }

            // Players chat setup
            let player = "";
            if (char.get("controlledby")) {
                player = char.get("controlledby");
            } else if (token.get("controlledby")) {
                player = token.get("controlledby");
            }

            // Final damage setup
            let dmgFinal = Math.floor(dmg / (dmgMod * successMod));
            if (dmgFinal < 1) {dmgFinal = 1}

            // Tell chat about health removal
            if (success === 1 || success === 2) {
                dmgToChat(player, name, dc, attrChat, advChat, dmgChat, successMsg, resistant, String(dmgFinal));
                // Apply health removal
                if (AST_debug) {sendChat("AST DEBUG", "/w gm Bar " + AST_hpbar + " changed.");}
                if (AST_hpbar === 1) {
                    token.set({
                        bar1_value: (token.get("bar1_value") - dmgFinal) // New health = Old health - (dmg / (dmgMod * success))
                    });
                } else if (AST_hpbar === 2) {
                    token.set({
                        bar2_value: (token.get("bar2_value") - dmgFinal) // New health = Old health - (dmg / (dmgMod * success))
                    });
                } else if (AST_hpbar === 3) {
                    token.set({
                        bar3_value: (token.get("bar3_value") - dmgFinal) // New health = Old health - (dmg / (dmgMod * success))
                    });
                } else {
                    sendChat(AST_error, "/w gm No token bar was selected for "+name+".");
                    return;
                }
            } else {
                sendChat(AST_error, "/w gm Error with "+name+"'s success output.");
                return;
            }
        } else {
            sendChat(AST_error, "/w gm Some selected items were not tokens.");
            return;
        }
    });

    function  rollSave (adv)
    {
        if (AST_debug) {sendChat("AST DEBUG", "/w gm rollSave function called");}

        let result = 0;
        let results = [];
        if (adv === 0) { // if no advantage
            result = randomInteger(20); // roll one d20
            return result; // return d20 result

        } else if (adv === 1) { 
            results[0] = randomInteger(20); 
            results[1] = randomInteger(20); // roll two d20
            result = Math.max.apply(Math, results); // keep higher d20 result
            return result; // return result

        } else if (adv === 2) {
            results[0] = randomInteger(20); 
            results[1] = randomInteger(20); // roll two d20
            result = Math.min.apply(Math, results); // keep lower d20 result
            return result; // return result
        }
    }

    function dmgToChat (player, name, dc, attr, adv, dmgChat, successMsg, resistant, dmg) 
    {
        if (AST_notifyGm) {
            sendChat(AST_name, "/w gm **" + name + "** attempted a **DC " + dc + " " + String(attr) + " save**, " + adv + dmgChat + successMsg + resistant + " **lost [[" + dmg + "]] hit points**.");
        } if (!AST_showDmg) {
            dmgChat = "";
        } if (!AST_showDc) {
            dc = "";
        } if (!AST_showResistance) {
            resistant = "";
        } if (!AST_showAdv) {
            adv = "";
        } if (AST_notifyPlayers) {
            let players;
            player = player.replace(",all,","");
            player = player.replace(",all","");
            player = player.replace("all,","");
            player = player.replace("all","");
            players = player.split(",");
            if (players[0] !== "") {
                for (let i = 0; i < players.length; i++) {
                    sendChat(AST_name, "/w " + players[i] + " **" + name + "** attempted a **DC " + dc + " " + String(attr) + " save**, "+ adv + dmgChat + successMsg + resistant + " **lost [[" + dmg + "]] hit points**.");
                }
            }
        }
        return;
    }

    // --- FUNCTIONS ---
    function xDy (x, y)
    {
        let diceTot = 0;
        for (let i = 0; i < x; i++)
        {
            diceTot += randomInteger(y);
        }
        return diceTot;
    }

    function calcDmg (part, dmgIn)
    {
        if (AST_debug){log("calcDmg: dmgIn="+dmgIn+" | part="+part)}
        let dmg = 0;
        if (part.search("d") !== -1) {
            if (!dmgIn[0] && dmgIn[2]) {
                dmg = xDy(1, parseInt(dmgIn[1])) + parseInt(dmgIn[2]);
            } else if (dmgIn[2]) {
                dmg = xDy(parseInt(dmgIn[0]), parseInt(dmgIn[1])) + parseInt(dmgIn[2]);
            } else if (!dmgIn[0] && dmgIn[1]) {
                dmg = xDy(1, parseInt(dmgIn[1]));
            } else if (dmgIn[1]) {
                dmg = xDy(parseInt(dmgIn[0]), parseInt(dmgIn[1]));
            } else {
                dmg = parseInt(dmgIn[0]);
            }
        } else if (dmgIn[1]) {
            dmg = parseInt(dmgIn[0]) + parseInt(dmgIn[1]);
        } else {
            dmg = parseInt(dmgIn[0]);
        }
        return dmg;
    }
}