/** Inspired by https://github.com/ericclemmons/click-to-component */

export {};
const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.setAttribute("data-vite-dev-id", "react-click-to-component");
style.innerHTML = `[data-click-to-component-target] {
  outline: auto 1px !important;
}

#click-to-component-tooltip {
  position: fixed !important;
  z-index: 1000 !important;
  margin-top: 8px !important;
  margin-bottom: 8px !important;
  background: #222 !important;
  color: white !important;
  padding: 4px !important;
  border-radius: 4px !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}`;
document.head.appendChild(style);

let altKey = false;
let currentTarget: HTMLElement | undefined;
let hasTooltip = false;
const tooltipElement = document.createElement("div");
tooltipElement.setAttribute("id", "click-to-component-tooltip");

window.addEventListener("keydown", (event) => {
  if (event.altKey) altKey = true;
});

window.addEventListener("keyup", (event) => {
  if (altKey && !event.altKey) cleanUp();
});

window.addEventListener("mousemove", (event) => {
  if (!altKey) return;
  if (!event.altKey) {
    cleanUp();
    return;
  }
  if (!(event.target instanceof HTMLElement)) {
    clearTarget();
    removeTooltip();
    return;
  }
  if (event.target === currentTarget || event.target === tooltipElement) return;
  clearTarget();
  currentTarget = event.target;
  event.target.dataset.clickToComponentTarget = "true";
  const path = getPathForElement(event.target);
  if (!path) {
    removeTooltip();
    return;
  }
  tooltipElement.textContent = path;
  const rect = event.target.getBoundingClientRect();
  if (rect.bottom + 40 < window.innerHeight) {
    tooltipElement.style.top = `${rect.bottom}px`;
    tooltipElement.style.bottom = "";
  } else if (rect.top > 40) {
    tooltipElement.style.bottom = `${window.innerHeight - rect.top}px`;
    tooltipElement.style.top = "";
  } else {
    tooltipElement.style.bottom = `${window.innerHeight / 2 - 22}px`;
    tooltipElement.style.top = "";
  }
  if (rect.left < window.innerWidth / 2) {
    tooltipElement.style.left = `${rect.left}px`;
    tooltipElement.style.right = "";
  } else {
    tooltipElement.style.right = `${rect.right}px`;
    tooltipElement.style.left = "";
  }
  if (!hasTooltip) {
    document.body.appendChild(tooltipElement);
    hasTooltip = true;
  }
});

const cleanUp = () => {
  clearTarget();
  removeTooltip();
  altKey = false;
};

const clearTarget = () => {
  const current = document.querySelector<HTMLElement>(
    "[data-click-to-component-target]"
  );
  if (!current) return;
  delete current.dataset.clickToComponentTarget;
};

const removeTooltip = () => {
  if (!hasTooltip) return;
  document.body.removeChild(tooltipElement);
  hasTooltip = false;
};

window.addEventListener(
  "click",
  (event) => {
    if (event.altKey && event.target instanceof HTMLElement) {
      event.preventDefault();
      const path = getPathForElement(event.target);
      if (!path) return;
      fetch(`/__open-in-editor?file=${encodeURIComponent(path)}`);
    }
  },
  { capture: true }
);

const getPathForElement = (element: Element) => {
  const instance = getReactInstanceForElement(element);
  if (!instance || !instance._debugSource) {
    console.warn("Couldn't find a React instance for the element", element);
    return;
  }
  const { columnNumber = 1, fileName, lineNumber = 1 } = instance._debugSource;
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${fileName}:${lineNumber}:${columnNumber}`;
};

const getReactInstanceForElement = (element: Element) => {
  // Prefer React DevTools, which has direct access to `react-dom` for mapping `element` <=> Fiber
  if ("__REACT_DEVTOOLS_GLOBAL_HOOK__" in window) {
    const { renderers } = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    for (const renderer of renderers.values()) {
      try {
        const fiber = renderer.findFiberByHostInstance(element);
        if (fiber) return fiber;
      } catch {
        // If React is mid-render, references to previous nodes may disappear during the click events
        // (This is especially true for interactive elements, like menus)
      }
    }
  }

  if ("_reactRootContainer" in element) {
    return (element as any)._reactRootContainer._internalRoot.current.child;
  }

  for (const key in element) {
    if (key.startsWith("__reactFiber")) return (element as any)[key];
  }
};
