import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'

// 북키톡키 로고 로티 애니메이션 (public/lottiefiles/logo.json)
export function LottieLogo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/lottiefiles/logo.json',
    })
    return () => anim.destroy()
  }, [])

  return <div ref={ref} role="img" aria-label="북키톡키" className={className} />
}
