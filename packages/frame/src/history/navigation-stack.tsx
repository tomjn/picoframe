import { type ReactNode, createContext, useContext, useEffect, useReducer } from "react";
import { type NavigationType, useLocation, useNavigationType } from "react-router";

export interface NavigationStackState {
  stack: string[];
  index: number;
}

export type NavigationAction = { type: NavigationType; path: string };

/**
 * Pure reducer for the back/forward stack (lifted from the engineer-assist
 * prototype). PUSH truncates forward history; REPLACE swaps in place; POP
 * matches the new path against neighbours, falling back to the nearest
 * occurrence to handle duplicate paths.
 */
export function reduceNavigation(state: NavigationStackState, action: NavigationAction): NavigationStackState {
  const { stack, index } = state;

  if (action.type === "PUSH") {
    const next = [...stack.slice(0, index + 1), action.path];
    return { stack: next, index: next.length - 1 };
  }

  if (action.type === "REPLACE") {
    if (stack[index] === action.path) return state;
    const next = [...stack];
    next[index] = action.path;
    return { stack: next, index };
  }

  // POP
  if (stack[index] === action.path) return state;
  if (stack[index - 1] === action.path) return { stack, index: index - 1 };
  if (stack[index + 1] === action.path) return { stack, index: index + 1 };

  let best = index;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < stack.length; i++) {
    if (stack[i] === action.path) {
      const dist = Math.abs(i - index);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    }
  }
  return { stack, index: best };
}

interface NavigationStackValue {
  canBack: boolean;
  canForward: boolean;
}

const NavigationStackContext = createContext<NavigationStackValue>({ canBack: false, canForward: false });

/** Tracks router navigation as a stack. Place once inside the Router. */
export function NavigationStackProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();

  const [state, dispatch] = useReducer(reduceNavigation, undefined, () => ({
    stack: [location.pathname],
    index: 0,
  }));

  useEffect(() => {
    dispatch({ type: navType, path: location.pathname });
  }, [location.pathname, navType]);

  return (
    <NavigationStackContext.Provider
      value={{ canBack: state.index > 0, canForward: state.index < state.stack.length - 1 }}
    >
      {children}
    </NavigationStackContext.Provider>
  );
}

/** Read `canBack` / `canForward`. Requires `NavigationStackProvider` above. */
export function useNavigationStack(): NavigationStackValue {
  return useContext(NavigationStackContext);
}
