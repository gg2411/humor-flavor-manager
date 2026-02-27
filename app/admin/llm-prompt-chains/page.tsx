'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface PromptChain {
  id: number
  caption_request_id?: number
  created_datetime_utc?: string
  response_count?: number
}

export default function LLMPromptChainsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [chains, setChains] = useState<PromptChain[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChains = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('llm_prompt_chains')
      .select('*')
      .order('created_datetime_utc', { ascending: false })
      .limit(200)
    if (data) {
      const ids = data.map((c: PromptChain) => c.id)
      const { data: resps } = await supabase.from('llm_model_responses').select('llm_prompt_chain_id').in('llm_prompt_chain_id', ids)
      const countMap: Record<number, number> = {}
      resps?.forEach((r: { llm_prompt_chain_id: number }) => { countMap[r.llm_prompt_chain_id] = (countMap[r.llm_prompt_chain_id] || 0) + 1 })
      setChains(data.map((c: PromptChain) => ({ ...c, response_count: countMap[c.id] || 0 })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchChains()
  }, [supabase, fetchChains])

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">LLM Prompt Chains</h1>
          <p className="text-gray-400 text-sm mt-1">Multi-step prompt execution chains</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{chains.length}</div>
            <div className="text-sm text-gray-400">Total Chains</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">{chains.reduce((s, c) => s + (c.response_count || 0), 0)}</div>
            <div className="text-sm text-gray-400">Total Responses</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">
              {chains.length > 0 ? (chains.reduce((s, c) => s + (c.response_count || 0), 0) / chains.length).toFixed(1) : 0}
            </div>
            <div className="text-sm text-gray-400">Avg Responses / Chain</div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Chain ID</th>
                <th className="px-4 py-3 text-left">Caption Request</th>
                <th className="px-4 py-3 text-left">Responses</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : chains.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-600">No chains found</td></tr>
              ) : chains.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">#{c.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {c.caption_request_id ? `#${c.caption_request_id}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-violet-400 bg-violet-900/20 px-2 py-0.5 rounded">{c.response_count}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.created_datetime_utc ? new Date(c.created_datetime_utc).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
