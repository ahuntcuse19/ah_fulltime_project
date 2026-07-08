import { createContext, useContext, type ReactNode } from 'react'
import type { Surface } from '../data/types'

const SurfaceContext = createContext<Surface>('mobile')

/**
 * Surface is encoded in the route namespace (/m/* vs /kiosk/*) and injected
 * here by layout routes, so it survives refresh and deep links without any
 * mutable global state.
 */
export function SurfaceProvider({
  surface,
  children,
}: {
  surface: Surface
  children: ReactNode
}) {
  return (
    <SurfaceContext.Provider value={surface}>{children}</SurfaceContext.Provider>
  )
}

export function useSurface(): Surface {
  return useContext(SurfaceContext)
}
