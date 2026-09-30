# Geography Mode — Design Spec

Date: 2026-09-30
Status: Approved in conversation (pending written-spec review)
Builds on: `docs/superpowers/specs/2026-09-30-science-mode-design.md`, which added Science and the shared question-bank engine. Everything in it still applies unless this document changes it.

## Purpose

Add a fourth subject, **Geography**, to Quiz Shooter. It covers world geography for all ages, from easy to tricky: continents and oceans, countries and capitals, rivers, mountains and landforms, and map skills. Questions are fill-in-the-blank facts with four choices, like English and Science. On a miss, the reveal shows the complete, true fact.

A fourth subject no longer fits the picker's column of full-width buttons, so the picker becomes a 2×2 grid of tiles.

## Decisions

| Topic | Decision |
|---|---|
| Scope | World geography, with no country favored. No US states. |
| Audience | All ages, easy → tricky: Earth and maps → famous capitals → landforms → harder capitals and map skills → tricky facts |
| Format | Fill-in-the-blank facts with 4 choices, as in English and Science |
| Architecture | A hand-written bank (`geography-bank.ts`) plus one registry entry. The shared engine in `bank.ts` is unchanged. |
| Picker | A 2×2 grid of tiles replaces the column of full-width buttons |
| Content | ~200 hand-written facts in a bundled data file. Works offline; no AI or network. |
| Fall speed | Same as English and Science (`sentenceFallMs`) |
| Best score | Separate per subject; new key `quiz-shooter:best-score:geography` |
| Packages | No new packages |

## 1. Player experience

### Subject picker

- A 2×2 grid of tiles, in this order: Mathematics, English, Science, Geography.
- The title "Quiz Shooter" and subtitle "Pick your subject" are unchanged. Both stay capped at 1.4×.
- **Tile layout:**
  - Each tile stacks its badge (22 px), then the subject name (18 px), then "Best N" (14 px), centered.
  - All three texts have `maxFontSizeMultiplier={1.4}`.
  - The name stays on one line and shrinks to fit (`numberOfLines={1}`, `adjustsFontSizeToFit`, `minimumFontScale={0.6}`), so "Mathematics" never wraps.
- **Tile sizing:** tiles wrap two per row, like the answer pad. Each tile has `flexBasis: '46%'` and `flexGrow: 1`, with a 12 px gap between tiles.
- **Tile style:** each tile keeps today's subject-button look: glowing border, button background, pressed state.
- **Accessibility and behavior:** the label stays "`<name>`, best `<N>`". Tapping a tile starts that subject, as today.
- **Why a grid:** it fits every phone Expo SDK 57 supports, at every text size up to the 1.4× cap, with no scrolling. It would also take a fifth or sixth subject as a 3×2 grid.

### Geography in play

