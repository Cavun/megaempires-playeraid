/*
 * Shared civilization reference data for the Mega Empires player aid.
 *
 *  ast   - Archaeological Succession Table rank (1-18)
 *  name  - civilization name
 *  block - 'West' (Mega Empires: The West, AST 1-17 odd) or
 *          'East' (Mega Empires: The East, AST 2-18 even)
 *
 * The block matters for 12-18 player games: when choosing the
 * beneficiary or secondary victims of a Non-Tradeable calamity,
 * players must be chosen from the same block as the primary victim.
 * Tradeable calamities may draw from either block.
 *
 * Loaded by censusandcityhelper.html and calamities.html so the
 * roster only has to be maintained in one place.
 */
var MEGA_EMPIRES_CIVS = [
  { ast: 1,  name: 'Minoa',    block: 'West' },
  { ast: 2,  name: 'Saba',     block: 'East' },
  { ast: 3,  name: 'Assyria',  block: 'West' },
  { ast: 4,  name: 'Maurya',   block: 'East' },
  { ast: 5,  name: 'Celt',     block: 'West' },
  { ast: 6,  name: 'Babylon',  block: 'East' },
  { ast: 7,  name: 'Carthage', block: 'West' },
  { ast: 8,  name: 'Dravidia', block: 'East' },
  { ast: 9,  name: 'Hatti',    block: 'West' },
  { ast: 10, name: 'Kushan',   block: 'East' },
  { ast: 11, name: 'Rome',     block: 'West' },
  { ast: 12, name: 'Persia',   block: 'East' },
  { ast: 13, name: 'Iberia',   block: 'West' },
  { ast: 14, name: 'Nubia',    block: 'East' },
  { ast: 15, name: 'Hellas',   block: 'West' },
  { ast: 16, name: 'Indus',    block: 'East' },
  { ast: 17, name: 'Egypt',    block: 'West' },
  { ast: 18, name: 'Parthia',  block: 'East' }
];

// Shared localStorage key so "not in game" status stays in sync between
// the Census & City Helper page and the Calamity Resolution page.
var MEGA_EMPIRES_NOT_IN_GAME_KEY = 'mega-empires-not-in-game';

function megaEmpiresGetCivByAst(ast) {
  ast = parseInt(ast);
  for (var i = 0; i < MEGA_EMPIRES_CIVS.length; i++) {
    if (MEGA_EMPIRES_CIVS[i].ast === ast) return MEGA_EMPIRES_CIVS[i];
  }
  return null;
}

function megaEmpiresGetNotInGame() {
  try {
    return JSON.parse(localStorage.getItem(MEGA_EMPIRES_NOT_IN_GAME_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

// Returns the roster (sorted by AST rank) currently marked "in game",
// i.e. not present in the shared "not in game" list.
function megaEmpiresGetActiveCivs() {
  var notInAsts = megaEmpiresGetNotInGame().map(function(c) { return parseInt(c.ast); });
  return MEGA_EMPIRES_CIVS.filter(function(c) { return notInAsts.indexOf(c.ast) === -1; });
}
