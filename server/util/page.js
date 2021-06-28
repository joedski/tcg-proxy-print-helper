// @ts-check

const { asInt, takeFirstValue } = require("./params");

/**
 * @typedef {object} RequestPage
 * @property {number} page Which page is being requested, 0-indexed.
 * @property {number} size Desired size of the page.
 */

/**
 * @param {Record<string, string | string[]>} query
 * @param {Partial<RequestPage>} pageDefaults
 * @returns {RequestPage}
 */
function getPageParams(query, pageDefaults = {}) {
  return {
    page: asInt(takeFirstValue(query.page), pageDefaults.page || 0),
    size: asInt(takeFirstValue(query.size), pageDefaults.size || 10),
  };
}

exports.getPageParams = getPageParams;
