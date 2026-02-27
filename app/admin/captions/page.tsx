'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface Caption {
  id: number
  text: string
  image_id?: number
  created_at?: string
  vote_count?: number
}

export default function CaptionsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [captions, setCaptions] = useState<Caption[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'id' | 'votes' | 'date'>('votes')

  const fetchCaptions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('captions')
      .select('id, text, image_id, created_at')
      .order('id', { ascending: false })
      .limit(200)

    if (!error && data) {
      const ids = data.map((c: { id: number }) => c.id)
      const { data: voteData } = await supabase
        .from('caption_votes')
        .select('caption_id')
        .in('caption_id', ids)

      const voteMap: Record<number, number> = {}
      voteData?.forEach((v: { caption_id: number }) => {
        voteMap[v.caption_id] = (voteMap[v.caption_id] || 0) + 1
      })

      setCaptions(data.map((c: Caption) => ({ ...c, vote_count: voteMap[c.id] || 0 })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchCaptions()
  }, [supabase, fetchCaptions])

  const startEdit = (caption: Caption) => {
    setEditingId(caption.id)
    setEditText(caption.text)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    const { error } = await supabase
      .from('captions')
      .update({ text: editText })
      .eq('id', editingId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Caption updated' })
      setCaptions(captions.map(c => c.id === editingId ? { ...c, text: editText } : c))
      setEditingId(null)
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const deleteCaption = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('captions').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `Caption #${id} deleted` })
      setCaptions(captions.filter(c => c.id !== id))
    }
    setDeleting(null)
    setConfirmDelete(null)
    setTimeout(() => setMessage(null), 3000)
  }

  const sorted = [...captions]
    .filter(c => c.text?.toLowerCase().includes(search.toLowerCase()) || c.id.toString().includes(search))
    .sort((a, b) => {
      if (sortBy === 'votes') return (b.vote_count || 0) - (a.vote_count || 0)
      if (sortBy === 'id') return b.id - a.id
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  const avgVotes = captions.length > 0
    ? (captions.reduce((s, c) => s + (c.vote_count || 0), 0) / captions.length).toFixed(1)
    : '0'

  const maxVotes = Math.max(...captions.map(c => c.vote_count || 0), 1)

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Captions</h1>
          <p className="text-gray-400 text-sm mt-1">Edit and moderate captions written by users</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-green-900/40 border-green-700 text-green-300'
              : 'bg-red-900/40 border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{captions.length}</div>
            <div className="text-sm text-gray-400">Total Captions</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">
              {captions.reduce((s, c) => s + (c.vote_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-400">Total Votes</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">{avgVotes}</div>
            <div className="text-sm text-gray-400">Avg Votes</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">{maxVotes}</div>
            <div className="text-sm text-gray-400">Highest Vote Count</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1">
            {(['votes', 'id', 'date'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 text-xs rounded-lg transition capitalize ${sortBy === s ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {s === 'votes' ? 'Most Voted' : s === 'id' ? 'Newest' : 'By Date'}
              </button>
            ))}
          </div>
        </div>

        {/* Caption List */}
        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading captions…</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((caption) => (
              <div key={caption.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                {editingId === caption.id ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-violet-500 rounded-xl text-white text-sm resize-none focus:outline-none mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="text-gray-100 text-sm leading-relaxed flex-1">{caption.text}</p>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(caption)}
                          className="px-3 py-1.5 text-xs text-violet-400 hover:text-violet-300 bg-violet-900/30 hover:bg-violet-800/40 border border-violet-700/50 rounded-lg transition"
                        >
                          Edit
                        </button>
                        {confirmDelete === caption.id ? (
                          <>
                            <button
                              onClick={() => deleteCaption(caption.id)}
                              disabled={deleting === caption.id}
                              className="px-3 py-1.5 text-xs text-white bg-red-700 hover:bg-red-600 rounded-lg"
                            >
                              {deleting === caption.id ? '...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-3 py-1.5 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(caption.id)}
                            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 border border-red-800/50 rounded-lg transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vote bar + metadata */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500/80 rounded-full"
                          style={{ width: `${((caption.vote_count || 0) / maxVotes) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="text-violet-400 font-medium">{caption.vote_count} votes</span>
                        {caption.image_id && <span>Image #{caption.image_id}</span>}
                        <span className="font-mono">#{caption.id}</span>
                        {caption.created_at && (
                          <span>{new Date(caption.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-gray-600 text-xs mt-4">
          Showing {sorted.length} of {captions.length} captions
        </p>
      </main>
    </div>
  )
}
