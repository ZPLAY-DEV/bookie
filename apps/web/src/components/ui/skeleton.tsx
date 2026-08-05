import { cn } from '@/lib/utils'

// 로딩 자리 표시 — 실제 콘텐츠와 같은 크기로 깔아 점핑을 막는다
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
  )
}

export { Skeleton }
