// @ts-check

const { tap } = require("./tap");

/**
 * Creates a promise on the last value of a stream.  If the stream errors,
 * the promise rejects.
 *
 * @param {import('stream').Duplex} stream
 * @returns {Promise<any>}
 */
exports.promiseLastFromStream = function promiseLastFromStream(stream) {
  return new Promise((resolve, reject) => {
    let value;

    const tapper = stream.pipe(
      tap((next) => {
        value = next;
      })
    );

    tapper.on("finish", () => resolve(value));
    tapper.on("error", (error) => reject(error));
  });
};
