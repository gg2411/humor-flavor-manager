'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface LLMProvider {
  id: number
  name: string
  created_datetime_utc?: string
  model_count?: number
}

export default function LLMProvidersPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    const { data: provs } = await supabase.from('llm_providers').select('*').order('id')
    const { data: models } = await supabase.from('llm_models').select('llm_provider_id')
    const countMap: Record<number, number> = {}
    models?.forEach((m: { llm_provider_id: number }) => { countMap[m.llm_provider_id] = (countMap[m.llm_provider_id] || 0) + 1 })
    if (provs) setProviders(provs.map((p: LLMProvider) => ({ ...p, model_count: countMap[p.id] || 0 })))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchProviders()
  }, [supabase, fetchProviders])

  const addProvider = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    const { error } = await supabase.from('llm_providers').insert({ name })
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Provider added'); setNewName(''); fetchProviders() }
    setSaving(false)
  }

  const saveEdit = async (id: number) => {
    const name = editName.trim()
    if (!name) return
    const { error } = await supabase.from('llm_providers').update({ name }).eq('id', id)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Updated'); setProviders(providers.map(p => p.id === id ? { ...p, name } : p)); setEditingId(null) }
  }

  const deleteProvider = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('llm_providers').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Deleted'); setProviders(providers.filter(p => p.id !== id)) }
    setDeleting(null)
    setConfirmDelete(null)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">LLM Providers</h1>
          <p className="text-gray-400 text-sm mt-1">AI model providers (OpenAI, Anthropic, etc.)</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-3 text-sm">Add Provider</h2>
          <div className="flex gap-3">
            <input type="text" placeholder="Provider name" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProvider()}
              className="flex-1 max-w-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500" />
            <button onClick={addProvider} disabled={saving || !newName.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
              {saving ? 'Adding…' : '+ Add'}
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Providers</span>
            <span className="text-xs text-gray-500">{providers.length} total</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : providers.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No providers</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {providers.map(p => (
                <div key={p.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition">
                  <div className="flex-1 min-w-0 mr-4">
                    {editingId === p.id ? (
                      <div className="flex gap-2 items-center">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={ev => ev.key === 'Enter' && saveEdit(p.id)}
                          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500" />
                        <button onClick={() => saveEdit(p.id)} className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-700/50 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm text-white font-medium">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.model_count} model{p.model_count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {editingId !== p.id && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(p.id); setEditName(p.name) }} className="text-xs text-violet-400 hover:text-violet-300 px-2.5 py-1.5 rounded-lg hover:bg-violet-900/20 transition">Edit</button>
                      {confirmDelete === p.id ? (
                        <>
                          <button onClick={() => deleteProvider(p.id)} disabled={deleting === p.id} className="px-2.5 py-1.5 bg-red-700 text-white text-xs rounded-lg">{deleting === p.id ? '...' : 'Confirm'}</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(p.id)} className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-900/20 transition">Delete</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
