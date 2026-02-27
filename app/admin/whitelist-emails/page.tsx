'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface EmailEntry {
  id: number
  email_address: string
  created_datetime_utc?: string
  modified_datetime_utc?: string
}

export default function WhitelistEmailsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [entries, setEntries] = useState<EmailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('whitelist_email_addresses')
      .select('*')
      .order('email_address')
    if (!error && data) setEntries(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchEntries()
  }, [supabase, fetchEntries])

  const addEmail = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    setSaving(true)
    const { error } = await supabase.from('whitelist_email_addresses').insert({ email_address: email })
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', `"${email}" whitelisted`)
      setNewEmail('')
      fetchEntries()
    }
    setSaving(false)
  }

  const saveEdit = async (id: number) => {
    const email = editEmail.trim().toLowerCase()
    if (!email) return
    const { error } = await supabase.from('whitelist_email_addresses').update({ email_address: email }).eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Updated')
      setEntries(entries.map(e => e.id === id ? { ...e, email_address: email } : e))
      setEditingId(null)
    }
  }

  const deleteEntry = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('whitelist_email_addresses').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Removed from whitelist')
      setEntries(entries.filter(e => e.id !== id))
    }
    setDeleting(null)
    setConfirmDelete(null)
  }

  const filtered = entries.filter(e => e.email_address.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Whitelist Emails</h1>
          <p className="text-gray-400 text-sm mt-1">Specific email addresses approved for signup</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Add new */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-3 text-sm">Add Email</h2>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              className="flex-1 max-w-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={addEmail}
              disabled={saving || !newEmail.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Adding…' : '+ Whitelist'}
            </button>
          </div>
        </div>

        {/* Search + list */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 w-full max-w-sm"
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Whitelisted Addresses</span>
            <span className="text-xs text-gray-500">{filtered.length} of {entries.length}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No whitelisted emails</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(e => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/30 transition">
                  <div className="flex-1 min-w-0 mr-4">
                    {editingId === e.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={editEmail}
                          onChange={ev => setEditEmail(ev.target.value)}
                          onKeyDown={ev => ev.key === 'Enter' && saveEdit(e.id)}
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                        />
                        <button onClick={() => saveEdit(e.id)} className="px-2.5 py-1 bg-violet-600 text-white text-xs rounded-lg">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-2.5 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-white">{e.email_address}</div>
                        {e.created_datetime_utc && (
                          <div className="text-xs text-gray-500 mt-0.5">Added {new Date(e.created_datetime_utc).toLocaleDateString()}</div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingId !== e.id && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(e.id); setEditEmail(e.email_address) }} className="text-xs text-violet-400 hover:text-violet-300 px-2.5 py-1.5 rounded-lg hover:bg-violet-900/20 transition">Edit</button>
                      {confirmDelete === e.id ? (
                        <>
                          <button onClick={() => deleteEntry(e.id)} disabled={deleting === e.id} className="px-2.5 py-1.5 bg-red-700 text-white text-xs rounded-lg">
                            {deleting === e.id ? '...' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(e.id)} className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-900/20 transition">Remove</button>
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
