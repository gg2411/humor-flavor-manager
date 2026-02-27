'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface Domain {
  id: number
  apex_domain: string
  created_datetime_utc?: string
}

export default function AllowedDomainsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchDomains = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('allowed_signup_domains')
      .select('*')
      .order('apex_domain')
    if (!error && data) setDomains(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchDomains()
  }, [supabase, fetchDomains])

  const addDomain = async () => {
    const domain = newDomain.trim().toLowerCase()
    if (!domain) return
    setSaving(true)
    const { error } = await supabase.from('allowed_signup_domains').insert({ apex_domain: domain })
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', `Domain "${domain}" added`)
      setNewDomain('')
      fetchDomains()
    }
    setSaving(false)
  }

  const deleteDomain = async (id: number) => {
    setDeleting(id)
    const { error } = await supabase.from('allowed_signup_domains').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Domain removed')
      setDomains(domains.filter(d => d.id !== id))
    }
    setDeleting(null)
    setConfirmDelete(null)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Signup Domains</h1>
          <p className="text-gray-400 text-sm mt-1">Manage allowed email domains for signup</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Add new domain */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-3 text-sm">Add Domain</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. columbia.edu"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              className="flex-1 max-w-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={addDomain}
              disabled={saving || !newDomain.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Adding…' : '+ Add Domain'}
            </button>
          </div>
        </div>

        {/* Domain list */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Allowed Domains</span>
            <span className="text-xs text-gray-500">{domains.length} domains</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : domains.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No domains configured</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {domains.map(d => (
                <div key={d.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/30 transition">
                  <div>
                    <div className="text-sm text-white font-medium">@{d.apex_domain}</div>
                    {d.created_datetime_utc && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Added {new Date(d.created_datetime_utc).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {confirmDelete === d.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => deleteDomain(d.id)} disabled={deleting === d.id} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg">
                        {deleting === d.id ? '...' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(d.id)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition">Remove</button>
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
