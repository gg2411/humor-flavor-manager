'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'

interface Caption {
  id: string
  content: string
  image_id?: string
  is_public?: boolean
  is_featured?: boolean
  like_count?: number
  humor_flavor_id?: number
  flavor_slug?: string
  created_datetime_utc?: string
  profile_id?: string
}

export default function CaptionsPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [captions, setCaptions] = useState<Caption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'likes' | 'date' | 'featured'>('likes')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchCaptions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('captions')
      .select('id, content, image_id, is_public, is_featured, like_count, humor_flavor_id, created_datetime_utc, profile_id')
      .order('created_datetime_utc', { ascending: false })
      .limit(300)

    if (data) {
      const flavorIds = [...new Set(data.filter((c: Caption) => c.humor_flavor_id).map((c: Caption) => c.humor_flavor_id!))]
      let flavorMap: Record<number, string> = {}
      if (flavorIds.length > 0) {
        const { data: flavors } = await supabase.from('humor_flavors').select('id, slug').in('id', flavorIds)
        flavors?.forEach((f: { id: number; slug: string }) => { flavorMap[f.id] = f.slug })
      }
      setCaptions(data.map((c: Caption) => ({ ...c, flavor_slug: c.humor_flavor_id ? flavorMap[c.humor_flavor_id] : undefined })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchCaptions()
  }, [supabase, fetchCaptions])

  const toggleFeatured = async (id: string, current: boolean) => {
    const { error } = await supabase.from('captions').update({ is_featured: !current }).eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      setCaptions(captions.map(c => c.id === id ? { ...c, is_featured: !current } : c))
      showMsg('success', !current ? 'Marked as featured' : 'Removed from featured')
    }
  }

  const togglePublic = async (id: string, current: boolean) => {
    const { error } = await supabase.from('captions').update({ is_public: !current }).eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      setCaptions(captions.map(c => c.id === id ? { ...c, is_public: !current } : c))
      showMsg('success', `Caption ${!current ? 'made public' : 'made private'}`)
    }
  }

  const sorted = [...captions]
    .filter(c =>
      (c.content || '').toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'likes') return (b.like_count || 0) - (a.like_count || 0)
      if (sortBy === 'featured') return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
      return new Date(b.created_datetime_utc || 0).getTime() - new Date(a.created_datetime_utc || 0).getTime()
    })

  const totalLikes = captions.reduce((s, c) => s + (c.like_count || 0), 0)
  const maxLikes = Math.max(...captions.map(c => c.like_count || 0), 1)
  const featuredCount = captions.filter(c => c.is_featured).length
  const publicCount = captions.filter(c => c.is_public).length

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Captions</h1>
          <p className="text-gray-400 text-sm mt-1">All user-generated captions</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{captions.length}</div>
            <div className="text-sm text-gray-400">Total Captions</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-pink-400">{totalLikes}</div>
            <div className="text-sm text-gray-400">Total Likes</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-400">{featuredCount}</div>
            <div className="text-sm text-gray-400">Featured</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">{publicCount}</div>
            <div className="text-sm text-gray-400">Public</div>
          </div>
        </div>

        <div className="flex gap-3 mb-6 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1">
            {(['likes', 'date', 'featured'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 text-xs rounded-lg transition capitalize ${sortBy === s ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {s === 'likes' ? 'Most Liked' : s === 'date' ? 'Newest' : 'Featured'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading captions…</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((caption) => (
              <div key={caption.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-gray-100 text-sm leading-relaxed flex-1">{caption.content}</p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => toggleFeatured(caption.id, !!caption.is_featured)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${caption.is_featured ? 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                    >
                      {caption.is_featured ? '★ Featured' : '☆ Feature'}
                    </button>
                    <button
                      onClick={() => togglePublic(caption.id, !!caption.is_public)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${caption.is_public ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                    >
                      {caption.is_public ? 'Public' : 'Private'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500/70 rounded-full" style={{ width: `${((caption.like_count || 0) / maxLikes) * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="text-pink-400 font-medium">{caption.like_count || 0} likes</span>
                    {caption.flavor_slug && <span className="text-violet-400">{caption.flavor_slug}</span>}
                    <span className="font-mono">{caption.id.slice(0, 8)}…</span>
                    {caption.created_datetime_utc && <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-gray-600 text-xs mt-4">Showing {sorted.length} of {captions.length} captions</p>
      </main>
    </div>
  )
}
