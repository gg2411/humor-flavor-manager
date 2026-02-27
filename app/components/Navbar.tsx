'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useTheme } from '@/app/components/ThemeProvider'
import { ThemeProvider } from '@/app/components/ThemeProvider'

function NavbarInner({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const navLinks = [
    { href: '/', label: 'Flavors' },
  ]

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

  return (
    <nav className="border-b border-[var(--card-border)] bg-[var(--card)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
            ⚗️
          </div>
          <span className="font-bold text-sm text-[var(--foreground)]">Flavor Manager</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === link.href
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            title={`Theme: ${themeLabel} (click to cycle)`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition border border-[var(--card-border)]"
          >
            <span>{themeIcon}</span>
            <span className="text-xs">{themeLabel}</span>
          </button>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
              {userEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="text-xs text-[var(--muted)] hidden sm:block max-w-[120px] truncate">{userEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-3 py-1.5 rounded-lg hover:bg-[var(--background)] transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default function Navbar({ userEmail }: { userEmail: string }) {
  return (
    <ThemeProvider>
      <NavbarInner userEmail={userEmail} />
    </ThemeProvider>
  )
}
