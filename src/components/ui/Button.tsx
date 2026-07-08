import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg' | 'kiosk'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-600 shadow-card',
  secondary:
    'bg-white text-navy-900 border border-ink-300 hover:border-navy-700 hover:text-navy-700',
  ghost: 'bg-transparent text-ink-500 hover:text-ink-900',
}

const sizeClasses: Record<Size, string> = {
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3.5 text-base rounded-2xl w-full',
  kiosk: 'px-8 py-5 text-xl rounded-2xl min-h-16',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    />
  )
}
