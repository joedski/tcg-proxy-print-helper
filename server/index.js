// @ts-check

const path = require("path");
const fs = require("fs");
const Koa = require("koa");
const Router = require("@koa/router");

console.log("loading Card DB...");
// Yeah this takes about 20 seconds.
const cardDbText = fs.readFileSync(
  path.resolve(
    __dirname,
    "..",
    "data",
    "scryfall-default-cards-20210621090321.json"
  ),
  "utf-8"
);
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

// const serveStaticFiles = require("koa-static")(path.resolve("..", "static"));

// searchRouter.get("static", "/(.*)", serveStaticFiles);

app.use(searchRouter.routes());
app.use(searchRouter.allowedMethods());
// app.use(serveStaticFiles);

const PORT = 3030;

app.listen(PORT);
console.log(`App started on port ${PORT}`);
