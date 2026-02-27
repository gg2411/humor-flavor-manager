'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface HumorFlavor {
  id: number
  slug: string
  description?: string
  created_datetime_utc?: string
  step_count?: number
}

export default function HumorFlavorsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [flavors, setFlavors] = useState<HumorFlavor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFlavors = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('humor_flavors').select('*').order('id')
    if (data) {
      // Get step counts
      const ids = data.map((f: HumorFlavor) => f.id)
      const { data: steps } = await supabase.from('humor_flavor_steps').select('humor_flavor_id').in('humor_flavor_id', ids)
      const stepMap: Record<number, number> = {}
      steps?.forEach((s: { humor_flavor_id: number }) => { stepMap[s.humor_flavor_id] = (stepMap[s.humor_flavor_id] || 0) + 1 })
      setFlavors(data.map((f: HumorFlavor) => ({ ...f, step_count: stepMap[f.id] || 0 })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchFlavors()
  }, [supabase, fetchFlavors])

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Humor Flavors</h1>
          <p className="text-gray-400 text-sm mt-1">The humor styles used by the LLM pipeline</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{flavors.length}</div>
            <div className="text-sm text-gray-400">Total Flavors</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">{flavors.reduce((s, f) => s + (f.step_count || 0), 0)}</div>
            <div className="text-sm text-gray-400">Total Steps</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center text-gray-500 py-12">Loading…</div>
          ) : (
            flavors.map(f => (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{f.id}</span>
                      <span className="px-2 py-0.5 bg-violet-900/50 border border-violet-700/50 rounded text-violet-300 text-xs font-mono">{f.slug}</span>
                    </div>
                  </div>
                  <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{f.step_count} steps</span>
                </div>
                {f.description && (
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">{f.description}</p>
                )}
                {f.created_datetime_utc && (
                  <div className="text-xs text-gray-600 mt-3">Created {new Date(f.created_datetime_utc).toLocaleDateString()}</div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
