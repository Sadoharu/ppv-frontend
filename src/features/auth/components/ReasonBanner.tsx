//done
import { reasonMessage } from '@/features/auth/utils/reasonMessage'

type Props = { reason?: string | null; err?: string | null }

export default function ReasonBanner({ reason, err }: Props) {
  const msg = err || reasonMessage(reason)
  if (!msg) return null
  return <div className="text-red-600 text-sm">{msg}</div>
}