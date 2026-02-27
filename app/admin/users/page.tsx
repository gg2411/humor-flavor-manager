'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface Profile {
  id: string
  created_at: string
  is_superadmin: boolean
  email?: string
}

export default function UsersPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, created_at, is_superadmin')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setProfiles(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchProfiles()
  }, [supabase, fetchProfiles])

  const toggleSuperadmin = async (id: string, current: boolean) => {
    setUpdating(id)
    setMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({ is_superadmin: !current })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `Superadmin status ${!current ? 'granted' : 'revoked'}` })
      setProfiles(profiles.map(p => p.id === id ? { ...p, is_superadmin: !current } : p))
    }
    setUpdating(null)
    setTimeout(() => setMessage(null), 3000)
  }

  const filtered = profiles.filter(p =>
    p.id.toLowerCase().includes(search.toLowerCase())
  )

  const superadminCount = profiles.filter(p => p.is_superadmin).length

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Users & Profiles</h1>
          <p className="text-gray-400 text-sm mt-1">Manage user accounts and superadmin privileges</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-green-900/40 border-green-700 text-green-300'
              : 'bg-red-900/40 border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{profiles.length}</div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-rose-400">{superadminCount}</div>
            <div className="text-sm text-gray-400">Superadmins</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-300">{profiles.length - superadminCount}</div>
            <div className="text-sm text-gray-400">Regular Users</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 text-left">User ID</th>
                <th className="px-6 py-4 text-left">Joined</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No users found</td>
                </tr>
              ) : filtered.map((profile, i) => (
                <tr
                  key={profile.id}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-300">{profile.id}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {profile.is_superadmin ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-900/50 border border-rose-700/50 text-rose-300 text-xs rounded-full font-medium">
                        ⭐ Superadmin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-full">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleSuperadmin(profile.id, profile.is_superadmin)}
                      disabled={updating === profile.id}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition disabled:opacity-50 ${
                        profile.is_superadmin
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                          : 'bg-violet-700/50 hover:bg-violet-600 text-violet-200 border border-violet-600'
                      }`}
                    >
                      {updating === profile.id
                        ? '...'
                        : profile.is_superadmin
                        ? 'Revoke Admin'
                        : 'Grant Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-gray-600 text-xs mt-4">
          Showing {filtered.length} of {profiles.length} users
        </p>
      </main>
    </div>
  )
}
