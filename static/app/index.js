// @ts-check
import { Result, AsyncData, partition } from "./util.js";
import { render, html } from "./uhtml.js";
import { parseCardList } from "./cardList.js";

const FORM_CARD_LIST_TEXT_KEY = "MtgCardProxiesApp:state.form.cardListText";

app(document.querySelector(".tcg-card-set"), CardProxiesApp, {
  effects: [
    async function fetchCardData(ctx) {
      const canFetch = ctx.state.cardData.cata({
        NotAsked: () => true,
        Waiting: () => false,
        Error: () => true,
        Data: () => true,
      });

      const cardList = ctx.state.cardListResult.getOkOr(null);

      const shouldFetch =
        cardList != null &&
        ctx.state.cardListResult !== ctx.prevState.cardListResult;

      if (!(canFetch && shouldFetch)) {
        return;
      }

      // Server should just punt back an empty response.content array
      // if cardList.length === 0.

      const response = await fetch("/cardList", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(cardList),
      });

      if (!response.ok) {
        ctx.update((state) => ({
          ...state,
          cardData: AsyncData.Error(
            Object.assign(
              new Error(`${response.status}: ${response.statusText}`),
              {
                response,
              }
            )
          ),
        }));

        return;
      }

      const responseBody = await response.json();

      ctx.update((state) => ({
        ...state,
        cardData: AsyncData.Data(responseBody),
      }));
    },
    function saveFormStateToLocalStorage(ctx) {
      if (ctx.state.form.cardListText === ctx.prevState.form.cardListText) {
        return;
      }

      localStorage.setItem(
        FORM_CARD_LIST_TEXT_KEY,
        ctx.state.form.cardListText
      );
    },
  ],
});

/**
 * TODO
 * @typedef {object} CardIdentifier
 */

/**
 * TODO
 * @typedef {object} ScryfallCardObject
 */

/**
 * @template TState
 * @typedef {object} AppContext
 * @property {TState} state
 * @property {(mapState: (state: TState) => TState) => void} update
 */

/**
 * @template TState
 * @typedef {object} AppEffectContext
 * @property {TState} state
 * @property {TState} prevState
 * @property {(mapState: (state: TState) => TState) => void} update
 */

/**
 * @typedef {object} CardProxiesAppState
 * @property {object} form
 * @property {string} form.cardListText
 * @property {Result<CardIdentifier[], any>} cardListResult
 * @property {AsyncData<ScryfallCardObject, any>} cardData
 */

// We could generalize this by adding the `initialState` getter to the parameters.
// It'd have to be required, naturally.  Should just use an object argument.
/**
 * @param {Node} where
 * @param {(ctx: AppContext<CardProxiesAppState>) => any} component
 * @param {object} [options]
 * @param {Array<(ctx: AppEffectContext<CardProxiesAppState>) => void>} [options.effects]
 * @returns
 */
function app(where, component, { effects = [] } = {}) {
  /** @type {AppContext<CardProxiesAppState>} */
  const ctx = {
    state: initialState(),
    update(mapState) {
      const prevState = ctx.state;
      ctx.state = mapState(ctx.state);

      // This isn't really sufficient, but I don't feel like reimplementing all of redux yet.
      const effectCtx = {
        get state() {
          return ctx.state;
        },
        get prevState() {
          return prevState;
        },
        // For now, just completely eliminating recursion with effects.
        update: ctx.update,
      };

      effects.forEach((effectExecutor) => effectExecutor(effectCtx));

      render(where, component(ctx));
    },
  };

  return render(where, component(ctx));
}

/** @returns {CardProxiesAppState} */
function initialState() {
  return {
    form: {
      cardListText: localStorage.getItem(FORM_CARD_LIST_TEXT_KEY) || "",
    },
    cardListResult: Result.Ok([]),
    cardData: AsyncData.NotAsked(),
  };
}

/**
 *
 * @param {AppContext<CardProxiesAppState>} ctx
 * @returns
 */
function CardProxiesApp(ctx) {
  return html`
    ${CardProxiesForm(ctx)}
    ${ctx.state.cardData.cata({
      NotAsked: () => html`
        <div class="app-misc-container">
          <div class="app-message app-message--info">Load a list of cards!</div>
        </div>
      `,
      Waiting: () => html`
        <div class="app-misc-container">
          <div class="app-message app-message--info">Loading...</div>
        </div>
      `,
      Error: (error) => html`
        <div class="app-message app-message--danger">
          An error occurred trying to load the card list: ${error.message}
        </div>
      `,
      Data: () => CardProxyGrid(ctx),
    })}
  `;
}

