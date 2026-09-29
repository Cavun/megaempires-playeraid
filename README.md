https://cavun.github.io/megaempires-playeraid/
Player aid for Mega Empires
Includes short descriptions for each phase and relevent Civilization Advances for each phase, click card to open image of it for quick reference.
Also includes a census and city count helper page
Also includes a calamity resolution organizer (primary/secondary victims & beneficiaries), with 12-18 player West/East block rules for the full 18-civilization roster

## Tests

The Census & City Helper has an end-to-end test suite (Playwright + Chromium)
covering removals and their persistence, the per-civ timers, the alert/flash/
green-row behaviour and the sort order.

```
npm install
npx playwright install chromium   # only needed the first time
npm test
```

The suite serves the repository over http:// with `tests/static-server.js`, and
uses Playwright's fake clock so the timer tests run instantly.
