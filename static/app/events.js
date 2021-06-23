export function all(handlers) {
  return function $all(event) {
    handlers.forEach((handler) => handler(event));
  };
}

export function ifTargetIs(selector, handler) {
  return function $ifTargetIs(event) {
    const possibleTargets = new Set(
      event.currentTarget.querySelectorAll(selector)
    );

    if (possibleTargets.has(event.target)) {
      return handler(event);
    }
  };
}

export function ifTargetIsOrChildOf(selector, handler) {
  return function $ifTargetIsOrChildOf(event) {
    const possibleTargets = [...event.currentTarget.querySelectorAll(selector)];

    const target = possibleTargets.find(
      (given) => event.target === given || given.contains(event.target)
    );

    if (target != null) {
      // Delicious lies.
      const proxyEvent = { target };
      Object.setPrototypeOf(proxyEvent, event);

      handler(proxyEvent);
    }
  };
}

export function listen(el, mapping) {
  const listenerDefs = Object.entries(mapping);
  const registrations = [];

  for (const [eventAndSelector, handler] of listenerDefs) {
    const [event, selector] = eventAndSelector.split(/ +/);
    const wrappedHandler = selector
      ? ifTargetIsOrChildOf(selector, handler)
      : handler;

    el.addEventListener(event, wrappedHandler);

    registrations.push({
      event,
      handler: wrappedHandler,
    });
  }

  return () => {
    registrations.forEach(({ event, handler }) => {
      el.removeEventListener(event, handler);
    });
  };
}
