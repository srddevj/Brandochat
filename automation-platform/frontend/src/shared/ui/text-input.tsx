import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export function TextInput({ className = '', ...props }: Props) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/50 focus:ring-2 [color-scheme:dark] ${className}`.trim()}
      {...props}
    />
  )
}
