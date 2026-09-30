# Geography Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Geography as a fourth subject, with 200 fill-in-the-blank world-geography facts, and turn the subject picker into a 2×2 grid of tiles so four subjects fit.

**Architecture:**
- Geography is a data file (`geography-bank.ts`) plus one registry entry. The shared engine in `bank.ts` does not change.
- The picker in `overlay.tsx` changes from a column of full-width buttons to tiles that wrap two per row, the same way the answer pad lays out its buttons.
- The reducer, scoring, levels, HUD, answer pad and falling card do not change.

**Tech Stack:** Expo SDK 57, Expo Router, React 19.2 (React Compiler on), React Native 0.86, Reanimated 4.5, jest-expo, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-09-30-geography-mode-design.md`. It builds on `docs/superpowers/specs/2026-09-30-science-mode-design.md`.

## Global Constraints

- **No new packages.** If one ever seems needed, stop and report.
- **No new Expo or React Native APIs.** Every prop and style this plan uses is already used in `src/components/game/answer-pad.tsx`: `numberOfLines`, `adjustsFontSizeToFit`, `minimumFontScale`, `maxFontSizeMultiplier`, `flexWrap`, `flexBasis`, `flexGrow` and `gap`.
- `src/game/**` must not import React, React Native, or Expo modules.
- Tests live in `__tests__/` (subfolders allowed) and are named `*-test.ts`. They import source by relative path. Files they import may use `@/…` only as `import type`, which is erased at test time.
- **Best-score storage keys:**
  - Math: `quiz-shooter:best-score` (unchanged)
  - English: `quiz-shooter:best-score:english` (unchanged)
  - Science: `quiz-shooter:best-score:science` (unchanged)
  - Geography: `quiz-shooter:best-score:geography` (new)
- **Geography subject:**
  - id `geography`, name `Geography`, shortName `GEOGRAPHY`, badge `N↑`
  - card `sentence`, fall time `sentenceFallMs`
  - picker order `['math', 'english', 'science', 'geography']`
- **Picker tile values (spec §1 and §3):**
  - Grid: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 12`, `alignSelf: 'stretch'`.
  - Tile: `flexBasis: '46%'`, `flexGrow: 1`, `paddingVertical: 14`, `paddingHorizontal: 8`, contents centered in a column.
  - Text sizes: badge 22 px, name 18 px, "Best N" 14 px. All three have `maxFontSizeMultiplier={1.4}`.
  - The name also has `numberOfLines={1}`, `adjustsFontSizeToFit` and `minimumFontScale={0.7}`.
  - The accessibility label stays `` `${name}, best ${best}` `` with `accessibilityRole="button"`.
- **Bank rules checked by tests (all three banks, Science spec §2):**
  - Exactly one `___` in the sentence and no `____`.
  - The sentence is trimmed, ends with `.`, `?` or `!`, and is **≤ 60 characters**.
  - Exactly 3 wrong choices. All 4 choices are distinct, including case-insensitively.
  - Each choice is non-empty, trimmed, 1–3 words and **≤ 16 characters**.
  - When the blank starts the sentence, every choice is capitalised.
  - Ids are unique and match `^<prefix>-<band>-\d{3}$` (prefix `en`, `sci` or `geo`).
  - No duplicate sentences. At least 35 items per band.
- **Geography content rules checked by a person (spec §2):**
  - Exactly one true choice. The wrong choices are clearly false but from the same category.
  - True as written, with no "well, actually" exceptions. Timeless, and no myths.
  - Nothing in flux:
    - capitals that are being moved
    - countries with more than one capital, or with a disputed capital
    - disputed territories and borders
    - recently renamed places, and names with competing spellings
    - population sizes and rankings
  - No contested records or model-dependent counts: the longest river, the number of continents or oceans, whether the Caspian Sea is a lake.
  - Records are qualified where they need it: "above sea level" for Mount Everest, "hot desert" for the Sahara.
  - For a capital, the wrong choices are real cities in the same country, and never another capital of that country.
  - Common English names, with accents where the name normally carries them (Brasília). "The" goes in the sentence, not in the choice.
  - Politically neutral. Suitable for all ages.
  - Digits for numbers, metric units, American spelling.
- Work on branch `feat/geography-mode`, created from `main`. Always `git add` explicit paths; never `git add -A` or `git add .`.
- Commit messages end with a blank line, then exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Done means `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass. All four pass on `main` today, with 519 tests.

## Review Focus

1. **A Geography fact that is wrong, has two true choices, is in flux, or takes a side.** The player would be marked wrong for a right answer, or the reveal would teach something false or contested. No unit test can judge truth.
   - Task 1's review **is** the spec §2 content review. It must read all 200 items against the person-checked rules. The rules this spec adds come first, then accuracy and "exactly one true choice".
   - Task 1's tests pin everything that can be checked mechanically.
2. **"Mathematics" cut off with "…" on a narrow phone at the largest text size.** The spec's shrink floor (`minimumFontScale={0.7}`) may not be low enough there.
   - On a 360 dp phone, a tile leaves about 101 px for the name.
   - "Mathematics" at 18 px bold is about 113 px wide. At the 1.4× cap it is about 160 px, so it needs to shrink to about 0.63.
   - These widths are estimates, so this plan keeps the spec's 0.7. No unit test can measure text, so Task 4's device check covers it.
   - If the device check shows "…", change `minimumFontScale` to `0.6` (the value the answer pad uses) in `overlay.tsx` and in spec §1, and say so in the report.
3. **The `N↑` badge showing an empty box.** The arrow (U+2191) must exist in the phone's system font. Task 4's device check covers it.
4. **Upgrading players losing their saved bests.** The Math, English and Science keys must not change.
   - Test: `best-score-keys-test.ts` asserts all four keys (Task 3).
5. **Geography silently getting the Math card or the Math fall speed.**
   - Tests: the card-kind and fall-time cases in `subjects-test.ts` (Task 3).

## Plan decisions not spelled out in the spec

- **Task order:** the bank first, then the picker grid, then the registry entry. That way no commit shows four full-width buttons, which the spec says do not fit. Between Task 2 and Task 3 the picker shows three tiles, with the third stretched across the second row.
- **Naming in `overlay.tsx`:** `SubjectButton` is renamed `SubjectTile`. The `subjectButton` style becomes `subjectTile`, the `subjectText` style is removed, and a `subjectGrid` style is added.
- **The name text gets `alignSelf: 'stretch'` and `textAlign: 'center'`.** That gives it the tile's full width, so `adjustsFontSizeToFit` has a fixed width to shrink into.
- **The tile keeps** today's `borderRadius: 16` and `borderWidth: 2`.
- **All 200 Geography items are fixed in this plan (Task 1), 40 per band.** They have already been run through every rule the tests check:
  - longest sentence: 58 characters
  - longest choice: 16 characters
  - longest sentence with the answer filled in: 60 characters
- **Facts left out on purpose.** A replacement item must not bring any of these back:
  - Capitals, beyond the spec's list:
    - Egypt and South Korea: government offices are moving to a new city.
    - Switzerland: it has no official capital.
    - Chile, Malaysia and Tanzania: the government is split between two cities.
  - Names and records:
    - the Gulf of Mexico and Denali (names in dispute)
    - the Dead Sea (disputed borders)
    - the highest waterfall and Europe's highest mountain (contested records)
  - As wrong choices:
    - Cusco: Peru's constitution calls it the historical capital.
    - Baguio: it is the Philippines' summer capital.
    - Edinburgh: it is a capital inside the United Kingdom.

## File Map

| File | Task | Responsibility |
|---|---|---|
| `src/game/geography-bank.ts` | 1 | `GEOGRAPHY_BANK` (200 items) |
| `src/components/game/overlay.tsx` | 2 | Picker becomes a 2×2 grid of `SubjectTile`s |
| `src/game/subjects.ts` | 3 | `'geography'` id, registry entry, `SUBJECT_IDS` order |
| `src/hooks/best-score-keys.ts` | 3 | Geography storage key |
| `src/hooks/use-best-scores.ts` | 3 | `geography: 0` initial best |
| `README.md` | 3 | Geography bullet |
| `__tests__/game/bank-content-test.ts` | 1 | Content rules for all three banks |
| `__tests__/game/bank-test.ts` | 1 | Engine tests over all three banks |
| `__tests__/game/subjects-test.ts` | 3 | Registry tests |
| `__tests__/hooks/best-score-keys-test.ts` | 3 | Storage keys |
| `__tests__/game/reducer-test.ts` | 3 | START with Geography |

---

### Task 1: Geography fact bank

**Review note:** this task's review **is** the spec §2 content review. The reviewer must read every Geography item against the person-checked rules in Global Constraints:
- First the rules this spec adds: nothing in flux, no contested records, qualified records, wrong choices from the same category, names, and political neutrality.
- Then accuracy and exactly one true choice.
- Then suitability for all ages and natural wording.

Flag any doubtful item with a concrete replacement that still passes this task's tests.

**Files:**
- Create: `src/game/geography-bank.ts`
- Modify: `__tests__/game/bank-content-test.ts:1-14`
- Modify: `__tests__/game/bank-test.ts:1-14`

**Interfaces:**
- Consumes: `BankItem` from `src/game/bank.ts`:
  `interface BankItem { id: string; band: 1 | 2 | 3 | 4 | 5; sentence: string; answer: string; wrong: [string, string, string] }`
- Produces: `GEOGRAPHY_BANK: readonly BankItem[]` in `src/game/geography-bank.ts`, with 200 items, 40 per band, and ids `geo-<band>-<nnn>`

- [ ] **Step 1: Write the failing tests**

In `__tests__/game/bank-content-test.ts`, replace:

```ts
import type { BankItem } from '../../src/game/bank';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { SCIENCE_BANK } from '../../src/game/science-bank';
```

with:

```ts
import type { BankItem } from '../../src/game/bank';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
import { SCIENCE_BANK } from '../../src/game/science-bank';
```

and replace:

```ts
const BANKS: [string, string, readonly BankItem[]][] = [
  ['English', 'en', ENGLISH_BANK],
  ['Science', 'sci', SCIENCE_BANK],
];
```

with:

```ts
const BANKS: [string, string, readonly BankItem[]][] = [
  ['English', 'en', ENGLISH_BANK],
  ['Science', 'sci', SCIENCE_BANK],
  ['Geography', 'geo', GEOGRAPHY_BANK],
];
```

In `__tests__/game/bank-test.ts`, replace:

```ts
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';
```

with:

```ts
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
import { createRng } from '../../src/game/random';
```

and replace:

```ts
const BANKS: [string, readonly BankItem[]][] = [
  ['English', ENGLISH_BANK],
  ['Science', SCIENCE_BANK],
];
```

with:

```ts
const BANKS: [string, readonly BankItem[]][] = [
  ['English', ENGLISH_BANK],
  ['Science', SCIENCE_BANK],
  ['Geography', GEOGRAPHY_BANK],
];
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- __tests__/game/bank-content-test.ts __tests__/game/bank-test.ts`
Expected: FAIL. Both suites fail to run with `Cannot find module '../../src/game/geography-bank'`.

- [ ] **Step 3: Create the bank (transcribe exactly)**

`src/game/geography-bank.ts`:

```ts
import type { BankItem } from './bank';

// Rules for every item.
// A person must check these: exactly ONE choice is true in that exact sentence, and the wrong choices
// are clearly false but from the same category (cities with cities, rivers with rivers); true as
// written, qualified where needed ("above sea level", "hot desert"); nothing in flux (capitals that
// are being moved, shared or disputed; disputed borders; recent renames and competing spellings;
// populations) and no contested records (the longest river, how many continents or oceans); for a
// capital, the wrong choices are real cities of that country and never another of its capitals;
// common English names, with accents where the name normally carries them (Brasília), and "the" in
// the sentence, not in the choice; politically neutral and suitable for all ages. Numbers as digits,
// metric units, American spelling.
// __tests__/game/bank-content-test.ts checks these: four choices distinct ignoring case, 1-3 words and
// at most 16 characters, capitalised when the blank starts the sentence; sentences at most 60
// characters.
// Bands: 1 Earth and maps, 2 famous countries, capitals and landmarks, 3 rivers, mountains, deserts
// and landforms, 4 harder capitals and map skills, 5 tricky facts.
export const GEOGRAPHY_BANK: readonly BankItem[] = [
  // Band 1: continents and oceans, the poles, deserts and islands, maps and globes, compass directions, simple landforms
  { id: 'geo-1-001', band: 1, sentence: 'The largest ocean is the ___.', answer: 'Pacific', wrong: ['Atlantic', 'Indian', 'Arctic'] },
  { id: 'geo-1-002', band: 1, sentence: 'The largest continent is ___.', answer: 'Asia', wrong: ['Africa', 'Europe', 'Antarctica'] },
  { id: 'geo-1-003', band: 1, sentence: 'The coldest continent is ___.', answer: 'Antarctica', wrong: ['Europe', 'Asia', 'North America'] },
  { id: 'geo-1-004', band: 1, sentence: 'The South Pole is on the continent of ___.', answer: 'Antarctica', wrong: ['Africa', 'Australia', 'Asia'] },
  { id: 'geo-1-005', band: 1, sentence: 'The North Pole is in the ___ Ocean.', answer: 'Arctic', wrong: ['Pacific', 'Atlantic', 'Indian'] },
  { id: 'geo-1-006', band: 1, sentence: 'The ___ Ocean lies between Africa and South America.', answer: 'Atlantic', wrong: ['Pacific', 'Indian', 'Arctic'] },
  { id: 'geo-1-007', band: 1, sentence: 'The ___ Ocean lies between Africa and Australia.', answer: 'Indian', wrong: ['Atlantic', 'Pacific', 'Arctic'] },
  { id: 'geo-1-008', band: 1, sentence: 'The Pacific and the Atlantic are both ___.', answer: 'oceans', wrong: ['continents', 'rivers', 'lakes'] },
  { id: 'geo-1-009', band: 1, sentence: 'Europe and Asia are both ___.', answer: 'continents', wrong: ['countries', 'oceans', 'cities'] },
  { id: 'geo-1-010', band: 1, sentence: 'Africa is a ___.', answer: 'continent', wrong: ['country', 'city', 'island'] },
  { id: 'geo-1-011', band: 1, sentence: 'The continent south of Europe is ___.', answer: 'Africa', wrong: ['Asia', 'Australia', 'North America'] },
  { id: 'geo-1-012', band: 1, sentence: 'The Sahara is a hot desert in ___.', answer: 'Africa', wrong: ['Asia', 'Australia', 'Europe'] },
  { id: 'geo-1-013', band: 1, sentence: 'A very dry place with little rain is a ___.', answer: 'desert', wrong: ['jungle', 'swamp', 'lake'] },
  { id: 'geo-1-014', band: 1, sentence: 'An island is land surrounded by ___.', answer: 'water', wrong: ['sand', 'mountains', 'forest'] },
  { id: 'geo-1-015', band: 1, sentence: 'A ___ is water with land all around it.', answer: 'lake', wrong: ['river', 'waterfall', 'glacier'] },
  { id: 'geo-1-016', band: 1, sentence: 'Ocean water is ___.', answer: 'salty', wrong: ['fresh', 'sweet', 'fizzy'] },
  { id: 'geo-1-017', band: 1, sentence: "There is more ___ than land on Earth's surface.", answer: 'water', wrong: ['ice', 'sand', 'forest'] },
  { id: 'geo-1-018', band: 1, sentence: 'A ___ is a round model of Earth.', answer: 'globe', wrong: ['map', 'compass', 'chart'] },
  { id: 'geo-1-019', band: 1, sentence: 'A ___ is a drawing of a place seen from above.', answer: 'map', wrong: ['globe', 'compass', 'telescope'] },
  { id: 'geo-1-020', band: 1, sentence: 'A book of maps is called an ___.', answer: 'atlas', wrong: ['album', 'index', 'essay'] },
  { id: 'geo-1-021', band: 1, sentence: 'On most maps, north is at the ___.', answer: 'top', wrong: ['bottom', 'left', 'right'] },
  { id: 'geo-1-022', band: 1, sentence: 'On most maps, blue shows ___.', answer: 'water', wrong: ['forests', 'deserts', 'roads'] },
  { id: 'geo-1-023', band: 1, sentence: "The list that explains a map's symbols is the ___.", answer: 'key', wrong: ['scale', 'title', 'border'] },
  { id: 'geo-1-024', band: 1, sentence: "A map's ___ shows how far apart places really are.", answer: 'scale', wrong: ['key', 'title', 'border'] },
  { id: 'geo-1-025', band: 1, sentence: 'A compass rose on a map shows ___.', answer: 'directions', wrong: ['distances', 'heights', 'weather'] },
  { id: 'geo-1-026', band: 1, sentence: 'The opposite of north is ___.', answer: 'south', wrong: ['east', 'west', 'northeast'] },
  { id: 'geo-1-027', band: 1, sentence: 'East is the opposite of ___.', answer: 'west', wrong: ['north', 'south', 'southeast'] },
  { id: 'geo-1-028', band: 1, sentence: 'Halfway between north and east is ___.', answer: 'northeast', wrong: ['northwest', 'southeast', 'southwest'] },
  { id: 'geo-1-029', band: 1, sentence: 'The Sun sets in the ___.', answer: 'west', wrong: ['east', 'north', 'south'] },
  { id: 'geo-1-030', band: 1, sentence: 'The Arctic is the area around the ___ Pole.', answer: 'North', wrong: ['South', 'East', 'West'] },
  { id: 'geo-1-031', band: 1, sentence: 'Polar bears live in the ___.', answer: 'Arctic', wrong: ['Antarctic', 'Sahara', 'Amazon'] },
  { id: 'geo-1-032', band: 1, sentence: 'Land beside the sea is called the ___.', answer: 'coast', wrong: ['peak', 'valley', 'plain'] },
  { id: 'geo-1-033', band: 1, sentence: 'The top of a mountain is called its ___.', answer: 'peak', wrong: ['base', 'valley', 'coast'] },
  { id: 'geo-1-034', band: 1, sentence: 'Low land between mountains is called a ___.', answer: 'valley', wrong: ['peak', 'cliff', 'desert'] },
  { id: 'geo-1-035', band: 1, sentence: 'A mountain that can erupt is a ___.', answer: 'volcano', wrong: ['valley', 'glacier', 'canyon'] },
  { id: 'geo-1-036', band: 1, sentence: 'A river flows from high ground to ___ ground.', answer: 'lower', wrong: ['higher', 'drier', 'colder'] },
  { id: 'geo-1-037', band: 1, sentence: 'The line separating 2 countries is a ___.', answer: 'border', wrong: ['coast', 'horizon', 'harbor'] },
  { id: 'geo-1-038', band: 1, sentence: 'Mountains are ___ than hills.', answer: 'higher', wrong: ['lower', 'flatter', 'wetter'] },
  { id: 'geo-1-039', band: 1, sentence: 'Ships load and unload at a ___.', answer: 'port', wrong: ['peak', 'plain', 'desert'] },
  { id: 'geo-1-040', band: 1, sentence: 'A forest is land covered mostly with ___.', answer: 'trees', wrong: ['sand', 'ice', 'rocks'] },

  // Band 2: famous capitals, famous landmarks, which continent a country is in, well-known country facts
  { id: 'geo-2-001', band: 2, sentence: 'The Eiffel Tower is in ___.', answer: 'Paris', wrong: ['Rome', 'London', 'Madrid'] },
  { id: 'geo-2-002', band: 2, sentence: 'The capital of France is ___.', answer: 'Paris', wrong: ['Lyon', 'Marseille', 'Nice'] },
  { id: 'geo-2-003', band: 2, sentence: 'The capital of Japan is ___.', answer: 'Tokyo', wrong: ['Osaka', 'Kyoto', 'Yokohama'] },
  { id: 'geo-2-004', band: 2, sentence: 'The capital of Italy is ___.', answer: 'Rome', wrong: ['Milan', 'Venice', 'Naples'] },
  { id: 'geo-2-005', band: 2, sentence: 'The capital of Spain is ___.', answer: 'Madrid', wrong: ['Barcelona', 'Seville', 'Valencia'] },
  { id: 'geo-2-006', band: 2, sentence: 'The capital of Germany is ___.', answer: 'Berlin', wrong: ['Munich', 'Hamburg', 'Frankfurt'] },
  { id: 'geo-2-007', band: 2, sentence: 'The capital of the United Kingdom is ___.', answer: 'London', wrong: ['Manchester', 'Liverpool', 'Birmingham'] },
  { id: 'geo-2-008', band: 2, sentence: 'The capital of China is ___.', answer: 'Beijing', wrong: ['Shanghai', 'Guangzhou', 'Shenzhen'] },
  { id: 'geo-2-009', band: 2, sentence: 'The capital of Russia is ___.', answer: 'Moscow', wrong: ['Saint Petersburg', 'Kazan', 'Sochi'] },
  { id: 'geo-2-010', band: 2, sentence: 'The capital of the United States is ___.', answer: 'Washington, D.C.', wrong: ['New York', 'Los Angeles', 'Chicago'] },
  { id: 'geo-2-011', band: 2, sentence: 'The capital of India is ___.', answer: 'New Delhi', wrong: ['Mumbai', 'Kolkata', 'Chennai'] },
  { id: 'geo-2-012', band: 2, sentence: 'The capital of Greece is ___.', answer: 'Athens', wrong: ['Thessaloniki', 'Sparta', 'Corinth'] },
  { id: 'geo-2-013', band: 2, sentence: 'The capital of Mexico is ___.', answer: 'Mexico City', wrong: ['Guadalajara', 'Tijuana', 'Acapulco'] },
  { id: 'geo-2-014', band: 2, sentence: 'The capital of Ireland is ___.', answer: 'Dublin', wrong: ['Cork', 'Galway', 'Limerick'] },
  { id: 'geo-2-015', band: 2, sentence: 'Bangkok is the capital of ___.', answer: 'Thailand', wrong: ['Vietnam', 'Cambodia', 'Laos'] },
  { id: 'geo-2-016', band: 2, sentence: 'The Great Wall is in ___.', answer: 'China', wrong: ['Japan', 'India', 'Vietnam'] },
  { id: 'geo-2-017', band: 2, sentence: 'The Taj Mahal is in ___.', answer: 'India', wrong: ['Pakistan', 'Nepal', 'Sri Lanka'] },
  { id: 'geo-2-018', band: 2, sentence: 'The pyramids of Giza are in ___.', answer: 'Egypt', wrong: ['Mexico', 'Peru', 'Sudan'] },
  { id: 'geo-2-019', band: 2, sentence: 'The Colosseum is in ___.', answer: 'Rome', wrong: ['Athens', 'Paris', 'Madrid'] },
  { id: 'geo-2-020', band: 2, sentence: 'Big Ben is a famous clock tower in ___.', answer: 'London', wrong: ['Paris', 'Dublin', 'Berlin'] },
  { id: 'geo-2-021', band: 2, sentence: 'The Statue of Liberty stands in ___.', answer: 'New York', wrong: ['London', 'Sydney', 'Toronto'] },
  { id: 'geo-2-022', band: 2, sentence: 'Machu Picchu is an old mountain city in ___.', answer: 'Peru', wrong: ['Mexico', 'Chile', 'Brazil'] },
  { id: 'geo-2-023', band: 2, sentence: 'The Leaning Tower of ___ is in Italy.', answer: 'Pisa', wrong: ['Rome', 'Milan', 'Venice'] },
  { id: 'geo-2-024', band: 2, sentence: 'Mount Fuji is in ___.', answer: 'Japan', wrong: ['China', 'South Korea', 'Vietnam'] },
  { id: 'geo-2-025', band: 2, sentence: 'Stonehenge is a ring of ancient stones in ___.', answer: 'England', wrong: ['Ireland', 'France', 'Norway'] },
  { id: 'geo-2-026', band: 2, sentence: 'The Parthenon is an ancient temple in ___.', answer: 'Athens', wrong: ['Rome', 'Cairo', 'Istanbul'] },
  { id: 'geo-2-027', band: 2, sentence: 'Venice is famous for its ___.', answer: 'canals', wrong: ['pyramids', 'volcanoes', 'deserts'] },
  { id: 'geo-2-028', band: 2, sentence: 'The Christ the Redeemer statue is in ___.', answer: 'Brazil', wrong: ['Argentina', 'Portugal', 'Mexico'] },
  { id: 'geo-2-029', band: 2, sentence: 'Brazil is in ___.', answer: 'South America', wrong: ['Africa', 'Asia', 'Europe'] },
  { id: 'geo-2-030', band: 2, sentence: 'Kenya is in ___.', answer: 'Africa', wrong: ['Asia', 'South America', 'Europe'] },
  { id: 'geo-2-031', band: 2, sentence: 'India is in ___.', answer: 'Asia', wrong: ['Africa', 'Europe', 'Australia'] },
  { id: 'geo-2-032', band: 2, sentence: 'Germany is in ___.', answer: 'Europe', wrong: ['Asia', 'Africa', 'North America'] },
  { id: 'geo-2-033', band: 2, sentence: 'Canada is in ___.', answer: 'North America', wrong: ['South America', 'Europe', 'Asia'] },
  { id: 'geo-2-034', band: 2, sentence: 'Mexico is in ___.', answer: 'North America', wrong: ['South America', 'Europe', 'Africa'] },
  { id: 'geo-2-035', band: 2, sentence: 'On a map, Italy looks like a ___.', answer: 'boot', wrong: ['hat', 'star', 'fish'] },
  { id: 'geo-2-036', band: 2, sentence: 'The largest country by area is ___.', answer: 'Russia', wrong: ['Canada', 'China', 'Brazil'] },
  { id: 'geo-2-037', band: 2, sentence: "Canada's flag shows a red ___ leaf.", answer: 'maple', wrong: ['oak', 'palm', 'fig'] },
  { id: 'geo-2-038', band: 2, sentence: 'The Outback is a dry region of ___.', answer: 'Australia', wrong: ['Brazil', 'India', 'Canada'] },
  { id: 'geo-2-039', band: 2, sentence: 'The Amazon rainforest is mostly in ___.', answer: 'Brazil', wrong: ['Peru', 'Mexico', 'Argentina'] },
  { id: 'geo-2-040', band: 2, sentence: 'Spain shares a border with France and ___.', answer: 'Portugal', wrong: ['Italy', 'Germany', 'Greece'] },

  // Band 3: mountains and ranges, rivers, deserts, landform words, volcanoes, reefs, canals and channels
  { id: 'geo-3-001', band: 3, sentence: 'The Andes run along the west of ___.', answer: 'South America', wrong: ['Africa', 'Asia', 'Europe'] },
  { id: 'geo-3-002', band: 3, sentence: 'Mount Everest is in the ___.', answer: 'Himalayas', wrong: ['Andes', 'Alps', 'Rockies'] },
  { id: 'geo-3-003', band: 3, sentence: 'The highest mountain above sea level is Mount ___.', answer: 'Everest', wrong: ['Fuji', 'Kilimanjaro', 'Etna'] },
  { id: 'geo-3-004', band: 3, sentence: 'Kilimanjaro is the highest mountain in ___.', answer: 'Africa', wrong: ['Asia', 'Europe', 'South America'] },
  { id: 'geo-3-005', band: 3, sentence: 'The Alps are a mountain range in ___.', answer: 'Europe', wrong: ['Asia', 'Africa', 'South America'] },
  { id: 'geo-3-006', band: 3, sentence: 'The Rocky Mountains are in ___.', answer: 'North America', wrong: ['South America', 'Europe', 'Asia'] },
  { id: 'geo-3-007', band: 3, sentence: 'Mont Blanc is the highest peak in the ___.', answer: 'Alps', wrong: ['Andes', 'Himalayas', 'Rockies'] },
  { id: 'geo-3-008', band: 3, sentence: 'The Pyrenees lie between France and ___.', answer: 'Spain', wrong: ['Italy', 'Germany', 'Belgium'] },
  { id: 'geo-3-009', band: 3, sentence: 'Mountains in a long line form a mountain ___.', answer: 'range', wrong: ['delta', 'strait', 'plain'] },
  { id: 'geo-3-010', band: 3, sentence: 'The Nile flows north into the ___ Sea.', answer: 'Mediterranean', wrong: ['Red', 'Black', 'Arabian'] },
  { id: 'geo-3-011', band: 3, sentence: 'The Nile flows through the country of ___.', answer: 'Egypt', wrong: ['Morocco', 'Nigeria', 'South Africa'] },
  { id: 'geo-3-012', band: 3, sentence: 'The Amazon River flows into the ___ Ocean.', answer: 'Atlantic', wrong: ['Pacific', 'Indian', 'Arctic'] },
  { id: 'geo-3-013', band: 3, sentence: 'The Danube flows into the ___ Sea.', answer: 'Black', wrong: ['Red', 'North', 'Baltic'] },
  { id: 'geo-3-014', band: 3, sentence: 'The river that flows through London is the ___.', answer: 'Thames', wrong: ['Seine', 'Danube', 'Volga'] },
  { id: 'geo-3-015', band: 3, sentence: 'The river that flows through Paris is the ___.', answer: 'Seine', wrong: ['Thames', 'Rhine', 'Danube'] },
  { id: 'geo-3-016', band: 3, sentence: 'The Ganges River flows through ___.', answer: 'India', wrong: ['China', 'Thailand', 'Iran'] },
  { id: 'geo-3-017', band: 3, sentence: 'The Yangtze is the longest river in ___.', answer: 'China', wrong: ['India', 'Japan', 'Russia'] },
  { id: 'geo-3-018', band: 3, sentence: 'The Grand Canyon was carved by the ___ River.', answer: 'Colorado', wrong: ['Mississippi', 'Missouri', 'Columbia'] },
  { id: 'geo-3-019', band: 3, sentence: 'Victoria Falls is on the ___ River.', answer: 'Zambezi', wrong: ['Nile', 'Congo', 'Niger'] },
  { id: 'geo-3-020', band: 3, sentence: 'The largest hot desert in the world is the ___.', answer: 'Sahara', wrong: ['Gobi', 'Kalahari', 'Mojave'] },
  { id: 'geo-3-021', band: 3, sentence: 'The Gobi Desert is in ___.', answer: 'Asia', wrong: ['Africa', 'Australia', 'South America'] },
  { id: 'geo-3-022', band: 3, sentence: 'The Kalahari Desert is in ___.', answer: 'Africa', wrong: ['Asia', 'Australia', 'North America'] },
  { id: 'geo-3-023', band: 3, sentence: 'The Atacama Desert is in ___.', answer: 'South America', wrong: ['Africa', 'Asia', 'Australia'] },
  { id: 'geo-3-024', band: 3, sentence: 'Land with water on 3 sides is called a ___.', answer: 'peninsula', wrong: ['plateau', 'canyon', 'delta'] },
  { id: 'geo-3-025', band: 3, sentence: 'Land built up by a river at its mouth is a ___.', answer: 'delta', wrong: ['canyon', 'plateau', 'strait'] },
  { id: 'geo-3-026', band: 3, sentence: 'A deep valley with steep rock sides is a ___.', answer: 'canyon', wrong: ['delta', 'plain', 'peninsula'] },
  { id: 'geo-3-027', band: 3, sentence: 'A narrow strip of water joining 2 seas is a ___.', answer: 'strait', wrong: ['delta', 'canyon', 'plateau'] },
  { id: 'geo-3-028', band: 3, sentence: 'A narrow strip of land joining 2 larger lands is an ___.', answer: 'isthmus', wrong: ['island', 'inlet', 'estuary'] },
  { id: 'geo-3-029', band: 3, sentence: 'A group of islands is called an ___.', answer: 'archipelago', wrong: ['isthmus', 'estuary', 'oasis'] },
  { id: 'geo-3-030', band: 3, sentence: 'A flat area of high land is a ___.', answer: 'plateau', wrong: ['canyon', 'delta', 'valley'] },
  { id: 'geo-3-031', band: 3, sentence: 'A large, slow-moving mass of ice is a ___.', answer: 'glacier', wrong: ['geyser', 'delta', 'canyon'] },
  { id: 'geo-3-032', band: 3, sentence: 'A green place with water in a desert is an ___.', answer: 'oasis', wrong: ['isthmus', 'island', 'estuary'] },
  { id: 'geo-3-033', band: 3, sentence: 'A stream that flows into a bigger river is a ___.', answer: 'tributary', wrong: ['delta', 'strait', 'canal'] },
  { id: 'geo-3-034', band: 3, sentence: 'The start of a river is called its ___.', answer: 'source', wrong: ['mouth', 'delta', 'bank'] },
  { id: 'geo-3-035', band: 3, sentence: 'The place where a river meets the sea is its ___.', answer: 'mouth', wrong: ['source', 'bank', 'bed'] },
  { id: 'geo-3-036', band: 3, sentence: 'Mount Etna is a volcano in ___.', answer: 'Italy', wrong: ['Greece', 'Spain', 'Japan'] },
  { id: 'geo-3-037', band: 3, sentence: 'Many volcanoes lie around the Pacific Ring of ___.', answer: 'Fire', wrong: ['Ice', 'Ash', 'Smoke'] },
  { id: 'geo-3-038', band: 3, sentence: 'The Great Barrier Reef lies off the coast of ___.', answer: 'Australia', wrong: ['Brazil', 'India', 'Mexico'] },
  { id: 'geo-3-039', band: 3, sentence: 'The Panama Canal links the Atlantic and ___ oceans.', answer: 'Pacific', wrong: ['Indian', 'Arctic', 'Southern'] },
  { id: 'geo-3-040', band: 3, sentence: 'The English Channel separates England and ___.', answer: 'France', wrong: ['Spain', 'Norway', 'Ireland'] },

  // Band 4: harder capitals (the famous city is often the trap), latitude and longitude, hemispheres, the tropics, time
  { id: 'geo-4-001', band: 4, sentence: 'The capital of Australia is ___.', answer: 'Canberra', wrong: ['Sydney', 'Melbourne', 'Perth'] },
  { id: 'geo-4-002', band: 4, sentence: 'The capital of Canada is ___.', answer: 'Ottawa', wrong: ['Toronto', 'Montreal', 'Vancouver'] },
  { id: 'geo-4-003', band: 4, sentence: 'The capital of Brazil is ___.', answer: 'Brasília', wrong: ['Rio de Janeiro', 'São Paulo', 'Salvador'] },
  { id: 'geo-4-004', band: 4, sentence: 'The capital of New Zealand is ___.', answer: 'Wellington', wrong: ['Auckland', 'Christchurch', 'Queenstown'] },
  { id: 'geo-4-005', band: 4, sentence: 'The capital of Nigeria is ___.', answer: 'Abuja', wrong: ['Lagos', 'Kano', 'Ibadan'] },
  { id: 'geo-4-006', band: 4, sentence: 'The capital of Pakistan is ___.', answer: 'Islamabad', wrong: ['Karachi', 'Lahore', 'Peshawar'] },
  { id: 'geo-4-007', band: 4, sentence: 'The capital of Morocco is ___.', answer: 'Rabat', wrong: ['Casablanca', 'Tangier', 'Agadir'] },
  { id: 'geo-4-008', band: 4, sentence: 'The capital of Portugal is ___.', answer: 'Lisbon', wrong: ['Porto', 'Faro', 'Braga'] },
  { id: 'geo-4-009', band: 4, sentence: 'The capital of Argentina is ___.', answer: 'Buenos Aires', wrong: ['Rosario', 'Mendoza', 'Salta'] },
  { id: 'geo-4-010', band: 4, sentence: 'The capital of Peru is ___.', answer: 'Lima', wrong: ['Arequipa', 'Trujillo', 'Iquitos'] },
  { id: 'geo-4-011', band: 4, sentence: 'The capital of Norway is ___.', answer: 'Oslo', wrong: ['Bergen', 'Trondheim', 'Stavanger'] },
  { id: 'geo-4-012', band: 4, sentence: 'The capital of Sweden is ___.', answer: 'Stockholm', wrong: ['Gothenburg', 'Malmö', 'Uppsala'] },
  { id: 'geo-4-013', band: 4, sentence: 'The capital of Kenya is ___.', answer: 'Nairobi', wrong: ['Mombasa', 'Kisumu', 'Nakuru'] },
  { id: 'geo-4-014', band: 4, sentence: 'The capital of the Philippines is ___.', answer: 'Manila', wrong: ['Cebu City', 'Davao City', 'Zamboanga City'] },
  { id: 'geo-4-015', band: 4, sentence: 'The capital of Colombia is ___.', answer: 'Bogotá', wrong: ['Medellín', 'Cali', 'Cartagena'] },
  { id: 'geo-4-016', band: 4, sentence: 'The capital of Denmark is ___.', answer: 'Copenhagen', wrong: ['Aarhus', 'Odense', 'Aalborg'] },
  { id: 'geo-4-017', band: 4, sentence: 'The capital of the United Arab Emirates is ___.', answer: 'Abu Dhabi', wrong: ['Dubai', 'Sharjah', 'Ajman'] },
  { id: 'geo-4-018', band: 4, sentence: 'The capital of Ecuador is ___.', answer: 'Quito', wrong: ['Guayaquil', 'Cuenca', 'Manta'] },
  { id: 'geo-4-019', band: 4, sentence: 'The capital of Austria is ___.', answer: 'Vienna', wrong: ['Salzburg', 'Innsbruck', 'Graz'] },
  { id: 'geo-4-020', band: 4, sentence: 'The capital of Belgium is ___.', answer: 'Brussels', wrong: ['Antwerp', 'Bruges', 'Ghent'] },
  { id: 'geo-4-021', band: 4, sentence: 'The equator is at ___ degrees latitude.', answer: '0', wrong: ['45', '90', '180'] },
  { id: 'geo-4-022', band: 4, sentence: 'The North Pole is at ___ degrees north latitude.', answer: '90', wrong: ['0', '45', '180'] },
  { id: 'geo-4-023', band: 4, sentence: 'Lines of ___ measure how far north or south a place is.', answer: 'latitude', wrong: ['longitude', 'altitude', 'magnitude'] },
  { id: 'geo-4-024', band: 4, sentence: 'Lines of ___ measure how far east or west a place is.', answer: 'longitude', wrong: ['latitude', 'altitude', 'magnitude'] },
  { id: 'geo-4-025', band: 4, sentence: 'Lines of latitude are also called ___.', answer: 'parallels', wrong: ['meridians', 'poles', 'zones'] },
  { id: 'geo-4-026', band: 4, sentence: 'Lines of longitude are also called ___.', answer: 'meridians', wrong: ['parallels', 'tropics', 'circles'] },
  { id: 'geo-4-027', band: 4, sentence: 'All lines of longitude meet at the ___.', answer: 'poles', wrong: ['equator', 'tropics', 'Prime Meridian'] },
  { id: 'geo-4-028', band: 4, sentence: 'The longest line of latitude is the ___.', answer: 'equator', wrong: ['Arctic Circle', 'Tropic of Cancer', 'Prime Meridian'] },
  { id: 'geo-4-029', band: 4, sentence: 'The equator divides Earth into 2 ___.', answer: 'hemispheres', wrong: ['continents', 'oceans', 'time zones'] },
  { id: 'geo-4-030', band: 4, sentence: 'Europe is entirely in the ___ Hemisphere.', answer: 'Northern', wrong: ['Southern', 'Western', 'Eastern'] },
  { id: 'geo-4-031', band: 4, sentence: 'Antarctica is entirely in the ___ Hemisphere.', answer: 'Southern', wrong: ['Northern', 'Eastern', 'Western'] },
  { id: 'geo-4-032', band: 4, sentence: 'The Tropic of Cancer is ___ of the equator.', answer: 'north', wrong: ['south', 'east', 'west'] },
  { id: 'geo-4-033', band: 4, sentence: 'The Tropic of Capricorn is ___ of the equator.', answer: 'south', wrong: ['north', 'east', 'west'] },
  { id: 'geo-4-034', band: 4, sentence: 'The equator passes through the country of ___.', answer: 'Kenya', wrong: ['Egypt', 'Morocco', 'South Africa'] },
  { id: 'geo-4-035', band: 4, sentence: 'The Tropic of Cancer passes through ___.', answer: 'Mexico', wrong: ['Brazil', 'Canada', 'France'] },
  { id: 'geo-4-036', band: 4, sentence: 'It is summer in Australia in ___.', answer: 'January', wrong: ['June', 'July', 'August'] },
  { id: 'geo-4-037', band: 4, sentence: 'Earth turns about ___ degrees each hour.', answer: '15', wrong: ['24', '60', '90'] },
  { id: 'geo-4-038', band: 4, sentence: 'When it is noon in London, it is ___ in New York.', answer: 'morning', wrong: ['afternoon', 'evening', 'midnight'] },
  { id: 'geo-4-039', band: 4, sentence: 'Days and nights are nearly equal all year near the ___.', answer: 'equator', wrong: ['North Pole', 'South Pole', 'Arctic Circle'] },
  { id: 'geo-4-040', band: 4, sentence: 'The Prime Meridian is at ___ degrees longitude.', answer: '0', wrong: ['90', '180', '360'] },

  // Band 5: the Prime Meridian and the Date Line, landlocked and enclosed countries, records that don't change, tricky locations
  { id: 'geo-5-001', band: 5, sentence: 'The largest island in the world is ___.', answer: 'Greenland', wrong: ['Borneo', 'Madagascar', 'Iceland'] },
  { id: 'geo-5-002', band: 5, sentence: 'The Prime Meridian passes through ___ in London.', answer: 'Greenwich', wrong: ['Westminster', 'Wimbledon', 'Chelsea'] },
  { id: 'geo-5-003', band: 5, sentence: 'The International Date Line is mostly in the ___ Ocean.', answer: 'Pacific', wrong: ['Atlantic', 'Indian', 'Arctic'] },
  { id: 'geo-5-004', band: 5, sentence: 'The International Date Line is near ___ degrees longitude.', answer: '180', wrong: ['0', '90', '360'] },
  { id: 'geo-5-005', band: 5, sentence: 'Going west across the Date Line, the date moves ___.', answer: '1 day ahead', wrong: ['1 day back', '1 hour ahead', '1 hour back'] },
  { id: 'geo-5-006', band: 5, sentence: 'A country with no coastline is called ___.', answer: 'landlocked', wrong: ['coastal', 'tropical', 'peninsular'] },
  { id: 'geo-5-007', band: 5, sentence: '___ is a landlocked country in South America.', answer: 'Paraguay', wrong: ['Peru', 'Chile', 'Uruguay'] },
  { id: 'geo-5-008', band: 5, sentence: '___ is a landlocked country in Africa.', answer: 'Chad', wrong: ['Egypt', 'Kenya', 'Ghana'] },
  { id: 'geo-5-009', band: 5, sentence: '___ is a landlocked country in Europe.', answer: 'Switzerland', wrong: ['Italy', 'Spain', 'Norway'] },
  { id: 'geo-5-010', band: 5, sentence: '___ is a landlocked country in Asia.', answer: 'Mongolia', wrong: ['Japan', 'Vietnam', 'India'] },
  { id: 'geo-5-011', band: 5, sentence: 'The smallest country in the world is ___.', answer: 'Vatican City', wrong: ['Monaco', 'San Marino', 'Malta'] },
  { id: 'geo-5-012', band: 5, sentence: 'San Marino is completely surrounded by ___.', answer: 'Italy', wrong: ['France', 'Spain', 'Austria'] },
  { id: 'geo-5-013', band: 5, sentence: 'Lesotho is completely surrounded by ___.', answer: 'South Africa', wrong: ['Kenya', 'Nigeria', 'Egypt'] },
  { id: 'geo-5-014', band: 5, sentence: 'The deepest lake in the world is Lake ___.', answer: 'Baikal', wrong: ['Victoria', 'Superior', 'Titicaca'] },
  { id: 'geo-5-015', band: 5, sentence: 'The largest lake in Africa is Lake ___.', answer: 'Victoria', wrong: ['Chad', 'Tanganyika', 'Turkana'] },
  { id: 'geo-5-016', band: 5, sentence: 'The deepest part of the ocean is in the ___ Trench.', answer: 'Mariana', wrong: ['Tonga', 'Java', 'Puerto Rico'] },
  { id: 'geo-5-017', band: 5, sentence: 'Counting cold deserts, the largest desert is in ___.', answer: 'Antarctica', wrong: ['Africa', 'Asia', 'Australia'] },
  { id: 'geo-5-018', band: 5, sentence: 'The longest mountain range on land is the ___.', answer: 'Andes', wrong: ['Himalayas', 'Rockies', 'Alps'] },
  { id: 'geo-5-019', band: 5, sentence: 'The city of Istanbul lies in both Europe and ___.', answer: 'Asia', wrong: ['Africa', 'Australia', 'Antarctica'] },
  { id: 'geo-5-020', band: 5, sentence: 'The only continent with no countries is ___.', answer: 'Antarctica', wrong: ['Australia', 'Europe', 'Africa'] },
  { id: 'geo-5-021', band: 5, sentence: 'Both the equator and the Prime Meridian cross ___.', answer: 'Africa', wrong: ['Asia', 'Europe', 'Australia'] },
  { id: 'geo-5-022', band: 5, sentence: 'The Suez Canal links the Mediterranean and the ___ Sea.', answer: 'Red', wrong: ['Black', 'Arabian', 'Baltic'] },
  { id: 'geo-5-023', band: 5, sentence: 'The Strait of Gibraltar separates Spain and ___.', answer: 'Morocco', wrong: ['Algeria', 'Tunisia', 'Portugal'] },
  { id: 'geo-5-024', band: 5, sentence: 'The Bering Strait separates Asia and ___.', answer: 'North America', wrong: ['Europe', 'Australia', 'Africa'] },
  { id: 'geo-5-025', band: 5, sentence: 'Mount Kilimanjaro is in ___.', answer: 'Tanzania', wrong: ['Kenya', 'Uganda', 'Ethiopia'] },
  { id: 'geo-5-026', band: 5, sentence: 'Madagascar lies in the ___ Ocean.', answer: 'Indian', wrong: ['Atlantic', 'Pacific', 'Arctic'] },
  { id: 'geo-5-027', band: 5, sentence: 'The Galápagos Islands belong to ___.', answer: 'Ecuador', wrong: ['Peru', 'Chile', 'Colombia'] },
  { id: 'geo-5-028', band: 5, sentence: 'The longest river in Europe is the ___.', answer: 'Volga', wrong: ['Danube', 'Rhine', 'Thames'] },
  { id: 'geo-5-029', band: 5, sentence: 'Lake Titicaca lies between Peru and ___.', answer: 'Bolivia', wrong: ['Chile', 'Brazil', 'Ecuador'] },
  { id: 'geo-5-030', band: 5, sentence: 'Cape Horn is near the southern tip of ___.', answer: 'South America', wrong: ['Africa', 'Australia', 'Asia'] },
  { id: 'geo-5-031', band: 5, sentence: 'The south side of Mount Everest is in ___.', answer: 'Nepal', wrong: ['India', 'Bhutan', 'Pakistan'] },
  { id: 'geo-5-032', band: 5, sentence: 'The second-highest mountain on Earth is ___.', answer: 'K2', wrong: ['Mont Blanc', 'Kilimanjaro', 'Mount Fuji'] },
  { id: 'geo-5-033', band: 5, sentence: 'The river that carries the most water is the ___.', answer: 'Amazon', wrong: ['Nile', 'Yangtze', 'Mississippi'] },
  { id: 'geo-5-034', band: 5, sentence: 'Latitude 0, longitude 0 is in the ___ Ocean.', answer: 'Atlantic', wrong: ['Pacific', 'Indian', 'Arctic'] },
  { id: 'geo-5-035', band: 5, sentence: 'At the North Pole, every direction points ___.', answer: 'south', wrong: ['north', 'east', 'west'] },
  { id: 'geo-5-036', band: 5, sentence: 'On June 21, the Sun never sets north of the ___.', answer: 'Arctic Circle', wrong: ['equator', 'Tropic of Cancer', 'Prime Meridian'] },
  { id: 'geo-5-037', band: 5, sentence: 'Ecuador is named after the ___.', answer: 'equator', wrong: ['Andes', 'Amazon', 'Pacific'] },
  { id: 'geo-5-038', band: 5, sentence: 'The country with the longest coastline is ___.', answer: 'Canada', wrong: ['Russia', 'Australia', 'Indonesia'] },
  { id: 'geo-5-039', band: 5, sentence: 'The White Nile and the ___ Nile join to form the Nile.', answer: 'Blue', wrong: ['Red', 'Black', 'Green'] },
  { id: 'geo-5-040', band: 5, sentence: 'People in Brazil mostly speak ___.', answer: 'Portuguese', wrong: ['Spanish', 'French', 'English'] },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- __tests__/game/bank-content-test.ts __tests__/game/bank-test.ts`
Expected: PASS.
- `bank-content-test.ts`: 609 tests (for each of the 3 banks, 3 bank-wide checks plus 200 per-item checks).
- `bank-test.ts`: 27 tests.

If a per-item check fails for Geography, you made a transcription error. Fix the item to match this plan exactly; do not change the test. (If the task review replaces an item, the replacement must pass these same checks.)

- [ ] **Step 5: Run everything, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
```

Expected:
- `npm test`: PASS, 724 tests.
- `tsc` and lint: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/game/geography-bank.ts __tests__/game/bank-content-test.ts __tests__/game/bank-test.ts
git commit -m "feat(game): add the Geography fact bank

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The subject picker becomes a grid of tiles

A layout change only. The picker still lists `SUBJECT_IDS` and starts the tapped subject. With three subjects registered, the third tile stretches across the second row; Task 3 adds the fourth.

The picker layout is UI and has no unit test (spec §4). Task 4's device check covers it.

**Files:**
- Modify: `src/components/game/overlay.tsx:35-37,62-83,140-154`

**Interfaces:**
- Consumes: `SUBJECT_IDS`, `SUBJECTS`, `SubjectId` from `src/game/subjects.ts`; `BestScores` from `src/hooks/use-best-scores.ts`. None of them change in this task.
- Produces: nothing other tasks import. `SubjectTile` is private to `overlay.tsx`. The `Overlay` props do not change.

- [ ] **Step 1: Put the subjects in a grid**

In `src/components/game/overlay.tsx`, inside the `phase === 'ready'` block, replace:

```tsx
            {SUBJECT_IDS.map((id) => (
              <SubjectButton key={id} subject={id} best={best[id]} onPress={() => onStart(id)} />
            ))}
```

with:

```tsx
            <View style={styles.subjectGrid}>
              {SUBJECT_IDS.map((id) => (
                <SubjectTile key={id} subject={id} best={best[id]} onPress={() => onStart(id)} />
              ))}
            </View>
```

Leave the title and subtitle above it untouched.

- [ ] **Step 2: Turn the subject button into a tile**

In the same file, replace the whole `SubjectButton` function (from `function SubjectButton(` down to its closing `}`) with:

```tsx
function SubjectTile({ subject, best, onPress }: { subject: SubjectId; best: number; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, best ${best}`}
      style={({ pressed }) => [styles.subjectTile, pressed && styles.pressed]}>
      <Text style={styles.subjectBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <Text
        style={styles.subjectName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1.4}>
        {name}
      </Text>
      <Text style={styles.subjectBest} maxFontSizeMultiplier={1.4}>
        Best {best}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: Replace the subject styles**

In the `StyleSheet.create` call in the same file, replace these five styles:

```ts
  subjectButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
  },
  subjectBadge: { width: 64, textAlign: 'center', fontSize: 22, fontWeight: '900', color: GameColors.glow },
  subjectText: { flex: 1 },
  subjectName: { fontSize: 22, fontWeight: '800', color: GameColors.text },
  subjectBest: { fontSize: 14, color: GameColors.textDim },
```

with:

```ts
  // Tiles wrap two per row, like the answer pad.
  subjectGrid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subjectTile: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
  },
  subjectBadge: { fontSize: 22, fontWeight: '900', color: GameColors.glow },
  // The name fills the tile's width, so a long name ("Mathematics") shrinks to fit instead of wrapping.
  subjectName: { alignSelf: 'stretch', textAlign: 'center', fontSize: 18, fontWeight: '800', color: GameColors.text },
  subjectBest: { fontSize: 14, color: GameColors.textDim },
```

Do not change any other style. `title`, `subtitle`, `panel`, `pressed` and the Paused and Game Over styles stay as they are.

- [ ] **Step 4: Run the tests, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
git grep -nE "SubjectButton|subjectButton|subjectText" -- src
```

Expected:
- `npm test`: PASS, 724 tests. This task adds none.
- `tsc` and lint: no errors.
- `git grep`: prints nothing (exit code 1).

- [ ] **Step 5: Commit**

```bash
git add src/components/game/overlay.tsx
git commit -m "feat: lay out the subject picker as a grid of tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Geography joins the game

**Files:**
- Modify: `src/game/subjects.ts`
- Modify: `src/hooks/best-score-keys.ts`
- Modify: `src/hooks/use-best-scores.ts:12`
- Modify: `README.md:8`
- Test: `__tests__/game/subjects-test.ts`, `__tests__/hooks/best-score-keys-test.ts`, `__tests__/game/reducer-test.ts`

**Interfaces:**
- Consumes:
  - `GEOGRAPHY_BANK: readonly BankItem[]` from `src/game/geography-bank.ts` (Task 1)
  - `makeBankQuestion(bank: readonly BankItem[], level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question` and `sentenceFallMs(level: number): number`, both from `src/game/bank.ts`
- Produces:
  - `SubjectId = 'math' | 'english' | 'science' | 'geography'`
  - `SUBJECTS.geography`
  - `SUBJECT_IDS = ['math', 'english', 'science', 'geography']`
  - `BEST_SCORE_KEYS.geography`

- [ ] **Step 1: Write the failing tests**

Replace the whole of `__tests__/game/subjects-test.ts` with:

```ts
import { sentenceFallMs } from '../../src/game/bank';
import { configForLevel } from '../../src/game/difficulty';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
import { createRng } from '../../src/game/random';
import { SCIENCE_BANK } from '../../src/game/science-bank';
import { SUBJECT_IDS, SUBJECTS } from '../../src/game/subjects';

describe('SUBJECTS', () => {
  it('lists math, english, science then geography, each keyed by its own id', () => {
    expect(SUBJECT_IDS).toEqual(['math', 'english', 'science', 'geography']);
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id].id).toBe(id);
    }
  });

  it('shows the names and badges from the spec', () => {
    expect(SUBJECTS.math).toMatchObject({ name: 'Mathematics', shortName: 'MATH', badge: '+−×÷' });
    expect(SUBJECTS.english).toMatchObject({ name: 'English', shortName: 'ENGLISH', badge: 'Aa' });
    expect(SUBJECTS.science).toMatchObject({ name: 'Science', shortName: 'SCIENCE', badge: 'H₂O' });
    expect(SUBJECTS.geography).toMatchObject({ name: 'Geography', shortName: 'GEOGRAPHY', badge: 'N↑' });
  });

  it('gives math the short card and the sentence subjects the sentence card', () => {
    expect(SUBJECTS.math.card).toBe('short');
    expect(SUBJECTS.english.card).toBe('sentence');
    expect(SUBJECTS.science.card).toBe('sentence');
    expect(SUBJECTS.geography.card).toBe('sentence');
  });

  it('uses each subject own fall times', () => {
    for (const level of [1, 4, 7, 12]) {
      expect(SUBJECTS.math.fallMs(level)).toBe(configForLevel(level).fallMs);
      expect(SUBJECTS.english.fallMs(level)).toBe(sentenceFallMs(level));
      expect(SUBJECTS.science.fallMs(level)).toBe(sentenceFallMs(level));
      expect(SUBJECTS.geography.fallMs(level)).toBe(sentenceFallMs(level));
    }
  });

  it('math makes arithmetic questions and ignores used keys', () => {
    const q = SUBJECTS.math.makeQuestion(1, createRng(1), 5, ['anything']);
    expect(q.id).toBe(5);
    expect(q.prompt).toMatch(/^\d+ \+ \d+$/);
  });

  it('english makes questions from the bank and honours used keys', () => {
    const band1 = ENGLISH_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.english.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });

  it('science makes questions from its own bank and honours used keys', () => {
    const band1 = SCIENCE_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.science.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });

  it('geography makes questions from its own bank and honours used keys', () => {
    const band1 = GEOGRAPHY_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.geography.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });
});
```

In `__tests__/hooks/best-score-keys-test.ts`, add this test after the Science one:

```ts
  it('gives Geography its own key', () => {
    expect(BEST_SCORE_KEYS.geography).toBe('quiz-shooter:best-score:geography');
  });
```

The three tests already in that file keep asserting the Math, English and Science keys. Do not change them.

In `__tests__/game/reducer-test.ts`, add this import directly after the `english-bank` import on line 1, so the paths stay alphabetical (`english-bank`, `geography-bank`, `random`, `reducer`, `science-bank`, `subjects`):

```ts
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
```

Then add this test directly after `'START with science draws the first question from the Science bank'`:

```ts
  it('START with geography draws the first question from the Geography bank', () => {
    const { state } = start(1, 'geography');
    expect(state.subject).toBe('geography');
    const source = GEOGRAPHY_BANK.find((i) => i.id === state.question!.key);
    expect(source?.band).toBe(1);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- __tests__/game/subjects-test.ts __tests__/hooks/best-score-keys-test.ts __tests__/game/reducer-test.ts`
Expected: FAIL.
- `SUBJECT_IDS` lacks `'geography'`.
- `SUBJECTS.geography` is undefined, so the card, fall-time and bank cases throw `TypeError: Cannot read properties of undefined`.
- `BEST_SCORE_KEYS.geography` is undefined.
- The reducer test throws `TypeError: Cannot read properties of undefined (reading 'makeQuestion')`.

- [ ] **Step 3: Register Geography**

Replace the whole of `src/game/subjects.ts` with:

```ts
import { makeBankQuestion, sentenceFallMs } from './bank';
import { configForLevel } from './difficulty';
import { ENGLISH_BANK } from './english-bank';
import { GEOGRAPHY_BANK } from './geography-bank';
import { makeMathQuestion } from './math';
import type { Question } from './question';
import type { Rng } from './random';
import { SCIENCE_BANK } from './science-bank';

export type SubjectId = 'math' | 'english' | 'science' | 'geography';

// How a subject's falling card looks: one short line (e.g. "12 × 7") or a wrapped sentence with a blank.
export type CardKind = 'short' | 'sentence';

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  badge: string;
  card: CardKind;
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: 'math',
    name: 'Mathematics',
    shortName: 'MATH',
    badge: '+−×÷',
    card: 'short',
    fallMs: (level) => configForLevel(level).fallMs,
    // Math questions are generated fresh each time, so repeats are fine and usedKeys is ignored.
    makeQuestion: (level, rng, id) => makeMathQuestion(level, rng, id),
  },
  english: {
    id: 'english',
    name: 'English',
    shortName: 'ENGLISH',
    badge: 'Aa',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(ENGLISH_BANK, level, rng, id, usedKeys),
  },
  science: {
    id: 'science',
    name: 'Science',
    shortName: 'SCIENCE',
    badge: 'H₂O',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(SCIENCE_BANK, level, rng, id, usedKeys),
  },
  geography: {
    id: 'geography',
    name: 'Geography',
    shortName: 'GEOGRAPHY',
    badge: 'N↑',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(GEOGRAPHY_BANK, level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english', 'science', 'geography'];
```

- [ ] **Step 4: Give Geography its own best score**

Replace the whole of `src/hooks/best-score-keys.ts` with:

```ts
import type { SubjectId } from '@/game/subjects';

// Math keeps the original key so bests saved before English existed carry over.
export const BEST_SCORE_KEYS: Record<SubjectId, string> = {
  math: 'quiz-shooter:best-score',
  english: 'quiz-shooter:best-score:english',
  science: 'quiz-shooter:best-score:science',
  geography: 'quiz-shooter:best-score:geography',
};
```

In `src/hooks/use-best-scores.ts`, replace:

```ts
  const [best, setBest] = useState<BestScores>({ math: 0, english: 0, science: 0 });
```

with:

```ts
  const [best, setBest] = useState<BestScores>({ math: 0, english: 0, science: 0, geography: 0 });
```

- [ ] **Step 5: Add Geography to the README**

In `README.md`, replace:

```markdown
- **Science:** facts with a blank, such as `The planet closest to the Sun is ___.`
```

with:

```markdown
- **Science:** facts with a blank, such as `The planet closest to the Sun is ___.`
- **Geography:** world facts with a blank, such as `The capital of Australia is ___.`
```

- [ ] **Step 6: Run the tests, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
```

Expected:
- `npm test`: PASS, 727 tests.
- `tsc` and lint: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/game/subjects.ts src/hooks/best-score-keys.ts src/hooks/use-best-scores.ts README.md __tests__/game/subjects-test.ts __tests__/hooks/best-score-keys-test.ts __tests__/game/reducer-test.ts
git commit -m "feat: add Geography as a fourth subject

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Final verification

**Files:** none expected. Fix anything the checks report inside the file that owns it.

- [ ] **Step 1: Run the full check suite**

```bash
npx expo-doctor
npx expo lint
npx tsc --noEmit
npm test
git grep -nE "SubjectButton|subjectButton|subjectText" -- src
```

Expected:
- Every check command exits 0, and `npm test` reports 727 tests.
- The final `git grep` prints nothing.
- `expo-doctor` needs network access. If it fails only because it can't reach the network, report that; don't change files to satisfy it.

- [ ] **Step 2: Device check (human)**

Ask the user to run `npx expo start`, open Expo Go on a phone, and check:
- **Picker:**
  - It shows Mathematics, English, Science and Geography as a 2×2 grid, each with its own best.
  - The Math, English and Science bests from before the update are still there.
  - The grid fits without scrolling on a small phone, including at the largest OS text size.
  - "Mathematics" stays on one line and is **not** cut off with "…" at the largest OS text size. If it is cut off, apply the fix in Review Focus item 2.
  - The Geography badge shows `N↑`, not an empty box.
  - A pressed tile dims and shrinks slightly, as the buttons did.
- **Geography:**
  - The HUD shows `GEOGRAPHY` above `LV n`, and it does not touch the hearts or the score.
  - The sentence appears on the wide card with the blank as a gap.
  - A correct tap shoots it apart.
  - A landed card reveals the complete fact with the answer in green, and the right button turns green.
  - A third wrong tap reveals the answer, then shows Game Over.
- **Long and accented names** fit on the card and the answer buttons on a small phone. Check for example:
  - the choices `Washington, D.C.`, `Saint Petersburg`, `Zamboanga City` and `Tropic of Cancer`
  - the accented choices `Brasília`, `São Paulo`, `Malmö`, `Bogotá` and `Medellín`
  - the sentence `The International Date Line is near ___ degrees longitude.`
- **Math, English and Science** play exactly as before.
- **Menus:**
  - Pause → Menu returns to the picker and keeps a new Geography best.
  - Game Over → Play again (same subject) and Change subject both work.

- [ ] **Step 3: Commit any fixes**

Stage explicit paths only. Skip this commit if nothing changed.

```bash
git add <the files you changed>
git commit -m "chore: fix issues found in final verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
