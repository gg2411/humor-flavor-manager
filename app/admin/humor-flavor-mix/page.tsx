'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface MixEntry {
  id: number
  humor_flavor_id: number
  flavor_slug?: string
  flavor_description?: string
  caption_count: number
}

export default function HumorFlavorMixPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [mix, setMix] = useState<MixEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Record<number, number>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchMix = useCallback(async () => {
    setLoading(true)
    const { data: mixData } = await supabase.from('humor_flavor_mix').select('*').order('id')
    const { data: flavors } = await supabase.from('humor_flavors').select('id, slug, description')
    const flavorMap: Record<number, { slug: string; description: string }> = {}
    flavors?.forEach((f: { id: number; slug: string; description: string }) => { flavorMap[f.id] = { slug: f.slug, description: f.description } })
    if (mixData) {
      const entries = mixData.map((m: MixEntry) => ({
        ...m,
        flavor_slug: flavorMap[m.humor_flavor_id]?.slug,
        flavor_description: flavorMap[m.humor_flavor_id]?.description,
      }))
      setMix(entries)
      const vals: Record<number, number> = {}
      entries.forEach((e: MixEntry) => { vals[e.id] = e.caption_count })
      setEditValues(vals)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchMix()
  }, [supabase, fetchMix])

  const saveCount = async (id: number) => {
    setSaving(id)
    const { error } = await supabase.from('humor_flavor_mix').update({ caption_count: editValues[id] }).eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Caption count updated')
      setMix(mix.map(m => m.id === id ? { ...m, caption_count: editValues[id] } : m))
    }
    setSaving(null)
  }

  const total = mix.reduce((s, m) => s + m.caption_count, 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Humor Flavor Mix</h1>
          <p className="text-gray-400 text-sm mt-1">Control how many captions each humor flavor generates</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 inline-flex items-center gap-3">
          <div>
            <div className="text-xl font-bold text-white">{total}</div>
            <div className="text-xs text-gray-400">Total captions / request</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading…</div>
        ) : (
          <div className="space-y-3">
            {mix.map(m => {
              const pct = total > 0 ? ((m.caption_count / total) * 100).toFixed(0) : '0'
              return (
                <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-violet-900/50 border border-violet-700/50 rounded text-violet-300 text-xs font-mono">{m.flavor_slug}</span>
                        <span className="text-xs text-gray-500">#{m.id}</span>
                      </div>
                      {m.flavor_description && <p className="text-xs text-gray-500 max-w-md">{m.flavor_description.slice(0, 120)}{(m.flavor_description?.length || 0) > 120 ? '…' : ''}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={editValues[m.id] ?? m.caption_count}
                        onChange={e => setEditValues({ ...editValues, [m.id]: Number(e.target.value) })}
                        className="w-16 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-violet-500"
                      />
                      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                      <button
                        onClick={() => saveCount(m.id)}
                        disabled={saving === m.id || editValues[m.id] === m.caption_count}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg transition disabled:opacity-40"
                      >
                        {saving === m.id ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