- **Badge:** `N↑` (a map's north arrow), plain text like `+−×÷`, `Aa` and `H₂O`.
- **HUD:** `GEOGRAPHY` above `LV n`. At the 1.2× cap it measures about 93 px; the narrowest supported phone (360 dp) leaves 136 px for the centre.
- **Card, reveal and fall time:** the sentence card, the reveal and `sentenceFallMs`, all exactly as for English and Science.
- **Unchanged:** scoring, lives, level thresholds, pause and Menu, game over, and the per-subject "New best!" rule.

## 2. Geography content

### Levels and topic bands

Levels and bands work exactly as for English and Science: band = level for levels 1–5, and bands 4 and 5 are pooled from level 6.

| Band | Used at level | Topics | Example (correct first) |
|---|---|---|---|
| 1 | 1 | Earth and maps: continents, oceans, compass directions, the poles, deserts, islands, maps and globes | `The largest ocean is the ___.` → Pacific / Atlantic / Indian / Arctic |
| 2 | 2 | Famous countries and capitals, famous landmarks, which continent a country is in | `The Eiffel Tower is in ___.` → Paris / Rome / London / Madrid |
| 3 | 3 | Rivers, mountains and deserts; landforms (peninsula, delta, canyon, strait, volcano) | `The Andes run along the west of ___.` → South America / Africa / Asia / Europe |
| 4 | 4 | Harder capitals; latitude and longitude, the equator, hemispheres, the tropics, time zones | `The capital of Australia is ___.` → Canberra / Sydney / Melbourne / Perth |
| 5 | 5 | Tricky facts: the Prime Meridian, the International Date Line, landlocked countries, records that don't change | `The largest island in the world is ___.` → Greenland / Borneo / Madagascar / Iceland |
| 4 + 5 | 6 and up | Bands 4 and 5 pooled together | — |

### Item format (`src/game/geography-bank.ts`)

Geography uses the shared `BankItem` type from `src/game/bank.ts`. Ids are `geo-<band>-<nnn>`, e.g. `geo-2-014`.

### Content rules (every Geography item)

**All of Science's content rules apply** (Science spec §2). That covers both the rules checked by a person and the rules checked by tests. In particular:
- exactly one true choice
- true as written, with no "well, actually" exceptions
- timeless, and no myths
- digits for numbers, metric units, American spelling
- suitable for all ages
- sentences ≤ 60 characters and choices ≤ 16 characters

**Geography adds these rules, checked by a person:**
- **Leave out anything in flux:**
  - capitals that are being moved (e.g. Indonesia)
  - countries with more than one capital, or with a disputed capital (e.g. South Africa, Bolivia, the Netherlands, Israel, Côte d'Ivoire, Sri Lanka)
  - disputed territories and borders
  - recently renamed countries or cities, and names with competing spellings (e.g. Türkiye/Turkey, Czechia, Eswatini, Myanmar/Burma, Kyiv/Kiev)
  - population sizes and rankings
- **Leave out contested records and model-dependent counts:**
  - the longest river (Nile or Amazon)
  - the number of continents or oceans
  - whether the Caspian Sea is a lake
- **Qualify records that need it:**
  - "above sea level" for Mount Everest
  - "hot desert" for the Sahara, because Antarctica is technically the largest desert
- **Wrong choices come from the same category:**
  - For capitals, use real cities in the same country or region. The best traps are the famous non-capital cities, such as Sydney for Australia.
  - A wrong choice must never be a capital of the country in question.
- **Names:**
  - Use the common English names of countries and cities, with official accents where the name normally carries them (e.g. Brasília).
  - "The" goes in the sentence when a name needs it, not in the choice.
- **Politically neutral:** no item takes a side in a political dispute.

**Checked mechanically:** the Science rules, applied to a third bank. The id prefix is `geo`.

### Content review

The implementation task's review is the content review, as it was for Science. A reviewer reads every Geography fact against all the person-checked rules above. The rules added in this spec come first, then accuracy and "exactly one true choice". Items that fail are fixed or replaced.

## 3. Architecture

```
src/game/geography-bank.ts       NEW      GEOGRAPHY_BANK (~200 items)
src/game/subjects.ts             CHANGED  'geography' id, registry entry, SUBJECT_IDS order
src/hooks/best-score-keys.ts     CHANGED  geography key
src/hooks/use-best-scores.ts     CHANGED  geography: 0 in the initial state
src/components/game/overlay.tsx  CHANGED  subject picker becomes a 2×2 grid of tiles
README.md                        CHANGED  Geography bullet
```

Unchanged: `bank.ts`, the reducer, scoring, difficulty, the HUD, the answer pad, the falling card, the hero and the starfield.

### Subject registry

| id | name | shortName | badge | card | fallMs | makeQuestion |
|---|---|---|---|---|---|---|
| `geography` | Geography | GEOGRAPHY | `N↑` | `sentence` | `sentenceFallMs` | `makeBankQuestion(GEOGRAPHY_BANK, …)` |

`SubjectId` becomes `'math' | 'english' | 'science' | 'geography'`, and `SUBJECT_IDS = ['math', 'english', 'science', 'geography']`. `SUBJECTS`, `BEST_SCORE_KEYS` and `BestScores` are `Record<SubjectId, …>`, so TypeScript requires each of them to gain its Geography entry.

### Best scores

- `BEST_SCORE_KEYS.geography = 'quiz-shooter:best-score:geography'`. The Math, English and Science keys are unchanged, so saved bests carry over.
- The initial state in `use-best-scores.ts` becomes `{ math: 0, english: 0, science: 0, geography: 0 }`.

### Picker (`overlay.tsx`)

- The `ready` panel keeps its title and subtitle. It renders `SUBJECT_IDS` inside a new grid container: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 12`, `alignSelf: 'stretch'`.
- `SubjectButton` becomes a tile. Its layout changes from a row to a centered column:
  - badge, then name, then "Best N"
  - `flexBasis: '46%'`, `flexGrow: 1`
  - `paddingVertical: 14` and `paddingHorizontal: 8`
- Tiles keep their border, background and pressed styles, the `accessibilityRole="button"` and the `accessibilityLabel`.
- The Paused and Game Over panels are unchanged.

## 4. Testing & Verification

**Unit tests** (written before the code):
- **`game/bank-content-test.ts`:** the `BANKS` table gains `['Geography', 'geo', GEOGRAPHY_BANK]`, so every mechanical rule runs over the Geography bank.
- **`game/bank-test.ts`:** the `BANKS` table gains `['Geography', GEOGRAPHY_BANK]`. Questions must come from the level's bands, the reveal must round-trip, and band 1 must never repeat while fresh items remain.
- **`game/subjects-test.ts`:**
  - `SUBJECT_IDS` is math, english, science, geography.
  - Geography's name, short name, badge (`N↑`) and card (`sentence`) are correct.
  - Its fall time is `sentenceFallMs`.
  - It draws from `GEOGRAPHY_BANK` and honours `usedKeys`.
- **`hooks/best-score-keys-test.ts`:** the Geography key is correct, and the other three are unchanged.
- **`game/reducer-test.ts`:** `START` with `geography` draws its first question from band 1.
- **Expected total:** 727 tests (519 today + 203 content + 2 engine + 1 subjects + 1 keys + 1 reducer).

The picker layout is UI and has no unit test; the manual check covers it.

**Content review:** as described in §2.

**Manual (human, Expo Go on a phone):**
- The 2×2 picker shows all four subjects with their bests, fits without scrolling (including at the largest OS text size), and "Mathematics" stays on one line.
- A Geography run end to end: falling sentences, correct shots, the reveal, Play again and Change subject.
- Long place names on the answer buttons (e.g. "South America").
- The Math, English and Science bests from before the update are still there.

**Done means** `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass.

## Out of Scope

- Maps, flags or other images on cards.
- US states and other country-specific content.
- Quizzes generated from country data.
- Scrolling in the picker. The grid fits without it.
- Text-size caps on the Paused and Game Over panels. That is a pre-existing follow-up.
