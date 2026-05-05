import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="w-full h-full p-4">
      <Skeleton className="w-full h-full rounded-xl" />
    </div>
  )
}
