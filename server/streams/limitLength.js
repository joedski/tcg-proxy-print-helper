// @ts-check

const stream = require("stream");
const { createPrivateStore } = require("../util/private.js");

class LengthLimitExceededError extends Error {
  constructor(message) {
    super(message);
  }
}

exports.LengthLimitExceededError = LengthLimitExceededError;

/**
 * Counts the bytes/octets coming in, and throws an error that count exceeds
 * the specified maximum.
 *
 * - Mode: Buffer -> Buffer
 * @param {number} maxByteLength Maximum byte length past which an error should be thrown.
 */
exports.limitLength = function limitLength(maxByteLength) {
  const bufferBytes = createPrivateStore(() => 0);

  return new stream.Transform({
    objectMode: false,
    decodeStrings: false,
    transform(chunk, encoding, callback) {
      const prevTotalBytes = bufferBytes.get(this);

      // Shouldn't really happen after we error.
      if (prevTotalBytes > maxByteLength) {
        callback();
      }

      const nextBytes = Buffer.isBuffer(chunk)
        ? chunk.byteLength
        : [...chunk].length;
      const nextTotalBytes = prevTotalBytes + nextBytes;

      bufferBytes.set(this, nextTotalBytes);

      if (nextTotalBytes > maxByteLength) {
        callback(
          new LengthLimitExceededError(
            `Input exceeded limit of ${maxByteLength} bytes`
          )
        );
        return;
      }

      callback(null, chunk);
    },
    flush(callback) {
      callback();
    },
  });
};
