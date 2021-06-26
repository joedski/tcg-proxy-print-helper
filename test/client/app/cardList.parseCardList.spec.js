import { parseCardList } from "../../../static/app/cardList";

test("Produces an empty array given an empty string", () => {
  const actual = parseCardList("");

  expect(actual).toEqual([]);
});

test("Produces an empty array given a string containing only whitespace", () => {
  const actual = parseCardList(`

  `);

  expect(actual).toEqual([]);
});

test("Parses a single row with only card count and name", () => {
  const actual = parseCardList(`4 Chaos Confetti
`);

  expect(actual).toEqual([
    {
      count: 4,
      name: "Chaos Confetti",
      set: null,
      collectorNumber: null,
    },
  ]);
});

test("Parses a single row with card count, name, and set", () => {
  const actual = parseCardList(`54 Relentless Rats [plist]
`);

  expect(actual).toEqual([
    {
      count: 54,
      name: "Relentless Rats",
      set: "plist",
      collectorNumber: null,
    },
  ]);
});

test("Parses a single row with card count, name, set, and collector number", () => {
  const actual = parseCardList(`54 Relentless Rats [plist] 112
`);

  expect(actual).toEqual([
    {
      count: 54,
      name: "Relentless Rats",
      set: "plist",
      collectorNumber: 112,
    },
  ]);
});

test("Parses multiple rows", () => {
  const actual = parseCardList(`54 Relentless Rats [plist] 112
6 Swamp
`);

  expect(actual).toEqual([
    {
      count: 54,
      name: "Relentless Rats",
      set: "plist",
      collectorNumber: 112,
    },
    {
      count: 6,
      name: "Swamp",
      set: null,
      collectorNumber: null,
    },
  ]);
});

test("Parses multiple rows, trimming whitespace from either end", () => {
  const actual = parseCardList(`    54 Relentless Rats [plist] 112    \n
   6 Swamp   \n`);

  expect(actual).toEqual([
    {
      count: 54,
      name: "Relentless Rats",
      set: "plist",
      collectorNumber: 112,
    },
    {
      count: 6,
      name: "Swamp",
      set: null,
      collectorNumber: null,
    },
  ]);
});

test("Errors if the card count is not a finite number", () => {
  expect(() => {
    parseCardList(`∞ Relentless Rats [plist] 112
  `);
  }).toThrow();
});

test("Errors if the collector number is not a finite number", () => {
  expect(() => {
    parseCardList(`54 Relentless Rats [plist] onetwelve
  `);
  }).toThrow();
});
