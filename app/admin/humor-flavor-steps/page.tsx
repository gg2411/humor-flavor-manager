'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface FlavorStep {
  id: number
  humor_flavor_id: number
  flavor_slug?: string
  order_by: number
  description?: string
  llm_temperature?: number
  llm_system_prompt?: string
  llm_user_prompt?: string
  llm_model_id?: number
  model_name?: string
  humor_flavor_step_type_id?: number
  created_datetime_utc?: string
}

interface Flavor {
  id: number
  slug: string
}

export default function HumorFlavorStepsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [steps, setSteps] = useState<FlavorStep[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlavor, setSelectedFlavor] = useState<number | 'all'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: stepsData }, { data: flavorsData }, { data: modelsData }] = await Promise.all([
      supabase.from('humor_flavor_steps').select('*').order('humor_flavor_id').order('order_by'),
      supabase.from('humor_flavors').select('id, slug').order('id'),
      supabase.from('llm_models').select('id, name'),
    ])

    const modelMap: Record<number, string> = {}
    modelsData?.forEach((m: { id: number; name: string }) => { modelMap[m.id] = m.name })

    const flavorMap: Record<number, string> = {}
    flavorsData?.forEach((f: Flavor) => { flavorMap[f.id] = f.slug })

    if (stepsData) {
      setSteps(stepsData.map((s: FlavorStep) => ({
        ...s,
        model_name: s.llm_model_id ? modelMap[s.llm_model_id] : undefined,
        flavor_slug: flavorMap[s.humor_flavor_id],
      })))
    }
    if (flavorsData) setFlavors(flavorsData)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchData()
  }, [supabase, fetchData])

  const filtered = selectedFlavor === 'all' ? steps : steps.filter(s => s.humor_flavor_id === selectedFlavor)

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Humor Flavor Steps</h1>
          <p className="text-gray-400 text-sm mt-1">LLM pipeline steps for each humor flavor</p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <select
            value={selectedFlavor}
            onChange={e => setSelectedFlavor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Flavors</option>
            {flavors.map(f => (
              <option key={f.id} value={f.id}>{f.slug}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">{filtered.length} steps</span>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading…</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-800/30 transition"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center text-xs font-bold text-violet-300">{s.order_by}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-violet-400">{s.flavor_slug}</span>
                        <span className="text-xs text-gray-500">Step #{s.id}</span>
                      </div>
                      {s.description && <div className="text-sm text-white mt-0.5">{s.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.model_name && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{s.model_name}</span>}
                    {s.llm_temperature !== undefined && <span className="text-xs text-gray-500">temp: {s.llm_temperature}</span>}
                    <span className="text-gray-600">{expanded === s.id ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded === s.id && (
                  <div className="px-5 pb-4 border-t border-gray-800 space-y-3 pt-3">
                    {s.llm_system_prompt && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">System Prompt</div>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800/50 rounded-xl p-3 max-h-40 overflow-y-auto">{s.llm_system_prompt}</pre>
                      </div>
                    )}
                    {s.llm_user_prompt && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">User Prompt</div>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800/50 rounded-xl p-3 max-h-40 overflow-y-auto">{s.llm_user_prompt}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
