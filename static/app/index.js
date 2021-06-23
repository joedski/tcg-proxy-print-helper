// @ts-check

import * as R from "./replacer.js";
import * as E from "./events.js";

const cardProxyEls = [...document.querySelectorAll(".mtg-proxy-card")];
const cardJsonLink = document.querySelector('link[rel="mtg:cardlist"]');
const cardJsonHref = cardJsonLink.getAttribute("href");

if (!cardJsonHref) {
  throw new Error(`Invalid Card JSON Href: ${cardJsonHref}`);
}

const cardJsonPromise = fetch(cardJsonHref)
  .then((response) => {
    if (response.ok) return response.json();
    throw Object.assign(
      new Error(
        `Error loading Card JSON: ${response.status} ${response.statusText}`
      ),
      { response }
    );
  })
  .then((cardJson) => {
    cardDb = cardJson;
    return cardJson;
  });

let cardDb = [];

cardProxyEls.forEach(cardProxyHelper);

function cardProxyHelper(rootEl) {
  rootEl.$state = {
    form: {
      cardNameSearch: "",
    },
    currentCard: null,
  };

  E.listen(rootEl, {
    "click .tcg-proxy__search-result-item": (event) => {
      const scryfallId = event.target.dataset.scryfallId;

      if (!scryfallId) return;

      const nextCard = getCardById(scryfallId);

      update((state) => ({
        ...state,
        currentCard: nextCard,
      }));
    },
    "keyup .tcg-proxy__name-search": (event) => {
      update((state) => ({
        ...state,
        form: {
          ...state.form,
          cardNameSearch: event.target.value,
        },
      }));
    },
  });

  // Yeah, I should really just use µhtml.
  R.withElementAndRoot(
    rootEl,
    document.body,
    R.template("#proxy-card-template", {})
  );

  update((s) => s);

  cardJsonPromise.then(() => update((s) => s));

  function update(mapState) {
    rootEl.$state = mapState(rootEl.$state);
    draw(rootEl.$state);
  }

  function draw(state) {
    R.withElementAndRoot(
      rootEl,
      document.body,
      R.replaceIn({
        ".tcg-proxy__name-search": R.updateEl((el) => {
          el.value = state.form.cardNameSearch;
        }),
        ".tcg-proxy__search-results":
          state.form.cardNameSearch.length >= 3
            ? searchCardDb(state.form.cardNameSearch)
                .slice(0, 10)
                .map((cardObject) =>
                  R.compose(
                    R.updateEl((fragment) => {
                      fragment.children[0].dataset.scryfallId = cardObject.id;
                      return fragment;
                    }),
                    R.template("#proxy-card-search-result-item-template", {
                      ".tcg-proxy__search-result-item__name": R.text(
                        cardObject.name
                      ),
                      ".tcg-proxy__search-result-item__misc": R.text(
                        renderCardMisc(cardObject)
                      ),
                    })
                  )
                )
            : [],
        ".tcg-proxy__card": R.style({
          backgroundImage: state.currentCard
            ? `url(${state.currentCard.image_uris.normal})`
            : "",
        }),
      })
    );
  }
}

function renderCardMisc(cardObject) {
  const parts = [cardObject.set, `#${cardObject.collector_number}`];

  if (cardObject.foil) {
    parts.push("Foil");
  }

  return parts.join(" ");
}

function searchCardDb(text) {
  return cardDb
    .filter(
      (card) => card.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
    )
    .sort((a, b) => {
      const nameResult = a.name.localeCompare(b.name);
      if (nameResult !== 0) return nameResult;

      const dateResult = -1 * a.released_at.localeCompare(b.released_at);
      if (dateResult !== 0) return dateResult;

      const setResult = a.set.localeCompare(b.released_at);
      if (setResult !== 0) return setResult;

      const foilResult = (a.foil ? "B" : "A").localeCompare(b.foil ? "B" : "A");
      if (foilResult !== 0) return foilResult;

      return 0;
    });
}

function getCardById(scryfallId) {
  return cardDb.find((card) => card.id === scryfallId);
}
