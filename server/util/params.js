// @ts-check

/**
 * If the query param value is a list of strings, it takes the first one.
 * If it's just a string, it takes that as is.
 * @param {null | undefined | string | string[]} param
 * @returns {string | null | undefined}
 */
function takeFirstValue(param) {
  if (Array.isArray(param)) {
    return takeFirstValue(param[0]);
  }

  return param;
}

exports.takeFirstValue = takeFirstValue;

/**
 * Tries to parse a nullable number to a finite integer.
 * If that fails, returns the specified default.
 * @param {null | undefined | string} value
 * @param {number} defaultValue
 * @returns {number}
 */
function asInt(value, defaultValue) {
  if (value == null) {
    return defaultValue;
  }

  const valueParsed = parseInt(value, 10);

  if (Number.isFinite(valueParsed)) {
    return valueParsed;
  }

  return defaultValue;
}

exports.asInt = asInt;