function CardProxiesForm(ctx) {
  return html`
    <div class="tcg-proxy__form">
      <h1>MTG Proxies Helper</h1>
      <p>
        Enter a TCGPlayer-style list of cards below in "(Count) (Cardname) [Set]
        (Collector Number)" format.
      </p>
      ${ctx.state.cardListResult.cata({
        Ok: () => [],
        Failure: (error) => html`
          <div class="app-message app-message--danger">
            Error processing this card list: ${error.message}
          </div>
        `,
      })}
      <textarea
        class="tcg-proxy__card-list"
        type="text"
        placeholder="4 Black Lotus
4 Ancestral Recall [2ed]
1 Vampiric Tutor [cmr] 656
"
        onkeyup=${onCardListKeyup(ctx)}
      >
${ctx.state.form.cardListText}</textarea
      >
      <div class="tcg-proxy__form-controls">
        <button
          class="app-button"
          type="submit"
          onclick="${onRenderListClick(ctx)}"
        >
          Render List
        </button>
      </div>
    </div>
  `;
}

function onCardListKeyup(ctx) {
  return (event) => {
    ctx.update((state) => ({
      ...state,
      form: {
        ...state.form,
        cardListText: event.target.value,
      },
    }));
  };
}

function onRenderListClick(ctx) {
  return () => {
    ctx.update((state) => ({
      ...state,
      cardListResult: Result.ofCall(() =>
        parseCardList(state.form.cardListText)
      ),
    }));
  };
}

function CardProxyGrid(ctx) {
  const proxyList = expandCardList(ctx.state);
  const proxyPages = proxyList
    .reduce(partition(3), [])
    .map(padPartitions(3, () => ({ isEmptyPlaceholder: true })))
    .reduce(partition(3), []);

  return proxyPages.map(
    (page) =>
      html`<div class="tcg-card-page">
        ${page.map(
          (row) => html`
            <div class="tcg-card-row">
              ${row.map((entry) =>
                !entry.card
                  ? CardProxyPlaceholder(entry)
                  : html`<div class="tcg-card">
                      <div
                        class="${`tcg-card-content ${getCardBorderClassname(
                          entry.card
                        )}`}"
                      >
                        <img
                          class="tcg-card-image"
                          src="${getFrontFaceImage(entry.card)}"
                        />
                      </div>
                    </div>`
              )}
            </div>
          `
        )}
      </div>`
  );
}

function expandCardList(state) {
  const identifierList = state.cardListResult.getOkOr([]);
  const cardData = state.cardData.map((data) => data.cards).getDataOr([]);
  const cardMap = new WeakMap();

  identifierList.forEach((identifier, index) => {
    if (!cardData[index] || !cardData[index].card) return;

    cardMap.set(identifier, cardData[index].card);
  });

  const proxiesList = [];

  for (const identifier of identifierList) {
    for (let instance = 0; instance < identifier.count; ++instance) {
      proxiesList.push({
        identifier,
        card: cardMap.get(identifier),
      });
    }
  }

  return proxiesList;
}

function getCardBorderClassname(card) {
  return `tcg-card-content--border-${card.border_color}`;
}

function getFrontFaceImage(card) {
  if (card.image_uris != null) {
    return card.image_uris.normal;
  }

  // For dual faced cards like MDFCs and Transforming cards.
  if (Array.isArray(card.card_faces)) {
    return card.card_faces[0].image_uris.normal;
  }

  return "";
}

function padPartitions(partitionSize, paddingForPartition) {
  return function $padPartitions(partition) {
    if (partition.length >= partitionSize) return partition;

    while (partition.length < partitionSize) {
      partition.push(paddingForPartition());
    }

    return partition;
  };
}

function CardProxyPlaceholder(entry) {
  if (entry.isEmptyPlaceholder) {
    return html`<div class="tcg-card tcg-card--placeholder">
      <div class="tcg-card-content">
        <div class="tcg-card-placeholder-message">
          <div class="tcg-card-placeholder-message-details">
            This space left blank for<br />alignment purposes
          </div>
        </div>
      </div>
    </div>`;
  }

  return html`<div class="tcg-card tcg-card--placeholder">
    <div class="tcg-card-content">
      <div class="tcg-card-placeholder-message">
        <h4>Card not found!</h4>
        <ul class="tcg-card-placeholder-message-details">
          ${Object.entries(entry.identifier)
            .filter(([key, value]) => key !== "count")
            .map(
              ([key, value]) =>
                html`<li>${key}: ${value == null ? "(any)" : value}</li>`
            )}
        </ul>
      </div>
    </div>
  </div>`;
}
