import type { HTMLAttributes } from 'react'

export function Card({
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card ${className}`}
      {...rest}
    />
  )
}
