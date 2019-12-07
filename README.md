# AreaSavingThrow
Roll20 API for Group Saving Throws using the Roll20 D&amp;D 5th Edition OGL Sheet. 

---

## Macros
All the automatically generated macros and how they should be used.
<br><br>
### AreaSave / AreaSaveCustom `!ast`
Rolls the specified save for every selected token, and adjusts their health automatically based on rolls and the input damages. AreaSave takes an attribute as the roll bonus (such as `Strength`) and AreaSaveCustom takes a number as the roll bonus (such as `5`).

#### Standard Input
`!ast` `attribute/bonus` `advantage` `saveDC` `effectOnSuccess` `dmgFormula` `dmgType`

##### `attribute/bonus`
- Either an Attribute such as `Strength` or `Wisdom`, or a number such as `5`. If a number is provided, all selected creatures will use that number as their save bonus.

##### `advantage`
- `None`, `Advantage`, or `Disadvantage`. All selected creatures will roll with the selected option.
  
##### `saveDC`
- The DC that all selected creatures must meet or exceed to succeed at their save.

##### `effectOnSuccess`
- `Half Damage`, `No Damage`, or `No Change`. If a creature succeeds its save, this is how much of the rolled damage they will take.

##### `dmgFormula`
- The damage formula to be rolled. This must match the kind of input Roll20 can take with the `/r` command.`],

##### `dmgType`
- The type of incoming damage. Each creature will be checked for immunity and resistance to this damage, and the damage they take will be adjusted appropriately.
<br><br>
### AreaSaveConfig `!ast config`
Lists the settings for the AreaSavingThrow API and provides buttons to toggle their changes.
<br><br>
### AreaSaveHelp `!ast help`
Lists the commands for the AreaSavingThrow API and their usage.

---

## Contact Information and Bug Reporting
I check both Roll20 and GitHub frequently, so feel free to fill out an [Issue Report on GitHub](https://github.com/LaytonGB/AreaSavingThrow/issues/new) or to [Message Me on Roll20](https://app.roll20.net/users/1519557/layton) if you're having issues.
