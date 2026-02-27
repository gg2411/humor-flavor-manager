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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-900/50 border border-red-700 rounded-full mb-6">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-gray-400 mb-8">
          This admin portal is restricted to superadmin users only.
          Your account does not have the required permissions.
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl transition"
        >
          Sign Out & Try Another Account
        </button>
      </div>
    </div>
  )
}
