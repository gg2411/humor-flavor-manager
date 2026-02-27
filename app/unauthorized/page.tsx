'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Access Denied</h1>
        <p className="text-[var(--muted)] mb-6 text-sm">
          This tool requires superadmin or matrix admin access.
        </p>
        <button onClick={handleLogout}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition text-sm">
          Sign Out
        </button>
      </div>
    </div>
  )
}
