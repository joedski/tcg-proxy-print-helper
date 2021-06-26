// @ts-check

/**
 * Parses a card list text into a card list!
 * @param {string} cardListString Card List String to parse.
 * @returns {any[]}
 */
export function parseCardList(cardListString) {
  const lines = cardListString
    .split(/\n+/gm)
    .map((line) => line.replace(/^\s+|\s+$/g, ""))
    .filter(Boolean);

  return lines.map(parseCardListLine);
}

const CARD_LIST_LINE_PATTERN =
  /^([0-9]+) +([^\[\]]+)(?: +\[([^\[\]]+)\](?: +([0-9]+))?)?$/;

export function parseCardListLine(line, lineIndex) {
  const lineMatches = CARD_LIST_LINE_PATTERN.exec(line);

  if (!lineMatches) {
    throw new Error(
      `Could not parse card list line #${lineIndex + 1}: ${JSON.stringify(
        line
      )}`
    );
  }

  const [, countString, name, set = null, collectorNumberString = null] =
    lineMatches;

  if (!countString || !name) {
    throw new Error(
      `Card list line #${
        lineIndex + 1
      } did not have count and/or name: ${JSON.stringify(line)}`
    );
  }

  const count = parseInt(countString, 10);

  const collectorNumber =
    collectorNumberString != null ? parseInt(collectorNumberString, 10) : null;

  return {
    count,
    name,
    set,
    collectorNumber,
  };
}