'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface LLMModel {
  id: number
  name: string
  provider_model_id?: string
  llm_provider_id?: number
  provider_name?: string
  is_temperature_supported?: boolean
  created_datetime_utc?: string
}

interface Provider {
  id: number
  name: string
}

export default function LLMModelsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [models, setModels] = useState<LLMModel[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', provider_model_id: '', llm_provider_id: '', is_temperature_supported: true })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: modelsData }, { data: provsData }] = await Promise.all([
      supabase.from('llm_models').select('*').order('id'),
      supabase.from('llm_providers').select('*').order('name'),
    ])
    const provMap: Record<number, string> = {}
    provsData?.forEach((p: Provider) => { provMap[p.id] = p.name })
    if (modelsData) setModels(modelsData.map((m: LLMModel) => ({ ...m, provider_name: m.llm_provider_id ? provMap[m.llm_provider_id] : undefined })))
    if (provsData) setProviders(provsData)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchData()
  }, [supabase, fetchData])

  const resetForm = () => setForm({ name: '', provider_model_id: '', llm_provider_id: '', is_temperature_supported: true })

  const saveModel = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      provider_model_id: form.provider_model_id || null,
      llm_provider_id: form.llm_provider_id ? Number(form.llm_provider_id) : null,
      is_temperature_supported: form.is_temperature_supported,
    }
    if (editingId) {
      const { error } = await supabase.from('llm_models').update(payload).eq('id', editingId)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Updated'); fetchData(); setEditingId(null); setShowForm(false); resetForm() }
    } else {
      const { error } = await supabase.from('llm_models').insert(payload)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Model created'); fetchData(); setShowForm(false); resetForm() }
    }
    setSaving(false)
  }

  const startEdit = (m: LLMModel) => {
    setForm({
      name: m.name,
      provider_model_id: m.provider_model_id || '',
      llm_provider_id: m.llm_provider_id?.toString() || '',
      is_temperature_supported: m.is_temperature_supported ?? true,
    })
    setEditingId(m.id)
    setShowForm(true)
  }

  const deleteModel = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('llm_models').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Deleted'); setModels(models.filter(m => m.id !== id)) }
    setDeleting(null)
    setConfirmDelete(null)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">LLM Models</h1>
            <p className="text-gray-400 text-sm mt-1">AI models available for caption generation</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition">
            + New Model
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-4 text-sm">{editingId ? 'Edit Model' : 'New Model'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Display Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Provider Model ID</label>
                <input value={form.provider_model_id} onChange={e => setForm({ ...form, provider_model_id: e.target.value })}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet-20241022"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Provider</label>
                <select value={form.llm_provider_id} onChange={e => setForm({ ...form, llm_provider_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500">
                  <option value="">None</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <input type="checkbox" id="temp_supported" checked={form.is_temperature_supported}
                  onChange={e => setForm({ ...form, is_temperature_supported: e.target.checked })}
                  className="w-4 h-4 accent-violet-600" />
                <label htmlFor="temp_supported" className="text-sm text-gray-300">Temperature Supported</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveModel} disabled={saving || !form.name.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); resetForm() }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Model ID</th>
                <th className="px-4 py-3 text-left">Temp</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : models.map(m => (
                <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.id}</td>
                  <td className="px-4 py-3 text-white font-medium text-sm">{m.name}</td>
                  <td className="px-4 py-3 text-xs text-blue-400">{m.provider_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{m.provider_model_id || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${m.is_temperature_supported ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-600'}`}>
                      {m.is_temperature_supported ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(m)} className="text-xs text-violet-400 hover:text-violet-300">Edit</button>
                      {confirmDelete === m.id ? (
                        <>
                          <button onClick={() => deleteModel(m.id)} disabled={deleting === m.id} className="px-2 py-1 bg-red-700 text-white text-xs rounded">{deleting === m.id ? '...' : 'Confirm'}</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(m.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      )}
                    </div>
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
