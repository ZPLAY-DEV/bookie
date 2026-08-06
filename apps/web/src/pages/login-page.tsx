import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import lottie from 'lottie-web'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKakaoTalk } from '@fortawesome/free-brands-svg-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const REMEMBER_EMAIL_KEY = 'bookie-remembered-email'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(
    () => localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '',
  )
  const [rememberEmail, setRememberEmail] = useState(
    () => localStorage.getItem(REMEMBER_EMAIL_KEY) !== null,
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const logoRef = useRef<HTMLDivElement | null>(null)

  // 상단 로고 — 정적 SVG 대신 로티 애니메이션(public/logo.json) 재생
  useEffect(() => {
    if (!logoRef.current) return
    const anim = lottie.loadAnimation({
      container: logoRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/logo.json',
    })
    return () => anim.destroy()
  }, [])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 카카오 OAuth 콜백으로 돌아왔을 때(또는 이미 로그인 상태일 때) 대시보드로 이동
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: '/weeks/$weekNo', params: { weekNo: '1' } })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  async function handleKakaoLogin() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) {
      setError(
        '카카오 로그인을 사용할 수 없어요 — supabase/config.toml의 kakao 설정을 확인해 주세요',
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않아요')
      return
    }
    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email)
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY)
    }
    navigate({ to: '/weeks/$weekNo', params: { weekNo: '1' } })
  }

  return (
    <div className="flex h-full items-center justify-center p-7">
      <div className="w-full max-w-105 rounded-3xl border bg-card p-10 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div ref={logoRef} role="img" aria-label="북키톡키" className="size-32" />
          <p className="mt-3 text-sm text-muted-foreground">
            오늘의 수업을 시작하려면 로그인해 주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-heading">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 rounded-xl border bg-card px-4 text-[15px] text-heading outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-[3px] focus:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-heading">비밀번호</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border bg-card pr-12 pl-4 text-[15px] text-heading outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-[3px] focus:ring-ring/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-heading"
              >
                <HugeiconsIcon
                  icon={showPassword ? ViewOffSlashIcon : ViewIcon}
                  className="size-5"
                />
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="text-sm text-foreground">이메일 기억하기</span>
          </label>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-13 rounded-full bg-sidebar-primary text-lg font-bold text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30 hover:bg-sidebar-primary/90"
          >
            {loading ? '로그인 중…' : '로그인'}
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">또는</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            onClick={handleKakaoLogin}
            className="h-13 gap-2 rounded-full bg-[#fee500] text-lg font-bold text-black/85 hover:bg-[#fee500]/90"
          >
            <FontAwesomeIcon icon={faKakaoTalk} className="size-5" aria-hidden />
            카카오 로그인
          </Button>
        </form>
      </div>
    </div>
  )
}
