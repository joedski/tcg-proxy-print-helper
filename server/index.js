// @ts-check

const path = require("path");
const fs = require("fs");
const Koa = require("koa");
const Router = require("@koa/router");

const { stringFromBuffer, toUtf8 } = require("./streams/stringFromBuffer");
const {
  limitLength,
  LengthLimitExceededError,
} = require("./streams/limitLength");
const { collectString } = require("./streams/collectString");
const { promiseLastFromStream } = require("./streams/promiseFromStream");
const { getPageParams } = require("./util/page");

const CARD_DB_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "scryfall-default-cards-20210621090321.json"
);

console.log("loading Card DB...");
// Yeah this takes about 20 seconds, but to be fair it's 200+ MB.
const cardDbText = fs.readFileSync(CARD_DB_PATH, "utf-8");
const cardDb = JSON.parse(cardDbText);
console.log("Card DB loaded!");

const app = new Koa();

const searchRouter = new Router();

searchRouter.get("/cards", async (ctx) => {
  const name = ctx.query.name;
  const pageParams = getPageParams(ctx.query);

  if (!name) {
    ctx.status = 400;
    return;
  }

  const nameNormalized = (Array.isArray(name) ? name[0] : name).toLowerCase();

  const allCards = cardDb.filter(
    (card) => card.name.toLowerCase().indexOf(nameNormalized) !== -1
  );

  const sliceStart = pageParams.page * pageParams.size;

  const sentCards = allCards.slice(sliceStart, pageParams.size);

  ctx.headers["content-type"] = "application/json";
  ctx.body = {
    contents: sentCards,
    ...pageParams,
    totalPages: Math.ceil(allCards.length / pageParams.size),
    totalElements: allCards.length,
  };
});

/**
 * Keeps the "more preferred" card by checking, in order:
 *
 * 1. If either is nullish, returns the not-nullish one or else nullish.
 * 2. If either but not both are a token or double_faced_token, prefer the non-token.
 * 3. If either but not both are digital, prefer the non-digital.
 * 4. If they were released at different times, prefer the newer one.
 * 5. Failing that, return the next one.
 *
 * @param {object} prev
 * @param {object} next
 * @returns {object}
 */
function keepPreferredCardRecord(prev, next) {
  if (!prev || !next) {
    return prev || next;
  }

  // This has to be done because Scryfall also indexes tokens,
  // which include things like the "Llanowar Elves" token created by
  // the "Llanowar Mentor".
  const prevIsToken =
    prev.layout === "token" || prev.layout === "double_faced_token";
  const nextIsToken =
    next.layout === "token" || next.layout === "double_faced_token";

  if (prevIsToken !== nextIsToken) {
    return prevIsToken ? next : prev;
  }

  if (prev.lang !== next.lang && (prev.lang === "en" || next.lang === "en")) {
    return next.lang === "en" ? next : prev;
  }

  if (prev.digital !== next.digital) {
    return prev.digital ? next : prev;
  }

  if (prev.released_at !== next.released_at) {
    return prev.released_at > next.released_at ? prev : next;
  }

  return next;
}

searchRouter.post("/cardList", async (ctx) => {
  const requestContentType = ctx.request.header["content-type"];

  if (requestContentType.toLowerCase().indexOf("application/json") !== 0) {
    ctx.status = 415;
    return;
  }

  let requestBody;

  try {
    requestBody = await promiseLastFromStream((handleError) =>
      ctx.req
        .pipe(limitLength(8 * 1024))
        .on("error", handleError)
        .pipe(stringFromBuffer(toUtf8))
        .pipe(collectString())
    ).then((body) => JSON.parse(body));
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      error instanceof LengthLimitExceededError
    ) {
      ctx.status = 400;
    } else {
      throw error;
    }

    return;
  }

  const recordByIdentifier = new Map();

  for (const card of cardDb) {
    for (const cardIdentifier of requestBody) {
      const prevRecordFound = recordByIdentifier.get(cardIdentifier);

      const isNameMatched =
        card.name.toLowerCase() === cardIdentifier.name.toLowerCase();
      const isSetMatched =
        typeof cardIdentifier.set === "string"
          ? card.set.toLowerCase() === cardIdentifier.set.toLowerCase()
          : true;
      const isCollectorNumberMatched =
        typeof cardIdentifier.collectorNumber === "string"
          ? card.collector_number.toLowerCase() ===
            cardIdentifier.collectorNumber.toLowerCase()
          : true;
      const preferredRecord = keepPreferredCardRecord(prevRecordFound, card);

      if (!(isNameMatched && isSetMatched && isCollectorNumberMatched)) {
        continue;
      }

      if (prevRecordFound == null || prevRecordFound !== preferredRecord) {
        recordByIdentifier.set(cardIdentifier, preferredRecord);
      }

      break;
    }
  }

  ctx.body = {
    cards: requestBody.map((identifier) => ({
      identifier,
      card: recordByIdentifier.get(identifier) || null,
    })),
  };
});

const serveStaticFiles = require("koa-static")(
  path.resolve(__dirname, "..", "static")
);

searchRouter.get("/(.*)", serveStaticFiles);

app.use(searchRouter.routes());
app.use(searchRouter.allowedMethods());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3030;

app.listen(PORT);
console.log(`App started on port ${PORT}`);
