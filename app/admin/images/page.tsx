'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'
import Image from 'next/image'

interface ImageRecord {
  id: number
  url: string
  image_description?: string
  created_at?: string
  caption_count?: number
}

export default function ImagesPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('images')
      .select('id, url, image_description, created_at')
      .order('id', { ascending: false })
      .limit(100)

    if (!error && data) {
      // Fetch caption counts for each image
      const ids = data.map((img: { id: number }) => img.id)
      const { data: captionData } = await supabase
        .from('captions')
        .select('image_id')
        .in('image_id', ids)

      const capMap: Record<number, number> = {}
      captionData?.forEach((c: { image_id: number }) => {
        capMap[c.image_id] = (capMap[c.image_id] || 0) + 1
      })

      setImages(data.map((img: ImageRecord) => ({ ...img, caption_count: capMap[img.id] || 0 })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchImages()
  }, [supabase, fetchImages])

  const deleteImage = async (id: number) => {
    setDeleting(id)
    setMessage(null)
    const { error } = await supabase.from('images').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `Image #${id} deleted` })
      setImages(images.filter(img => img.id !== id))
    }
    setDeleting(null)
    setConfirmDelete(null)
    setTimeout(() => setMessage(null), 3000)
  }

  const filtered = images.filter(img =>
    img.id.toString().includes(search) ||
    (img.image_description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Image Library</h1>
          <p className="text-gray-400 text-sm mt-1">Browse, inspect, and manage all uploaded images</p>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{images.length}</div>
            <div className="text-sm text-gray-400">Total Images</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">
              {images.reduce((sum, img) => sum + (img.caption_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-400">Total Captions</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-300">
              {images.length > 0 ? (images.reduce((s, i) => s + (i.caption_count || 0), 0) / images.length).toFixed(1) : 0}
            </div>
            <div className="text-sm text-gray-400">Avg Captions / Image</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6 items-center">
          <input
            type="text"
            placeholder="Search by ID or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              List
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading images…</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((img) => (
              <div key={img.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group relative">
                <div className="relative h-44 bg-gray-800">
                  {img.url ? (
                    <Image
                      src={img.url}
                      alt={img.image_description || `Image #${img.id}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 text-4xl">🖼️</div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {confirmDelete === img.id ? (
                      <>
                        <button
                          onClick={() => deleteImage(img.id)}
                          disabled={deleting === img.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg font-medium"
                        >
                          {deleting === img.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(img.id)}
                        className="px-3 py-1.5 bg-red-900/80 hover:bg-red-600 border border-red-700 text-red-300 text-xs rounded-lg font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-gray-400">#{img.id}</span>
                    <span className="text-xs text-blue-400">{img.caption_count} captions</span>
                  </div>
                  {img.image_description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{img.image_description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 text-left">Preview</th>
                  <th className="px-6 py-4 text-left">ID</th>
                  <th className="px-6 py-4 text-left">Description</th>
                  <th className="px-6 py-4 text-left">Captions</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((img) => (
                  <tr key={img.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                    <td className="px-6 py-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden relative">
                        {img.url ? (
                          <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-600">🖼️</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-300">#{img.id}</td>
                    <td className="px-6 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {img.image_description || <span className="text-gray-600 italic">No description</span>}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-blue-400 text-xs font-medium">{img.caption_count}</span>
                    </td>
                    <td className="px-6 py-3">
                      {confirmDelete === img.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => deleteImage(img.id)} disabled={deleting === img.id}
                            className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg">
                            {deleting === img.id ? '...' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(img.id)}
                          className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-gray-600 text-xs mt-4">Showing {filtered.length} of {images.length} images</p>
      </main>
    </div>
  )
}
