// @ts-check

const path = require("path");
const fs = require("fs");
const Koa = require("koa");
const Router = require("@koa/router");

const { stringFromBuffer, toUtf8 } = require("./streams/stringFromBuffer");
const { limitLength } = require("./streams/limitLength");
const { collectString } = require("./streams/collectString");
const { promiseLastFromStream } = require("./streams/promiseFromStream");

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
  const page = 0;
  const pageSize = 10;

  // Should be a 400.
  if (!name) {
    ctx.status = 400;
    return;
  }

  const nameNormalized = (Array.isArray(name) ? name[0] : name).toLowerCase();

  const allCards = cardDb.filter(
    (card) => card.name.toLowerCase().indexOf(nameNormalized) !== -1
  );

  const sliceStart = page * pageSize;

  const sentCards = allCards.slice(sliceStart, pageSize);

  ctx.headers["content-type"] = "application/json";
  ctx.body = {
    contents: sentCards,
    page: page,
    size: pageSize,
    totalPages: Math.ceil(allCards.length / pageSize),
    totalElements: allCards.length,
  };
});

searchRouter.post("/cardList", async (ctx) => {
  const requestContentType = ctx.request.header["content-type"];

  if (requestContentType.toLowerCase().indexOf("application/json") !== 0) {
    ctx.status = 415;
    return;
  }

  let requestBody;

  try {
    requestBody = await promiseLastFromStream(
      ctx.req
        .pipe(limitLength(8 * 1024))
        .pipe(stringFromBuffer(toUtf8))
        .pipe(collectString())
    ).then((body) => JSON.parse(body));
  } catch (error) {
    if (error instanceof SyntaxError) {
      ctx.status = 400;
    } else {
      throw error;
    }

    return;
  }

  const isCardIdentifierMatched = new Map();

  const cards = cardDb.filter((card) => {
    if (isCardIdentifierMatched.size === requestBody.length) {
      return false;
    }

    if (!card.games.includes("paper")) {
      return false;
    }

    for (const cardIdentifier of requestBody) {
      if (isCardIdentifierMatched.get(cardIdentifier)) {
        continue;
      }

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

      if (isNameMatched && isSetMatched && isCollectorNumberMatched) {
        isCardIdentifierMatched.set(cardIdentifier, true);
        return true;
      }
    }

    return false;
  });

  ctx.body = cards;
});

// const serveStaticFiles = require("koa-static")(path.resolve("..", "static"));

// searchRouter.get("static", "/(.*)", serveStaticFiles);

app.use(searchRouter.routes());
app.use(searchRouter.allowedMethods());
// app.use(serveStaticFiles);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3030;

app.listen(PORT);
console.log(`App started on port ${PORT}`);
