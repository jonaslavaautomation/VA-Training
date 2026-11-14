import { FlaskConical } from 'lucide-react'
import Badge from './Badge'
import { isPreviewMode } from '@/lib/supabase'

/** Shown only in preview mode, wherever a section renders temporary sample data. */
export default function SampleDataBadge() {
  if (!isPreviewMode) return null
  return <Badge tone="amber" icon={FlaskConical}>Sample data</Badge>
}
