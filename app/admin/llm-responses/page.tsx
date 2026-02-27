'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface LLMResponse {
  id: string
  llm_model_response?: string
  processing_time_seconds?: number
  llm_model_id?: number
  model_name?: string
  profile_id?: string
  caption_request_id?: number
  humor_flavor_id?: number
  flavor_slug?: string
  llm_temperature?: number
  created_datetime_utc?: string
  expanded?: boolean
}

export default function LLMResponsesPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [responses, setResponses] = useState<LLMResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterModel, setFilterModel] = useState<number | 'all'>('all')
  const [models, setModels] = useState<{ id: number; name: string }[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: respsData }, { data: modelsData }, { data: flavorsData }] = await Promise.all([
      supabase.from('llm_model_responses').select('*').order('created_datetime_utc', { ascending: false }).limit(200),
      supabase.from('llm_models').select('id, name'),
      supabase.from('humor_flavors').select('id, slug'),
    ])
    const modelMap: Record<number, string> = {}
    modelsData?.forEach((m: { id: number; name: string }) => { modelMap[m.id] = m.name })
    const flavorMap: Record<number, string> = {}
    flavorsData?.forEach((f: { id: number; slug: string }) => { flavorMap[f.id] = f.slug })
    if (respsData) {
      setResponses(respsData.map((r: LLMResponse) => ({
        ...r,
        model_name: r.llm_model_id ? modelMap[r.llm_model_id] : undefined,
        flavor_slug: r.humor_flavor_id ? flavorMap[r.humor_flavor_id] : undefined,
      })))
    }
    if (modelsData) setModels(modelsData)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchData()
  }, [supabase, fetchData])

  const filtered = filterModel === 'all' ? responses : responses.filter(r => r.llm_model_id === filterModel)

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">LLM Responses</h1>
          <p className="text-gray-400 text-sm mt-1">Raw AI model outputs from caption generation</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{responses.length}</div>
            <div className="text-sm text-gray-400">Responses (last 200)</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              {responses.filter(r => r.processing_time_seconds).length > 0
                ? (responses.reduce((s, r) => s + (r.processing_time_seconds || 0), 0) / responses.filter(r => r.processing_time_seconds).length).toFixed(1)
                : '—'}s
            </div>
            <div className="text-sm text-gray-400">Avg Processing Time</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">{new Set(responses.map(r => r.llm_model_id)).size}</div>
            <div className="text-sm text-gray-400">Models Used</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <select value={filterModel} onChange={e => setFilterModel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500">
            <option value="all">All Models</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <span className="text-sm text-gray-500">{filtered.length} responses</span>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading…</div>
          ) : filtered.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <button
                className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-800/30 transition"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {r.model_name && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{r.model_name}</span>}
                      {r.flavor_slug && <span className="text-xs text-violet-400 bg-violet-900/20 px-2 py-0.5 rounded">{r.flavor_slug}</span>}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      req #{r.caption_request_id} · {r.created_datetime_utc ? new Date(r.created_datetime_utc).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.processing_time_seconds !== undefined && (
                    <span className="text-xs text-green-400">{r.processing_time_seconds}s</span>
                  )}
                  {r.llm_temperature !== undefined && (
                    <span className="text-xs text-gray-500">T={r.llm_temperature}</span>
                  )}
                  <span className="text-gray-600 text-xs">{expanded === r.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === r.id && r.llm_model_response && (
                <div className="px-5 pb-4 border-t border-gray-800 pt-3">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800/50 rounded-xl p-3 max-h-60 overflow-y-auto">{r.llm_model_response}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
