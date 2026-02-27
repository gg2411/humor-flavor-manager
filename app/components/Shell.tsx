'use client'

import { ThemeProvider } from '@/app/components/ThemeProvider'
import { useTheme } from '@/app/components/ThemeProvider'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

function NavbarInner({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

  const navLinks = [
    { href: '/', label: 'All Flavors' },
  ]

  return (
    <nav className="border-b border-[var(--card-border)] bg-[var(--card)] sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-xs">⚗️</span>
          </div>
          <span className="font-bold text-sm text-[var(--foreground)]">Flavor Manager</span>
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === link.href
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={cycleTheme}
            title={`Theme: ${themeLabel} — click to cycle`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <span className="text-base leading-none">{themeIcon}</span>
            <span className="text-xs hidden sm:block">{themeLabel}</span>
          </button>

          <div className="h-5 w-px bg-[var(--card-border)]" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {userEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="text-xs text-[var(--muted)] hidden md:block max-w-[140px] truncate">{userEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default function Shell({
  userEmail,
  children,
}: {
  userEmail: string
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <NavbarInner userEmail={userEmail} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}
