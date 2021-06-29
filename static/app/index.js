// @ts-check
import { Result, AsyncData } from "./util.js";
import { render, html } from "./uhtml.js";
import { parseCardList } from "./cardList.js";

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
        cardData: AsyncData.Data(responseBody.cards),
      }));
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
      cardListText: "",
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
  return html`
    <div class="tcg-card-row">
      <div class="tcg-card">
        Test:
        <pre>${ctx.state.form.cardListText}</pre>
      </div>
    </div>
  `;
}
