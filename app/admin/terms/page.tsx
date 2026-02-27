'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface Term {
  id: number
  term: string
  definition?: string
  example?: string
  priority?: number
  term_type_id?: number
  type_name?: string
  created_datetime_utc?: string
}

interface TermType {
  id: number
  name?: string
}

export default function TermsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [terms, setTerms] = useState<Term[]>([])
  const [termTypes, setTermTypes] = useState<TermType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ term: '', definition: '', example: '', priority: 0, term_type_id: '' })
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
    const [{ data: termsData }, { data: typesData }] = await Promise.all([
      supabase.from('terms').select('*').order('priority', { ascending: false }).order('term'),
      supabase.from('term_types').select('*').order('id'),
    ])
    const typeMap: Record<number, string> = {}
    typesData?.forEach((t: TermType & { name?: string }) => { if (t.id && t.name) typeMap[t.id] = t.name })
    if (termsData) setTerms(termsData.map((t: Term) => ({ ...t, type_name: t.term_type_id ? typeMap[t.term_type_id] : undefined })))
    if (typesData) setTermTypes(typesData)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchData()
  }, [supabase, fetchData])

  const resetForm = () => setForm({ term: '', definition: '', example: '', priority: 0, term_type_id: '' })

  const saveTerm = async () => {
    if (!form.term.trim()) return
    setSaving(true)
    const payload = {
      term: form.term.trim(),
      definition: form.definition || null,
      example: form.example || null,
      priority: form.priority || 0,
      term_type_id: form.term_type_id ? Number(form.term_type_id) : null,
    }
    if (editingId) {
      const { error } = await supabase.from('terms').update(payload).eq('id', editingId)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Term updated'); fetchData(); setEditingId(null); setShowForm(false); resetForm() }
    } else {
      const { error } = await supabase.from('terms').insert(payload)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Term created'); fetchData(); setShowForm(false); resetForm() }
    }
    setSaving(false)
  }

  const startEdit = (t: Term) => {
    setForm({
      term: t.term,
      definition: t.definition || '',
      example: t.example || '',
      priority: t.priority || 0,
      term_type_id: t.term_type_id?.toString() || '',
    })
    setEditingId(t.id)
    setShowForm(true)
  }

  const deleteTerm = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('terms').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Term deleted'); setTerms(terms.filter(t => t.id !== id)) }
    setDeleting(null)
    setConfirmDelete(null)
  }

  const filtered = terms.filter(t =>
    t.term.toLowerCase().includes(search.toLowerCase()) ||
    (t.definition || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Terms</h1>
            <p className="text-gray-400 text-sm mt-1">Humor-related terms and definitions</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition"
          >
            + New Term
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-4 text-sm">{editingId ? 'Edit Term' : 'New Term'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-gray-400 mb-1">Term *</label>
                <input value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select value={form.term_type_id} onChange={e => setForm({ ...form, term_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500">
                  <option value="">None</option>
                  {termTypes.map(t => <option key={t.id} value={t.id}>Type {t.id}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Definition</label>
                <textarea value={form.definition} onChange={e => setForm({ ...form, definition: e.target.value })} rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Example</label>
                <textarea value={form.example} onChange={e => setForm({ ...form, example: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Priority</label>
                <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveTerm} disabled={saving || !form.term.trim()}
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

        <div className="mb-4">
          <input type="text" placeholder="Search terms..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 w-full max-w-sm" />
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading…</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => (
              <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{t.term}</span>
                      {t.type_name && <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">{t.type_name}</span>}
                      {(t.priority || 0) > 0 && <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">p{t.priority}</span>}
                    </div>
                    {t.definition && <p className="text-sm text-gray-400 mb-1">{t.definition}</p>}
                    {t.example && <p className="text-xs text-gray-500 italic">"{t.example}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(t)} className="text-xs text-violet-400 hover:text-violet-300 px-2.5 py-1.5 rounded-lg hover:bg-violet-900/20 transition">Edit</button>
                    {confirmDelete === t.id ? (
                      <>
                        <button onClick={() => deleteTerm(t.id)} disabled={deleting === t.id} className="px-2.5 py-1.5 bg-red-700 text-white text-xs rounded-lg">
                          {deleting === t.id ? '...' : 'Confirm'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(t.id)} className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-900/20 transition">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-gray-600 text-xs mt-4">{filtered.length} of {terms.length} terms</p>
      </main>
    </div>
  )
}
