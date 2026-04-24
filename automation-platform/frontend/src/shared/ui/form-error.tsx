type Props = { message: string | null }

export function FormError({ message }: Props) {
  if (!message) return null
  return <p className="text-sm text-red-400">{message}</p>
}
