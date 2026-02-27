'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'
import Image from 'next/image'

interface CaptionExample {
  id: number
  caption: string
  explanation?: string
  image_description?: string
  priority?: number
  image_id?: string
  image_url?: string
  created_datetime_utc?: string
}

export default function CaptionExamplesPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [examples, setExamples] = useState<CaptionExample[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ caption: '', explanation: '', image_description: '', priority: 0, image_id: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchExamples = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('caption_examples')
      .select('*, images(url)')
      .order('priority', { ascending: false })
      .order('id', { ascending: false })
    if (data) {
      setExamples(data.map((e: CaptionExample & { images?: { url: string } }) => ({
        ...e,
        image_url: e.images?.url,
      })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchExamples()
  }, [supabase, fetchExamples])

  const resetForm = () => setForm({ caption: '', explanation: '', image_description: '', priority: 0, image_id: '' })

  const saveExample = async () => {
    if (!form.caption.trim()) return
    setSaving(true)
    const payload = {
      caption: form.caption.trim(),
      explanation: form.explanation || null,
      image_description: form.image_description || null,
      priority: form.priority || 0,
      image_id: form.image_id || null,
    }
    if (editingId) {
      const { error } = await supabase.from('caption_examples').update(payload).eq('id', editingId)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Updated'); fetchExamples(); setEditingId(null); setShowForm(false); resetForm() }
    } else {
      const { error } = await supabase.from('caption_examples').insert(payload)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Created'); fetchExamples(); setShowForm(false); resetForm() }
    }
    setSaving(false)
  }

  const startEdit = (e: CaptionExample) => {
    setForm({
      caption: e.caption,
      explanation: e.explanation || '',
      image_description: e.image_description || '',
      priority: e.priority || 0,
      image_id: e.image_id || '',
    })
    setEditingId(e.id)
    setShowForm(true)
  }

  const deleteExample = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('caption_examples').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Deleted'); setExamples(examples.filter(e => e.id !== id)) }
    setDeleting(null)
    setConfirmDelete(null)
  }

  const filtered = examples.filter(e =>
    e.caption.toLowerCase().includes(search.toLowerCase()) ||
    (e.image_description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Caption Examples</h1>
            <p className="text-gray-400 text-sm mt-1">Example captions used in LLM prompts</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition"
          >
            + New Example
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-4 text-sm">{editingId ? 'Edit Example' : 'New Example'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Caption *</label>
                <textarea value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Explanation</label>
                <textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Image Description</label>
                  <input value={form.image_description} onChange={e => setForm({ ...form, image_description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Priority</label>
                  <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image ID (UUID)</label>
                <input value={form.image_id} onChange={e => setForm({ ...form, image_id: e.target.value })} placeholder="Optional image UUID"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveExample} disabled={saving || !form.caption.trim()}
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
          <input type="text" placeholder="Search captions..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 w-full max-w-sm" />
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading…</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(e => (
              <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex gap-4">
                {e.image_url && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">
                    <Image src={e.image_url} alt="" fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{e.id}</span>
                      {(e.priority || 0) > 0 && <span className="text-xs px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">p{e.priority}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(e)} className="text-xs text-violet-400 hover:text-violet-300">Edit</button>
                      {confirmDelete === e.id ? (
                        <>
                          <button onClick={() => deleteExample(e.id)} disabled={deleting === e.id} className="px-2 py-1 bg-red-700 text-white text-xs rounded">{deleting === e.id ? '...' : 'Confirm'}</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(e.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white mb-1">"{e.caption}"</p>
                  {e.explanation && <p className="text-xs text-gray-500">{e.explanation}</p>}
                  {e.image_description && <p className="text-xs text-gray-600 mt-1">Image: {e.image_description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-gray-600 text-xs mt-4">{filtered.length} of {examples.length} examples</p>
      </main>
    </div>
  )
}
