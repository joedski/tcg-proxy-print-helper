// @ts-check

/**
 * Utility predicate to make case-based logic easier.
 * @template {Function} C
 * @param {[Function, ...any[]]} thisCase
 * @param {C} desired
 * @returns {thisCase is [C, ...any[]]}
 */
function taggedSumCaseIs(thisCase, desired) {
  return thisCase[0] === desired;
}

/**
 * @template T
 * @template E
 */
export class Result {
  /**
   * @template T
   * @param {T} value
   * @returns {Result<T, any>}
   */
  static Ok(value) {
    return new Result([Result.Ok, value]);
  }

  /**
   * @template E
   * @param {E} value
   * @returns {Result<any, E>}
   */
  static Failure(value) {
    return new Result([Result.Failure, value]);
  }

  /**
   * @template T
   * @param {() => T} fn
   * @returns {Result<T, any>}
   */
  static ofCall(fn) {
    try {
      return Result.Ok(fn());
    } catch (error) {
      return Result.Failure(error);
    }
  }

  /**
   * Transforms an ordinary function that may throw into a function
   * returning a Result.
   *
   * Note that because you can throw _anything_ in JS, the failure type
   * is `unknown`.  It could even be `undefined`!
   * @template R
   * @template {any[]} TArgs
   * @param {(...args: TArgs) => R} fn
   * @returns {(...args: TArgs) => Result<R, unknown>}
   */
  static liftThrowing(fn) {
    return function $lifted(...args) {
      return Result.ofCall(() => fn.apply(this, args));
    };
  }

  constructor(
    /** @type {[typeof Result.Ok, T] | [typeof Result.Failure, E]} */
    thisCase
  ) {
    switch (thisCase[0]) {
      case Result.Ok:
      case Result.Failure:
        break;

      default:
        throw new Error(`Unrecognized tag ${thisCase[0]}`);
    }

    this.case = thisCase;
  }

  toJson() {
    return {
      type: "Result",
      tag: this.case[0],
      value: this.case[1],
    };
  }

  /**
   * @template U
   * @param {(value: T) => U} fn
   * @returns {Result<U, E>}
   */
  map(fn) {
    const thisCase = this.case;

    if (taggedSumCaseIs(thisCase, Result.Ok)) {
      return Result.Ok(fn(thisCase[1]));
    }

    return /** @type {Result<any, E>} */ (this);
  }

  /**
   *
   * @template U
   * @template F
   * @param {(value: T) => Result<U, F>} fn
   * @returns {Result<U, E | F>}
   */
  flatMap(fn) {
    return this.map(fn).join();
  }

  // Not really sure how to get this one working type-wise in jsdocs.
  /**
   * @template TInner
   * @template EInner
   * @this {Result<Result<TInner, EInner>, E>}
   * @returns {Result<TInner, EInner | E>}
   */
  join() {
    switch (this.case[0]) {
      case Result.Ok:
        if (this.case[1] instanceof Result) return this.case[1];
        throw new Error(`Cannot join non-Result value ${this.case[1]}`);

      default:
      case Result.Failure:
        return /** @type {Result<any, E>} */ (this);
    }
  }
}
