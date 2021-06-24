// @ts-check
import { render, html } from "./uhtml.js";

app(document.querySelector(".tcg-card-set"), CardProxiesApp);

function app(where, component) {
  const ctx = {
    state: initialState(),
    update(mapState) {
      ctx.state = mapState(ctx.state);
      render(where, component(ctx));
    },
  };

  return render(where, component(ctx));
}

function initialState() {
  return {
    form: {
      cardListText: "",
    },
    currentCard: null,
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
