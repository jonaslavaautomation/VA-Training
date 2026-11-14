import { FileText, PlayCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'

export default function ResourceTypeBadge({ type }) {
  return type === 'VIDEO'
    ? <Badge tone="navy" icon={PlayCircle}>Video</Badge>
    : <Badge tone="mint" icon={FileText}>PDF</Badge>
}
