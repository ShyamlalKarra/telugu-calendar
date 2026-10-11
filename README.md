# Sankalpam Today — Telugu calendar prototype

Today's Telugu (amanta) calendar words for your sankalpam — samvatsara, ayana, ritu,
masa, paksha, tithi, vara, nakshatra — computed for your city at local sunrise, with an
animated dial that shows how each masa gets its name.

## Run it locally

No build step. Any static file server works:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

You can link to a specific day and city: `http://localhost:8080/?date=2026-06-01&city=edison`

## Single-file build

`npm run build` writes `dist/sankalpam-today.html`, one self-contained file with everything inlined.

## Check the calculations

```sh
npm install
npm test
```

`test/validate.js` checks the engine against dates published by independent panchangams:
today's masa/tithi/nakshatra, Navaratri 2025 and 2027, adhika masas in 2010, 2020, 2026,
2029 and 2031, and the kshaya masas of 1963, 1983 and 2123–24.

## How it works

`src/panchang.js` treats the calendar as a function of two numbers, the sidereal
longitudes of the Sun and Moon:

| Term | Rule |
|---|---|
| tithi | (Moon − Sun) in 12° steps, 30 per lunar month |
| nakshatra | sidereal Moon in 13°20′ steps, 27 in all |
| masa | lunar month (new moon to new moon) named by the sankranti inside it; none ⇒ adhika, two ⇒ kshaya |
| vara | weekday, starting at local sunrise |

## Why planets go vakra (`planets.html`)

Planets orbit as circles using the periods printed in *Basics of Panchangam Achara Vichara*
(pp. 4–5), with orbit sizes from Kepler's third law and starting positions from Astronomy Engine.
"Stand on the Earth" morphs the picture from the Sun's view to the Earth's, and each orbit folds
into loops: those loops are vakra. `test/planets-check.js` compares the model with the real sky
for two years: Shani within ~1°, Guru ~4°, Shukra ~7°, Kuja up to ~32° (its orbit is the most oval).
The booklet's Moon period 27.32966 d looks like a misprint for 27.32166 d (which gives the
29.5306-day lunar month).

## Known limitations

- **Ayanamsha** is a linear approximation of Lahiri, not the official value.
- **Ritu** is counted from the lunar masa; **ayana** from the sidereal Sun. Traditions differ.
- **Festival dates** need extra rules (which part of the day a tithi must cover) that are not implemented.
- **Telugu spellings** of the 60 samvatsara names need review by a native reader.
- The words are shown in dictionary form, not in the declined form recited in a sankalpam.

## Credits

- [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT) for Sun and Moon positions.
- Fonts: Tiro Telugu and Atkinson Hyperlegible (SIL Open Font License), bundled in `fonts/`.
- Background reading: Dershowitz & Reingold, *Indian Calendrical Calculations*; V. K. Mishra, *The Calendars of India* (arXiv:1007.0062).
