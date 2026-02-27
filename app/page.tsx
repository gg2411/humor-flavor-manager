'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Shell from '@/app/components/Shell'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HumorFlavor {
  id: number
  slug: string
  description?: string
  created_datetime_utc?: string
  step_count?: number
  caption_count?: number
}

export default function FlavorsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [flavors, setFlavors] = useState<HumorFlavor[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchFlavors = useCallback(async () => {
    setLoading(true)
    const { data: flavorsData } = await supabase
      .from('humor_flavors')
      .select('*')
      .order('created_datetime_utc', { ascending: false })

    if (flavorsData) {
      const ids = flavorsData.map((f: HumorFlavor) => f.id)
      const [{ data: steps }, { data: captions }] = await Promise.all([
        supabase.from('humor_flavor_steps').select('humor_flavor_id').in('humor_flavor_id', ids),
        supabase.from('captions').select('humor_flavor_id').in('humor_flavor_id', ids),
      ])
      const stepMap: Record<number, number> = {}
      steps?.forEach((s: { humor_flavor_id: number }) => { stepMap[s.humor_flavor_id] = (stepMap[s.humor_flavor_id] || 0) + 1 })
      const capMap: Record<number, number> = {}
      captions?.forEach((c: { humor_flavor_id: number }) => { capMap[c.humor_flavor_id] = (capMap[c.humor_flavor_id] || 0) + 1 })
      setFlavors(flavorsData.map((f: HumorFlavor) => ({ ...f, step_count: stepMap[f.id] || 0, caption_count: capMap[f.id] || 0 })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchFlavors()
  }, [supabase, fetchFlavors])

  const createFlavor = async () => {
    if (!newSlug.trim()) return
    setSaving(true)
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data, error } = await supabase.from('humor_flavors').insert({ slug, description: newDesc || null }).select().single()
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Flavor created'); setNewSlug(''); setNewDesc(''); setShowNew(false); router.push(`/flavors/${data.id}`) }
    setSaving(false)
  }

  const deleteFlavor = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Flavor deleted'); setFlavors(flavors.filter(f => f.id !== id)) }
    setDeleting(null); setConfirmDelete(null)
  }

  const filtered = flavors.filter(f =>
    f.slug.toLowerCase().includes(search.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Shell userEmail={userEmail}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Humor Flavors</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Manage prompt chain flavors and their steps</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition flex-shrink-0">
          + New Flavor
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>{message.text}</div>
      )}

      {showNew && (
        <div className="mb-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">New Humor Flavor</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Slug <span className="text-red-500">*</span></label>
              <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="e.g. gen-z-dark-roast"
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-sm placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition" />
              {newSlug && <p className="text-xs text-[var(--muted)] mt-1">Saved as: <code className="text-violet-500">{newSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}</code></p>}
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Description</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe what makes this humor flavor unique..." rows={2}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-sm placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createFlavor} disabled={saving || !newSlug.trim()} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
              {saving ? 'Creating…' : 'Create & Edit'}
            </button>
            <button onClick={() => { setShowNew(false); setNewSlug(''); setNewDesc('') }} className="px-4 py-2 bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] text-sm rounded-xl transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input type="text" placeholder="Search flavors..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 bg-[var(--card)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-sm placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 w-full max-w-sm transition" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--muted)]">Loading flavors…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">{search ? 'No flavors match your search.' : 'No flavors yet. Create your first one!'}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-5 hover:border-violet-400/50 transition group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-3">
                  <code className="text-sm font-mono text-violet-600 dark:text-violet-400 font-semibold">{f.slug}</code>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--muted)]">{f.step_count} step{f.step_count !== 1 ? 's' : ''}</span>
                    <span className="text-xs text-[var(--muted)]">{f.caption_count} caption{f.caption_count !== 1 ? 's' : ''}</span>
                    {f.created_datetime_utc && <span className="text-xs text-[var(--muted)]">{new Date(f.created_datetime_utc).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  <Link href={`/flavors/${f.id}`} className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/50 transition font-medium">
                    Edit
                  </Link>
                  {confirmDelete === f.id ? (
                    <>
                      <button onClick={() => deleteFlavor(f.id)} disabled={deleting === f.id} className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition">
                        {deleting === f.id ? '…' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1 bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted)] text-xs rounded-lg">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(f.id)} className="px-2.5 py-1 text-red-500 hover:text-red-600 text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">Delete</button>
                  )}
                </div>
              </div>
              {f.description && <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-2">{f.description}</p>}
              {(f.step_count || 0) > 0 && (
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: Math.min(f.step_count || 0, 10) }).map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 bg-violet-200 dark:bg-violet-800/60 rounded-full" />
                  ))}
                  {(f.step_count || 0) > 10 && <span className="text-xs text-[var(--muted)] ml-1">+{(f.step_count || 0) - 10}</span>}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
                <Link href={`/flavors/${f.id}`} className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">Open editor →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-[var(--muted)] mt-4">{filtered.length} of {flavors.length} flavors</p>
    </Shell>
  )
}
