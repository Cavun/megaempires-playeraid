/*
 * Calamity reference data for the Mega Empires Calamity Resolution page.
 *
 *  name       - exact calamity name as printed on the card
 *  tradeable  - fixed per calamity; does not vary between copies
 *  tier       - 'major' (always in play) or 'minor' (12-18 player games
 *               only, and specifically NOT used in 12-14 player games —
 *               only in 15-18 player games)
 *  areaEffect - whether victims are typically determined by board/token
 *               position rather than free player choice (used only to
 *               pre-fill the "Area effect" checkbox — still user-editable)
 *
 * Loaded by calamities.html only.
 */
var MEGA_EMPIRES_CALAMITIES = [
  // -- Major calamities (always in play) --
  { name: 'Volcanic Eruption',     tradeable: false, tier: 'major', areaEffect: true  },
  { name: 'Treachery',             tradeable: true,  tier: 'major', areaEffect: false },
  { name: 'Famine',                tradeable: false, tier: 'major', areaEffect: false },
  { name: 'Slave Revolt',          tradeable: true,  tier: 'major', areaEffect: false },
  { name: 'Flood',                 tradeable: false, tier: 'major', areaEffect: true  },
  { name: 'Superstition',          tradeable: true,  tier: 'major', areaEffect: false },
  { name: 'Civil War',             tradeable: false, tier: 'major', areaEffect: false },
  { name: 'Barbarian Hordes',      tradeable: true,  tier: 'major', areaEffect: true  },
  { name: 'Cyclone',               tradeable: false, tier: 'major', areaEffect: true  },
  { name: 'Epidemic',              tradeable: true,  tier: 'major', areaEffect: false },
  { name: 'Tyranny',               tradeable: false, tier: 'major', areaEffect: false },
  { name: 'Civil Disorder',        tradeable: true,  tier: 'major', areaEffect: false },
  { name: 'Corruption',            tradeable: false, tier: 'major', areaEffect: false },
  { name: 'Iconoclasm and Heresy', tradeable: true,  tier: 'major', areaEffect: false },
  { name: 'Regression',            tradeable: false, tier: 'major', areaEffect: false },
  { name: 'Piracy',                tradeable: true,  tier: 'major', areaEffect: false },

  // -- Minor calamities (all tradeable; 15-18 player games only) --
  { name: 'Tempest',               tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'Squandered Wealth',     tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'City Riots',            tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'City in Flames',        tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'Tribal Conflict',       tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'Minor Uprising',        tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'Banditry',              tradeable: true,  tier: 'minor', areaEffect: false },
  { name: 'Coastal Migration',     tradeable: true,  tier: 'minor', areaEffect: false }
];

function megaEmpiresGetCalamityByName(name) {
  var key = (name || '').trim().toLowerCase();
  for (var i = 0; i < MEGA_EMPIRES_CALAMITIES.length; i++) {
    if (MEGA_EMPIRES_CALAMITIES[i].name.toLowerCase() === key) return MEGA_EMPIRES_CALAMITIES[i];
  }
  return null;
}

// Minor calamities are excluded specifically for 12-14 player games,
// and used normally in 15-18 player games (and outside the 12-18 block
// system generally, since the exclusion is stated as a 12-14-specific rule).
function megaEmpiresMinorsHiddenForPlayerCount(count) {
  return count >= 12 && count <= 14;
}
