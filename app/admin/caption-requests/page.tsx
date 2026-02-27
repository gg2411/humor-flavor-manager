'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'
import Image from 'next/image'

interface CaptionRequest {
  id: number
  profile_id?: string
  image_id?: string
  created_datetime_utc?: string
  profile_email?: string
  image_url?: string
  caption_count?: number
}

export default function CaptionRequestsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [requests, setRequests] = useState<CaptionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('caption_requests')
      .select('*, profiles(id), images(url)')
      .order('created_datetime_utc', { ascending: false })
      .limit(200)

    if (data) {
      const ids = data.map((r: { id: number }) => r.id)
      const { data: chains } = await supabase.from('llm_prompt_chains').select('caption_request_id').in('caption_request_id', ids)
      const countMap: Record<number, number> = {}
      chains?.forEach((c: { caption_request_id: number }) => { countMap[c.caption_request_id] = (countMap[c.caption_request_id] || 0) + 1 })

      setRequests(data.map((r: CaptionRequest & { profiles?: { id: string }; images?: { url: string } }) => ({
        ...r,
        image_url: r.images?.url,
        caption_count: countMap[r.id] || 0,
      })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchRequests()
  }, [supabase, fetchRequests])

  const filtered = requests.filter(r =>
    (r.id.toString()).includes(search) ||
    (r.profile_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.image_id || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Caption Requests</h1>
          <p className="text-gray-400 text-sm mt-1">User requests for AI-generated captions</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{requests.length}</div>
            <div className="text-sm text-gray-400">Total Requests</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">
              {new Set(requests.map(r => r.profile_id)).size}
            </div>
            <div className="text-sm text-gray-400">Unique Users</div>
          </div>
        </div>

        <div className="mb-4">
          <input type="text" placeholder="Search by ID, user ID, image ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 w-full max-w-sm" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Image</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Chains</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">#{r.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.image_url ? (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden relative flex-shrink-0">
                          <Image src={r.image_url} alt="" fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600">🖼️</div>
                      )}
                      <span className="text-xs font-mono text-gray-500 truncate max-w-[6rem]">{r.image_id?.slice(0, 8)}…</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[8rem] truncate">{r.profile_id?.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-violet-400">{r.caption_count}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.created_datetime_utc ? new Date(r.created_datetime_utc).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-xs mt-4">{filtered.length} of {requests.length} requests</p>
      </main>
    </div>
  )
}
