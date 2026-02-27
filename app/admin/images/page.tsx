'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/app/components/Sidebar'
import Image from 'next/image'

interface ImageRecord {
  id: string
  url: string
  image_description?: string
  additional_context?: string
  is_public?: boolean
  is_common_use?: boolean
  created_datetime_utc?: string
  caption_count?: number
}

export default function ImagesPage() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editContext, setEditContext] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [newImageDescription, setNewImageDescription] = useState('')
  const [newImageContext, setNewImageContext] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [uploadTab, setUploadTab] = useState<'file' | 'url'>('file')

  const fetchImages = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('images')
      .select('id, url, image_description, additional_context, is_public, is_common_use, created_datetime_utc')
      .order('created_datetime_utc', { ascending: false })
      .limit(100)

    if (!error && data) {
      const ids = data.map((img: { id: string }) => img.id)
      const { data: captionData } = await supabase
        .from('captions')
        .select('image_id')
        .in('image_id', ids)

      const capMap: Record<string, number> = {}
      captionData?.forEach((c: { image_id: string }) => {
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

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const deleteImage = async (id: string) => {
    setDeleting(id)
    const { error } = await supabase.from('images').delete().eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Image deleted')
      setImages(images.filter(img => img.id !== id))
    }
    setDeleting(null)
    setConfirmDelete(null)
  }

  const uploadFile = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `admin/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (upErr) { showMsg('error', upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
    await insertImage(publicUrl)
    setUploading(false)
  }

  const insertImageFromUrl = async () => {
    if (!newImageUrl.trim()) return
    setUploading(true)
    await insertImage(newImageUrl.trim())
    setUploading(false)
    setNewImageUrl('')
  }

  const insertImage = async (url: string) => {
    const { error } = await supabase.from('images').insert({
      url,
      image_description: newImageDescription || null,
      additional_context: newImageContext || null,
      is_public: true,
    })
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Image added successfully')
      setNewImageDescription('')
      setNewImageContext('')
      setShowUpload(false)
      fetchImages()
    }
  }

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('images').update({
      image_description: editDescription || null,
      additional_context: editContext || null,
    }).eq('id', id)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Updated')
      setImages(images.map(img => img.id === id
        ? { ...img, image_description: editDescription, additional_context: editContext }
        : img))
      setEditingId(null)
    }
  }

  const filtered = images.filter(img =>
    img.id.toLowerCase().includes(search.toLowerCase()) ||
    (img.image_description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Image Library</h1>
            <p className="text-gray-400 text-sm mt-1">Browse, upload, and manage all images</p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition"
          >
            + Upload Image
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-green-900/40 border-green-700 text-green-300'
              : 'bg-red-900/40 border-red-700 text-red-300'
          }`}>{message.text}</div>
        )}

        {/* Upload Panel */}
        {showUpload && (
          <div className="mb-6 bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Add New Image</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUploadTab('file')}
                className={`px-3 py-1.5 text-xs rounded-lg transition ${uploadTab === 'file' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                Upload File
              </button>
              <button
                onClick={() => setUploadTab('url')}
                className={`px-3 py-1.5 text-xs rounded-lg transition ${uploadTab === 'url' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                From URL
              </button>
            </div>
            <div className="space-y-3">
              {uploadTab === 'file' ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Image File</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="w-full text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-violet-600 file:text-white file:cursor-pointer bg-gray-800 rounded-xl p-2"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newImageDescription}
                    onChange={e => setNewImageDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Additional Context (optional)</label>
                  <input
                    type="text"
                    value={newImageContext}
                    onChange={e => setNewImageContext(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={uploadTab === 'file' ? uploadFile : insertImageFromUrl}
                  disabled={uploading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Save Image'}
                </button>
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
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
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 text-xs rounded-lg transition ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>Grid</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs rounded-lg transition ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>List</button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading images…</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((img) => (
              <div key={img.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="relative h-44 bg-gray-800 group">
                  {img.url ? (
                    <Image src={img.url} alt={img.image_description || ''} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 text-4xl">🖼️</div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {confirmDelete === img.id ? (
                      <>
                        <button onClick={() => deleteImage(img.id)} disabled={deleting === img.id} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg font-medium">
                          {deleting === img.id ? '...' : 'Confirm'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 bg-gray-700 text-white text-xs rounded-lg">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(img.id)} className="px-3 py-1.5 bg-red-900/80 hover:bg-red-600 border border-red-700 text-red-300 text-xs rounded-lg">Delete</button>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  {editingId === img.id ? (
                    <div className="space-y-2">
                      <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description" className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-violet-500" />
                      <input value={editContext} onChange={e => setEditContext(e.target.value)} placeholder="Context" className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-violet-500" />
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(img.id)} className="px-2 py-1 bg-violet-600 text-white text-xs rounded">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-gray-500 truncate max-w-[6rem]">{img.id.slice(0,8)}…</span>
                        <span className="text-xs text-blue-400">{img.caption_count} caps</span>
                      </div>
                      {img.image_description && <p className="text-xs text-gray-500 mt-1 truncate">{img.image_description}</p>}
                      <button onClick={() => { setEditingId(img.id); setEditDescription(img.image_description || ''); setEditContext(img.additional_context || '') }} className="text-xs text-violet-400 hover:text-violet-300 mt-1">Edit</button>
                    </>
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
                  <th className="px-4 py-3 text-left">Preview</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Captions</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((img) => (
                  <tr key={img.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden relative">
                        {img.url ? <Image src={img.url} alt="" fill className="object-cover" unoptimized /> : <div className="flex items-center justify-center h-full text-gray-600">🖼️</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">{img.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">
                      {editingId === img.id ? (
                        <div className="space-y-1">
                          <input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs" />
                          <input value={editContext} onChange={e => setEditContext(e.target.value)} placeholder="context" className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs" />
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(img.id)} className="px-2 py-1 bg-violet-600 text-white text-xs rounded">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <span className="truncate block max-w-xs">{img.image_description || <span className="text-gray-600 italic">No description</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><span className="text-blue-400 text-xs">{img.caption_count}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {editingId !== img.id && (
                          <button onClick={() => { setEditingId(img.id); setEditDescription(img.image_description || ''); setEditContext(img.additional_context || '') }} className="text-xs text-violet-400 hover:text-violet-300">Edit</button>
                        )}
                        {confirmDelete === img.id ? (
                          <>
                            <button onClick={() => deleteImage(img.id)} disabled={deleting === img.id} className="px-2 py-1 bg-red-700 text-white text-xs rounded">
                              {deleting === img.id ? '...' : 'Confirm'}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDelete(img.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        )}
                      </div>
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
