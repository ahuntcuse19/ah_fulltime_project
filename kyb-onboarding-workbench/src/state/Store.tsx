import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { AppState } from '../model/types'
import { reducer, type Action } from './reducer'
import { buildSeed } from './seed'

interface StoreValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

// reset is the one action that needs the seed; keeping it here leaves the
// reducer free of seed imports (the seed imports the reducer).
function rootReducer(state: AppState, action: Action): AppState {
  return action.type === 'reset' ? buildSeed() : reducer(state, action)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, buildSeed)
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): AppState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx.state
}

export function useDispatch(): Dispatch<Action> {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useDispatch outside StoreProvider')
  return ctx.dispatch
}
