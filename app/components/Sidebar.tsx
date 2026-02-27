'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const navSections = [
  {
    label: null,
    items: [
      { href: '/', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/images', label: 'Images', icon: '🖼️' },
      { href: '/admin/captions', label: 'Captions', icon: '💬' },
      { href: '/admin/caption-requests', label: 'Caption Requests', icon: '📋' },
      { href: '/admin/caption-examples', label: 'Caption Examples', icon: '✍️' },
    ],
  },
  {
    label: 'Users & Access',
    items: [
      { href: '/admin/users', label: 'Users', icon: '👥' },
      { href: '/admin/allowed-domains', label: 'Signup Domains', icon: '🌐' },
      { href: '/admin/whitelist-emails', label: 'Whitelist Emails', icon: '📧' },
    ],
  },
  {
    label: 'Humor',
    items: [
      { href: '/admin/humor-flavors', label: 'Humor Flavors', icon: '😂' },
      { href: '/admin/humor-flavor-steps', label: 'Flavor Steps', icon: '🔢' },
      { href: '/admin/humor-flavor-mix', label: 'Flavor Mix', icon: '🎭' },
      { href: '/admin/terms', label: 'Terms', icon: '📖' },
    ],
  },
  {
    label: 'LLM',
    items: [
      { href: '/admin/llm-providers', label: 'LLM Providers', icon: '🏢' },
      { href: '/admin/llm-models', label: 'LLM Models', icon: '🧠' },
      { href: '/admin/llm-prompt-chains', label: 'Prompt Chains', icon: '🔗' },
      { href: '/admin/llm-responses', label: 'LLM Responses', icon: '🤖' },
    ],
  },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center text-base">
            😂
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Humor Study</div>
            <div className="text-violet-400 text-xs font-medium">Admin Portal</div>
          </div>
        </div>
      </div>

      {/* Nav - scrollable */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'pt-2' : ''}>
            {section.label && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {userEmail?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-400 truncate">{userEmail}</div>
            <div className="text-xs text-violet-400 font-medium">Superadmin</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition text-left"
        >
          Sign Out →
        </button>
      </div>
    </aside>
  )
}
