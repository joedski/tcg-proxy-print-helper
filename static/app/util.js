// @ts-check

/**
 * @template TSum
 * @template TTag
 * @typedef {TSum extends [TTag, ...infer TArgs] ? TArgs extends any[] ? TArgs : [] : never} ArgsOfTag
 */

/**
 * Utility predicate to make case-based logic easier.
 * @template {String} TAll
 * @template {TAll} C
 * @param {[TAll, ...any[]]} thisCase
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
    return new Result(["Ok", value]);
  }

  /**
   * @template E
   * @param {E} value
   * @returns {Result<any, E>}
   */
  static Failure(value) {
    return new Result(["Failure", value]);
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
    /** @type {['Ok', T] | ['Failure', E]} */
    thisCase
  ) {
    switch (thisCase[0]) {
      case "Ok":
      case "Failure":
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

    if (taggedSumCaseIs(thisCase, "Ok")) {
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
      case "Ok":
        if (this.case[1] instanceof Result) return this.case[1];
        throw new Error(`Cannot join non-Result value ${this.case[1]}`);

      default:
      case "Failure":
        return /** @type {Result<any, E>} */ (this);
    }
  }

  /**
   * @template R
   * @param {{ [K in Result<T, E>["case"][0]]: (...args: ArgsOfTag<Result<T, E>["case"], K>) => R }} caseMap
   * @returns {R}
   */
  cata(caseMap) {
    const thisCase = this.case;
    const caseHandler = caseMap[thisCase[0]];
    const [, ...caseArgs] = thisCase;
    return caseHandler.apply(null, caseArgs);
  }

  /**
   * @template U
   * @param {U} elseValue
   * @returns {T | U}
   */
  getOkOr(elseValue) {
    const thisCase = this.case;

    if (taggedSumCaseIs(thisCase, "Ok")) {
      return thisCase[1];
    }

    return elseValue;
  }

  /**
   * @template U
   * @param {U} elseValue
   * @returns {E | U}
   */
  getFailureOr(elseValue) {
    const thisCase = this.case;

    if (taggedSumCaseIs(thisCase, "Failure")) {
      return thisCase[1];
    }

    return elseValue;
  }
}

/**
 * @template D
 * @template E
 */
export class AsyncData {
  static NotAsked() {
    return $notAsked;
  }

  static Waiting() {
    return $waiting;
  }

  /**
   * @template D
   * @param {D} value
   * @returns {AsyncData<D, any>}
   */
  static Data(value) {
    return new AsyncData(["Data", value]);
  }

  /**
   * @template E
   * @param {E} value
   * @returns {AsyncData<any, E>}
   */
  static Error(value) {
    return new AsyncData(["Error", value]);
  }

  /**
   * @template D
   * @param {() => D} fn
   * @returns {AsyncData<D, any>}
   */
  static ofCall(fn) {
    try {
      return AsyncData.Data(fn());
    } catch (error) {
      return AsyncData.Error(error);
    }
  }

  /**
   * Transforms an ordinary function that may throw into a function
   * returning a AsyncData.
   *
   * Note that because you can throw _anything_ in JS, the failure type
   * is `unknown`.  It could even be `undefined`!
   * @template R
   * @template {any[]} TArgs
   * @param {(...args: TArgs) => R} fn
   * @returns {(...args: TArgs) => AsyncData<R, unknown>}
   */
  static liftThrowing(fn) {
    return function $lifted(...args) {
      return AsyncData.ofCall(() => fn.apply(this, args));
    };
  }

  constructor(
    /** @type {['NotAsked'] | ['Waiting'] | ['Data', D] | ['Error', E]} */
    thisCase
  ) {
    switch (thisCase[0]) {
      case "NotAsked":
      case "Waiting":
      case "Data":
      case "Error":
        break;

      default:
        throw new Error(`Unrecognized tag ${thisCase[0]}`);
    }

    this.case = thisCase;
  }

  toJson() {
    return {
      type: "AsyncData",
      tag: this.case[0],
      value: this.case[1],
    };
  }

  /**
   * @template U
   * @param {(value: D) => U} fn
   * @returns {AsyncData<U, E>}
   */
  map(fn) {
    const thisCase = this.case;

    if (taggedSumCaseIs(thisCase, "Data")) {
      return AsyncData.Data(fn(thisCase[1]));
    }

    return /** @type {AsyncData<any, E>} */ (this);
  }

  /**
   *
   * @template U
   * @template F
   * @param {(value: D) => AsyncData<U, F>} fn
   * @returns {AsyncData<U, E | F>}
   */
  flatMap(fn) {
    return this.map(fn).join();
  }

  // Not really sure how to get this one working type-wise in jsdocs.
  /**
   * @template TInner
   * @template EInner
   * @this {AsyncData<AsyncData<TInner, EInner>, E>}
   * @returns {AsyncData<TInner, EInner | E>}
   */
  join() {
    switch (this.case[0]) {
      case "Data":
        if (this.case[1] instanceof AsyncData) return this.case[1];
        throw new Error(`Cannot join non-AsyncData value ${this.case[1]}`);

      default:
      case "Error":
        return /** @type {AsyncData<any, E>} */ (this);
    }
  }

  /**
   * @template R
   * @param {{ [K in AsyncData<D, E>["case"][0]]: (...args: ArgsOfTag<AsyncData<D, E>["case"], K>) => R }} caseMap
   * @returns {R}
   */
  cata(caseMap) {
    const thisCase = this.case;
    const caseHandler = caseMap[thisCase[0]];
    const [, ...caseArgs] = thisCase;
    return caseHandler.apply(null, caseArgs);
  }

  /**
   * @template U
   * @param {U} elseValue
   * @returns {D | U}
   */
  getDataOr(elseValue) {
    const thisCase = this.case;

    if (taggedSumCaseIs(thisCase, "Data")) {
      return thisCase[1];
    }

    return elseValue;
  }

  /**
   * @template U
   * @param {U} elseValue
   * @returns {E | U}
   */
  getErrorOr(elseValue) {
    const thisCase = this.case;

    if (taggedSumCaseIs(thisCase, "Error")) {
      return thisCase[1];
    }

    return elseValue;
  }
}

const $notAsked = new AsyncData(["NotAsked"]);
const $waiting = new AsyncData(["Waiting"]);

export function partition(size) {
  function $partition(parts, next) {
    if (!parts.length || parts[parts.length - 1].length >= size) {
      parts.push([]);
    }

    const last = parts[parts.length - 1];

    last.push(next);

    return parts;
  }
}
