export function withRoot(root, mutator) {
  return applyMutator(root, mutator, { root });
}

export function withElementAndRoot(currentTarget, root, mutator) {
  return applyMutator(currentTarget, mutator, {
    root,
    currentTarget,
  });
}

export function content(mutator) {
  return function $content(context) {
    const currentTarget = context.currentTarget || context.root;
    const newContent = document.createDocumentFragment();

    currentTarget.innerHTML = "";

    currentTarget.append(applyMutator(newContent, mutator, context));

    return currentTarget;
  };
}

export function replaceIn(mapping) {
  return function $replaceIn(context) {
    const currentTarget = context.currentTarget || context.root;

    for (const [selector, mutator] of Object.entries(mapping)) {
      const el = currentTarget.querySelector(selector);

      if (el == null) continue;

      applyMutator(el, mutator, context);
    }

    return currentTarget;
  };
}

export function updateEl(updater) {
  return function $updateEl(context) {
    return updater(context.currentTarget || context.root);
  };
}

export function style(
  /** @type {Record<string, string>} */
  styleDefs
) {
  return updateEl((el) => {
    Object.assign(el.style, styleDefs);
  });
}

export function compose(...mutators) {
  const mutatorsReversed = [...mutators].reverse();

  return function $compose(context) {
    return mutatorsReversed.reduce((el, mutator) => {
      return applyMutator(el, mutator, { ...context, currentTarget: el });
    }, context.currentTarget || context.root);
  };
}

export function template(templateSelector, mapping) {
  return function $template(context) {
    const currentTarget = context.currentTarget || context.root;
    const template = context.root.querySelector(templateSelector);

    if (template == null) {
      throw new Error(
        `No template found in root for selector: ${templateSelector}`
      );
    }

    const el = template.content.cloneNode(true);

    const updatedEl = replaceIn(mapping)({
      ...context,
      currentTarget: el,
    });

    return applyMutator(currentTarget, updatedEl, context);
  };
}

export function text(textContent) {
  return function $text(context) {
    const currentTarget = context.currentTarget || context.root;

    currentTarget.textContent = textContent;

    return currentTarget;
  };
}

function applyMutator(el, mutator, context) {
  if (Array.isArray(mutator)) {
    el.innerHTML = "";
    el.append(
      ...mutator.map((m) => {
        const newContent = document.createDocumentFragment();
        return applyMutator(newContent, m, context);
      })
    );
    return el;
  }

  if (mutator instanceof Node) {
    el.innerHTML = "";
    el.append(mutator);
    return el;
  }

  if (typeof mutator === "function") {
    return mutator({
      ...context,
      currentTarget: el,
    });
  }

  throw new Error(`Unknown mutator: ${mutator}`);
}
