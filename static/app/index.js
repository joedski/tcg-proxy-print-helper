// @ts-check
import { Result, AsyncData } from "./util.js";
import { render, html } from "./uhtml.js";

app(document.querySelector(".tcg-card-set"), CardProxiesApp, {
  effects: [
    function fetchCardData(ctx) {
      // ...
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
 * @param {Array<(ctx: AppContext<CardProxiesAppState>) => void>} [options.effects]
 * @returns
 */
function app(where, component, { effects = [] } = {}) {
  /** @type {AppContext<CardProxiesAppState>} */
  const ctx = {
    state: initialState(),
    update(mapState) {
      ctx.state = mapState(ctx.state);
      effects.forEach((effectExecutor) => effectExecutor(ctx));
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

function CardProxiesApp(ctx) {
  return html` ${CardProxiesForm(ctx)} ${CardProxyGrid(ctx)} `;
}

function CardProxiesForm(ctx) {
  return html`
    <div class="tcg-proxy__form">
      <h1>MTG Proxies Helper</h1>
      <p>
        Enter a TCGPlayer-style list of cards below in "(Count) (Cardname)
        [Set]" format.
      </p>
      <textarea
        class="tcg-proxy__card-list"
        type="text"
        placeholder="4 Black Lotus
4 Ancestral Recall [2ed]"
        onkeyup=${onCardListKeyup(ctx)}
      >
${ctx.state.form.cardListText}</textarea
      >
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

function partition(size) {
  function $partition(parts, next) {
    if (!parts.length || parts[parts.length - 1].length >= size) {
      parts.push([]);
    }

    const last = parts[parts.length - 1];

    last.push(next);

    return parts;
  }
}
