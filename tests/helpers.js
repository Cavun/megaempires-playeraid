/*
 * Shared helpers for the Census & City Helper tests.
 */
const PAGE_URL = '/censusandcityhelper.html';

// The census table is the first table on the page; the city table and the
// "not in game" table have their own tbodies.
const ACTIVE_ROWS = '#active-tbody tr';

/*
 * Replaces AudioContext with a recorder so the tests can assert that the
 * timer really made a noise, without a sound card in the container.
 * Every oscillator start() is pushed onto window.__beeps.
 */
function audioStub() {
  window.__beeps = [];
  function FakeAudioContext() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  FakeAudioContext.prototype.resume = function() { this.state = 'running'; };
  FakeAudioContext.prototype.createBuffer = function() { return {}; };
  FakeAudioContext.prototype.createBufferSource = function() {
    return { buffer: null, connect: function() {}, start: function() {}, onended: null };
  };
  FakeAudioContext.prototype.createGain = function() {
    return {
      connect: function() {},
      gain: { setValueAtTime: function() {}, exponentialRampToValueAtTime: function() {} }
    };
  };
  FakeAudioContext.prototype.createOscillator = function() {
    return {
      frequency: { value: 0 },
      connect: function() {},
      start: function(when) { window.__beeps.push({ when: when, frequency: this.frequency.value }); },
      stop: function() {}
    };
  };
  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = FakeAudioContext;
}

/*
 * Opens the helper on a clean localStorage with a frozen clock, so the timer
 * tests can advance time deterministically with page.clock.runFor().
 */
async function openHelper(page, options) {
  const opts = options || {};
  await page.addInitScript(audioStub);
  if (opts.clock !== false) await page.clock.install();
  // localStorage is per-origin, so it has to be cleared from a page already
  // on that origin, then the page under test reloaded from that clean state.
  await page.goto(PAGE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(ACTIVE_ROWS).first().waitFor();
}

/*
 * Shrinks the game down to the named civs by seeding the shared "not in
 * game" list, so a test can work with a handful of rows instead of all 18.
 */
async function keepOnly(page, names) {
  await page.evaluate((keep) => {
    var removed = MEGA_EMPIRES_CIVS
      .filter(function(c) { return keep.indexOf(c.name) === -1; })
      .map(function(c) { return { ast: String(c.ast), name: c.name }; });
    localStorage.setItem(MEGA_EMPIRES_NOT_IN_GAME_KEY, JSON.stringify(removed));
  }, names);
  await page.reload();
  await page.locator(ACTIVE_ROWS).first().waitFor();
}

/*
 * Shrinks the game to `count` civs, always keeping Assyria (AST 3) and
 * Egypt (AST 17) in, since those are the two whose block depends on the
 * size of the game. The rest are filled in from the top of the AST.
 */
async function keepCount(page, count) {
  await page.evaluate((n) => {
    var first = [3, 17]; // Assyria and Egypt – the two movable civs
    var order = first.concat(
      MEGA_EMPIRES_CIVS
        .map(function(c) { return c.ast; })
        .filter(function(a) { return first.indexOf(a) === -1; })
    );
    var keep = order.slice(0, n);
    var removed = MEGA_EMPIRES_CIVS
      .filter(function(c) { return keep.indexOf(c.ast) === -1; })
      .map(function(c) { return { ast: String(c.ast), name: c.name }; });
    localStorage.setItem(MEGA_EMPIRES_NOT_IN_GAME_KEY, JSON.stringify(removed));
  }, count);
  await page.reload();
  await page.locator(ACTIVE_ROWS).first().waitFor();
}

/* Civ names in the census table, top to bottom. */
function activeCivNames(page) {
  return page.locator('#active-tbody tr .civ-name').allTextContents();
}

function rowFor(page, civName) {
  return page.locator(ACTIVE_ROWS).filter({ has: page.getByText(civName, { exact: true }) });
}

/* --- city table ------------------------------------------------------- */

const CITY_ROWS = '#cities-tbody tr';

/* Civ names in the city table, top to bottom. */
function cityCivNames(page) {
  return page.locator('#cities-tbody tr .civ-name').allTextContents();
}

function cityRowFor(page, civName) {
  return page.locator(CITY_ROWS).filter({ has: page.getByText(civName, { exact: true }) });
}

async function setCities(page, civName, value) {
  await cityRowFor(page, civName).locator('.census-input').fill(String(value));
}

async function removeCityCiv(page, civName) {
  await cityRowFor(page, civName).locator('.remove-btn').click();
}

/* The block shown for a civ in the city table ('' when blocks are hidden). */
function blockFor(page, civName) {
  return cityRowFor(page, civName).locator('.block-cell').textContent();
}

/* Every civ's block, as a { civName: block } map. */
async function allBlocks(page) {
  return page.evaluate(() => {
    var out = {};
    document.querySelectorAll('#cities-tbody tr').forEach(function(row) {
      out[row.querySelector('.civ-name').textContent] =
        row.querySelector('.block-cell').textContent;
    });
    return out;
  });
}

async function setCensus(page, civName, value) {
  // fill() dispatches an 'input' event, which is what the page listens for.
  await rowFor(page, civName).locator('.census-input').fill(String(value));
}

async function toggleMilitary(page, civName) {
  await rowFor(page, civName).locator('.mil-toggle').click();
}

async function removeCiv(page, civName) {
  await rowFor(page, civName).locator('.remove-btn').click();
}

async function setSharedTimer(page, value) {
  await page.locator('#shared-timer-input').fill(value);
}

async function startTimer(page, civName) {
  await rowFor(page, civName).locator('.timer-start-btn').click();
}

function timerDisplay(page, civName) {
  return rowFor(page, civName).locator('.timer-display');
}

module.exports = {
  PAGE_URL,
  ACTIVE_ROWS,
  CITY_ROWS,
  openHelper,
  keepOnly,
  keepCount,
  activeCivNames,
  cityCivNames,
  cityRowFor,
  setCities,
  removeCityCiv,
  blockFor,
  allBlocks,
  rowFor,
  setCensus,
  toggleMilitary,
  removeCiv,
  setSharedTimer,
  startTimer,
  timerDisplay
};
