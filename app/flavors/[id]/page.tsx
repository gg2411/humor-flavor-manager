'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Shell from '@/app/components/Shell'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface HumorFlavor {
  id: number
  slug: string
  description?: string
}

interface HumorFlavorStep {
  id: number
  humor_flavor_id: number
  order_by: number
  description?: string
  llm_system_prompt?: string
  llm_user_prompt?: string
  llm_temperature?: number
  llm_model_id?: number
  llm_input_type_id?: number
  llm_output_type_id?: number
  humor_flavor_step_type_id?: number
}

interface LLMModel { id: number; name: string }
interface RefItem { id: number; slug: string }
interface DBImage { id: string; url?: string; description?: string }
interface Caption { id: number; content: string; created_datetime_utc?: string }

type Tab = 'steps' | 'test' | 'captions'

const EMPTY_STEP = {
  description: '',
  llm_system_prompt: '',
  llm_user_prompt: '',
  llm_temperature: 0.7,
  llm_model_id: '',
  llm_input_type_id: '',
  llm_output_type_id: '',
  humor_flavor_step_type_id: '',
}

function StepForm({
  form, setForm, models, inputTypes, outputTypes, stepTypes,
  saving, onSave, onCancel, label,
}: {
  form: typeof EMPTY_STEP
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_STEP>>
  models: LLMModel[]
  inputTypes: RefItem[]
  outputTypes: RefItem[]
  stepTypes: RefItem[]
  saving: boolean
  onSave: () => void
  onCancel: () => void
  label: string
}) {
  const inputClass = 'w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-sm focus:outline-none focus:border-violet-500 transition'
  const labelClass = 'block text-xs text-[var(--muted)] mb-1'

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Description</label>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Image analysis step" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Model</label>
          <select value={form.llm_model_id} onChange={e => setForm(f => ({ ...f, llm_model_id: e.target.value }))} className={inputClass}>
            <option value="">— Select model —</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Temperature</label>
          <input type="number" step="0.1" min="0" max="2" value={form.llm_temperature}
            onChange={e => setForm(f => ({ ...f, llm_temperature: Number(e.target.value) }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Input Type</label>
          <select value={form.llm_input_type_id} onChange={e => setForm(f => ({ ...f, llm_input_type_id: e.target.value }))} className={inputClass}>
            <option value="">— Select —</option>
            {inputTypes.map(t => <option key={t.id} value={t.id}>{t.slug}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Output Type</label>
          <select value={form.llm_output_type_id} onChange={e => setForm(f => ({ ...f, llm_output_type_id: e.target.value }))} className={inputClass}>
            <option value="">— Select —</option>
            {outputTypes.map(t => <option key={t.id} value={t.id}>{t.slug}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Step Type</label>
          <select value={form.humor_flavor_step_type_id} onChange={e => setForm(f => ({ ...f, humor_flavor_step_type_id: e.target.value }))} className={inputClass}>
            <option value="">— Select —</option>
            {stepTypes.map(t => <option key={t.id} value={t.id}>{t.slug}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>System Prompt</label>
        <textarea value={form.llm_system_prompt}
          onChange={e => setForm(f => ({ ...f, llm_system_prompt: e.target.value }))}
          rows={5} placeholder="You are a humor analyst..."
          className={`${inputClass} resize-y font-mono text-xs`} />
      </div>
      <div>
        <label className={labelClass}>User Prompt</label>
        <textarea value={form.llm_user_prompt}
          onChange={e => setForm(f => ({ ...f, llm_user_prompt: e.target.value }))}
          rows={5} placeholder="Analyze this image..."
          className={`${inputClass} resize-y font-mono text-xs`} />
        <p className="text-xs text-[var(--muted)] mt-1">
          Template vars: <code className="text-violet-500">{'${step1Output}'}</code>, <code className="text-violet-500">{'${imageAdditionalContext}'}</code>
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
          {saving ? 'Saving…' : label}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] text-sm rounded-xl transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function FlavorEditorPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const flavorId = Number(id)

  const [userEmail, setUserEmail] = useState('')
  const [flavor, setFlavor] = useState<HumorFlavor | null>(null)
  const [steps, setSteps] = useState<HumorFlavorStep[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('steps')

  // Reference data
  const [models, setModels] = useState<LLMModel[]>([])
  const [inputTypes, setInputTypes] = useState<RefItem[]>([])
  const [outputTypes, setOutputTypes] = useState<RefItem[]>([])
  const [stepTypes, setStepTypes] = useState<RefItem[]>([])

  // Flavor editing
  const [editingFlavor, setEditingFlavor] = useState(false)
  const [flavorForm, setFlavorForm] = useState({ slug: '', description: '' })
  const [savingFlavor, setSavingFlavor] = useState(false)

  // Step editing
  const [addingStep, setAddingStep] = useState(false)
  const [editingStepId, setEditingStepId] = useState<number | null>(null)
  const [stepForm, setStepForm] = useState(EMPTY_STEP)
  const [savingStep, setSavingStep] = useState(false)
  const [deletingStep, setDeletingStep] = useState<number | null>(null)
  const [confirmDeleteStep, setConfirmDeleteStep] = useState<number | null>(null)
  const [reordering, setReordering] = useState<number | null>(null)

  // Test tab
  const [images, setImages] = useState<DBImage[]>([])
  const [selectedImageId, setSelectedImageId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // Captions tab
  const [captions, setCaptions] = useState<Caption[]>([])
  const [captionsLoading, setCaptionsLoading] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchFlavor = useCallback(async () => {
    const { data } = await supabase.from('humor_flavors').select('*').eq('id', flavorId).single()
    if (data) {
      setFlavor(data)
      setFlavorForm({ slug: data.slug, description: data.description || '' })
    }
  }, [supabase, flavorId])

  const fetchSteps = useCallback(async () => {
    const { data } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', flavorId)
      .order('order_by', { ascending: true })
    setSteps(data || [])
  }, [supabase, flavorId])

  const fetchRefData = useCallback(async () => {
    const [{ data: m }, { data: it }, { data: ot }, { data: st }] = await Promise.all([
      supabase.from('llm_models').select('id, name').order('name'),
      supabase.from('llm_input_types').select('id, slug').order('slug'),
      supabase.from('llm_output_types').select('id, slug').order('slug'),
      supabase.from('humor_flavor_step_types').select('id, slug').order('slug'),
    ])
    setModels(m || [])
    setInputTypes(it || [])
    setOutputTypes(ot || [])
    setStepTypes(st || [])
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    Promise.all([fetchFlavor(), fetchSteps(), fetchRefData()]).then(() => setLoading(false))
  }, [supabase, fetchFlavor, fetchSteps, fetchRefData])

  useEffect(() => {
    if (tab === 'test' && images.length === 0) {
      supabase.from('images').select('id, url, description').order('id', { ascending: false }).limit(60)
        .then(({ data }) => setImages(data || []))
    }
  }, [tab, supabase, images.length])

  useEffect(() => {
    if (tab === 'captions') {
      setCaptionsLoading(true)
      supabase.from('captions').select('id, content, created_datetime_utc')
        .eq('humor_flavor_id', flavorId)
        .order('created_datetime_utc', { ascending: false })
        .limit(100)
        .then(({ data }) => { setCaptions(data || []); setCaptionsLoading(false) })
    }
  }, [tab, supabase, flavorId])

  const saveFlavor = async () => {
    setSavingFlavor(true)
    const slug = flavorForm.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { error } = await supabase.from('humor_flavors')
      .update({ slug, description: flavorForm.description || null })
      .eq('id', flavorId)
    if (error) showMsg('error', error.message)
    else {
      showMsg('success', 'Flavor updated')
      setFlavor(f => f ? { ...f, slug, description: flavorForm.description } : f)
      setEditingFlavor(false)
    }
    setSavingFlavor(false)
  }

  const moveStep = async (stepId: number, direction: 'up' | 'down') => {
    setReordering(stepId)
    const idx = steps.findIndex(s => s.id === stepId)
    if (direction === 'up' && idx === 0) { setReordering(null); return }
    if (direction === 'down' && idx === steps.length - 1) { setReordering(null); return }
    const other = steps[direction === 'up' ? idx - 1 : idx + 1]
    const current = steps[idx]
    await Promise.all([
      supabase.from('humor_flavor_steps').update({ order_by: other.order_by }).eq('id', current.id),
      supabase.from('humor_flavor_steps').update({ order_by: current.order_by }).eq('id', other.id),
    ])
    await fetchSteps()
    setReordering(null)
  }

  const saveStep = async () => {
    setSavingStep(true)
    const payload = {
      humor_flavor_id: flavorId,
      description: stepForm.description || null,
      llm_system_prompt: stepForm.llm_system_prompt || null,
      llm_user_prompt: stepForm.llm_user_prompt || null,
      llm_temperature: stepForm.llm_temperature || 0.7,
      llm_model_id: stepForm.llm_model_id ? Number(stepForm.llm_model_id) : null,
      llm_input_type_id: stepForm.llm_input_type_id ? Number(stepForm.llm_input_type_id) : null,
      llm_output_type_id: stepForm.llm_output_type_id ? Number(stepForm.llm_output_type_id) : null,
      humor_flavor_step_type_id: stepForm.humor_flavor_step_type_id ? Number(stepForm.humor_flavor_step_type_id) : null,
    }
    if (editingStepId) {
      const { error } = await supabase.from('humor_flavor_steps').update(payload).eq('id', editingStepId)
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Step updated'); fetchSteps(); setEditingStepId(null); setAddingStep(false); setStepForm(EMPTY_STEP) }
    } else {
      const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) : 0
      const { error } = await supabase.from('humor_flavor_steps').insert({ ...payload, order_by: maxOrder + 1 })
      if (error) showMsg('error', error.message)
      else { showMsg('success', 'Step added'); fetchSteps(); setAddingStep(false); setStepForm(EMPTY_STEP) }
    }
    setSavingStep(false)
  }

  const startEditStep = (s: HumorFlavorStep) => {
    setStepForm({
      description: s.description || '',
      llm_system_prompt: s.llm_system_prompt || '',
      llm_user_prompt: s.llm_user_prompt || '',
      llm_temperature: s.llm_temperature ?? 0.7,
      llm_model_id: s.llm_model_id?.toString() || '',
      llm_input_type_id: s.llm_input_type_id?.toString() || '',
      llm_output_type_id: s.llm_output_type_id?.toString() || '',
      humor_flavor_step_type_id: s.humor_flavor_step_type_id?.toString() || '',
    })
    setEditingStepId(s.id)
    setAddingStep(true)
  }

  const deleteStep = async (stepId: number) => {
    setDeletingStep(stepId)
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', stepId)
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Step deleted'); setSteps(steps.filter(s => s.id !== stepId)); setConfirmDeleteStep(null) }
    setDeletingStep(null)
  }

  const runTest = async () => {
    if (!selectedImageId) return
    setTesting(true)
    setTestResult(null)
    setTestError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/pipeline/generate-captions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ imageId: selectedImageId, humorFlavorId: flavorId }),
      })
      const json = await res.json()
      if (!res.ok) setTestError(json.message || JSON.stringify(json, null, 2))
      else setTestResult(JSON.stringify(json, null, 2))
    } catch (e) {
      setTestError(String(e))
    }
    setTesting(false)
  }

  if (loading) {
    return (
      <Shell userEmail={userEmail}>
        <div className="text-center py-16 text-[var(--muted)]">Loading…</div>
      </Shell>
    )
  }

  if (!flavor) {
    return (
      <Shell userEmail={userEmail}>
        <div className="text-center py-16 text-[var(--muted)]">
          Flavor not found.{' '}
          <Link href="/" className="text-violet-500 hover:underline">Go back</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell userEmail={userEmail}>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--foreground)] transition">All Flavors</Link>
        <span className="mx-2">/</span>
        <code className="text-violet-600 dark:text-violet-400">{flavor.slug}</code>
      </div>

      {/* Flavor header card */}
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-5 mb-6">
        {editingFlavor ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Slug <span className="text-red-500">*</span></label>
              <input value={flavorForm.slug} onChange={e => setFlavorForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-sm focus:outline-none focus:border-violet-500 transition" />
              {flavorForm.slug && (
                <p className="text-xs text-[var(--muted)] mt-1">
                  Saved as: <code className="text-violet-500">{flavorForm.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}</code>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Description</label>
              <textarea value={flavorForm.description} onChange={e => setFlavorForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-sm focus:outline-none focus:border-violet-500 transition resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveFlavor} disabled={savingFlavor || !flavorForm.slug.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                {savingFlavor ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditingFlavor(false); setFlavorForm({ slug: flavor.slug, description: flavor.description || '' }) }}
                className="px-4 py-2 bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] text-sm rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <code className="text-xl font-mono font-bold text-violet-600 dark:text-violet-400">{flavor.slug}</code>
              {flavor.description && <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">{flavor.description}</p>}
              <p className="text-xs text-[var(--muted)] mt-2">{steps.length} step{steps.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setEditingFlavor(true)}
              className="px-3 py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition flex-shrink-0">
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success'
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--card-border)]">
        {(['steps', 'test', 'captions'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              tab === t
                ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── STEPS TAB ─── */}
      {tab === 'steps' && (
        <div>
          <div className="space-y-3 mb-4">
            {steps.length === 0 && !addingStep && (
              <div className="text-center py-12 text-[var(--muted)] text-sm">
                No steps yet. Add the first step below.
              </div>
            )}
            {steps.map((s, idx) => (
              <div key={s.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4">
                {editingStepId === s.id ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Edit Step {s.order_by}</h3>
                    <StepForm
                      form={stepForm} setForm={setStepForm}
                      models={models} inputTypes={inputTypes} outputTypes={outputTypes} stepTypes={stepTypes}
                      saving={savingStep} onSave={saveStep}
                      onCancel={() => { setEditingStepId(null); setAddingStep(false); setStepForm(EMPTY_STEP) }}
                      label="Update Step"
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {/* Reorder controls */}
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                      <button
                        disabled={idx === 0 || reordering !== null}
                        onClick={() => moveStep(s.id, 'up')}
                        className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 rounded disabled:opacity-30 transition text-xs">
                        ▲
                      </button>
                      <div className="w-6 h-6 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                        {s.order_by}
                      </div>
                      <button
                        disabled={idx === steps.length - 1 || reordering !== null}
                        onClick={() => moveStep(s.id, 'down')}
                        className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 rounded disabled:opacity-30 transition text-xs">
                        ▼
                      </button>
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.description && (
                            <span className="text-sm font-medium text-[var(--foreground)]">{s.description}</span>
                          )}
                          {s.llm_model_id && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                              {models.find(m => m.id === s.llm_model_id)?.name || `Model #${s.llm_model_id}`}
                            </span>
                          )}
                          {s.humor_flavor_step_type_id && (
                            <span className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                              {stepTypes.find(t => t.id === s.humor_flavor_step_type_id)?.slug || 'step type'}
                            </span>
                          )}
                          {s.llm_temperature != null && (
                            <span className="text-xs text-[var(--muted)]">temp {s.llm_temperature}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <button onClick={() => startEditStep(s)}
                            className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
                            Edit
                          </button>
                          {confirmDeleteStep === s.id ? (
                            <>
                              <button onClick={() => deleteStep(s.id)} disabled={deletingStep === s.id}
                                className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition">
                                {deletingStep === s.id ? '…' : 'Confirm'}
                              </button>
                              <button onClick={() => setConfirmDeleteStep(null)}
                                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteStep(s.id)}
                              className="text-xs text-red-500 hover:text-red-600">
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Prompt previews */}
                      <div className="space-y-1.5">
                        {s.llm_system_prompt && (
                          <div className="text-xs bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-2.5">
                            <span className="font-medium text-[var(--muted)]">System: </span>
                            <span className="font-mono text-[var(--foreground)] whitespace-pre-wrap break-all">
                              {s.llm_system_prompt.length > 300 ? s.llm_system_prompt.slice(0, 300) + '…' : s.llm_system_prompt}
                            </span>
                          </div>
                        )}
                        {s.llm_user_prompt && (
                          <div className="text-xs bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-2.5">
                            <span className="font-medium text-[var(--muted)]">User: </span>
                            <span className="font-mono text-[var(--foreground)] whitespace-pre-wrap break-all">
                              {s.llm_user_prompt.length > 300 ? s.llm_user_prompt.slice(0, 300) + '…' : s.llm_user_prompt}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* I/O type badges */}
                      {(s.llm_input_type_id || s.llm_output_type_id) && (
                        <div className="flex gap-3 mt-2">
                          {s.llm_input_type_id && (
                            <span className="text-xs text-[var(--muted)]">
                              in: {inputTypes.find(t => t.id === s.llm_input_type_id)?.slug || s.llm_input_type_id}
                            </span>
                          )}
                          {s.llm_output_type_id && (
                            <span className="text-xs text-[var(--muted)]">
                              out: {outputTypes.find(t => t.id === s.llm_output_type_id)?.slug || s.llm_output_type_id}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add step */}
          {addingStep && !editingStepId ? (
            <div className="bg-[var(--card)] border-2 border-violet-400/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">New Step</h3>
              <StepForm
                form={stepForm} setForm={setStepForm}
                models={models} inputTypes={inputTypes} outputTypes={outputTypes} stepTypes={stepTypes}
                saving={savingStep} onSave={saveStep}
                onCancel={() => { setAddingStep(false); setStepForm(EMPTY_STEP) }}
                label="Add Step"
              />
            </div>
          ) : !editingStepId ? (
            <button onClick={() => setAddingStep(true)}
              className="w-full py-3.5 border-2 border-dashed border-[var(--card-border)] hover:border-violet-400 rounded-2xl text-[var(--muted)] hover:text-[var(--foreground)] text-sm font-medium transition">
              + Add Step
            </button>
          ) : null}
        </div>
      )}

      {/* ─── TEST TAB ─── */}
      {tab === 'test' && (
        <div>
          <p className="text-sm text-[var(--muted)] mb-5">
            Select an image and generate captions using this flavor&apos;s prompt chain.
          </p>

          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--muted)] mb-2">Select Image</label>
            {images.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Loading images…</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto border border-[var(--card-border)] rounded-xl p-2 bg-[var(--card)]">
                {images.map(img => (
                  <button key={img.id} onClick={() => setSelectedImageId(img.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${
                      selectedImageId === img.id
                        ? 'border-violet-500 shadow-md shadow-violet-500/20'
                        : 'border-transparent hover:border-violet-300 dark:hover:border-violet-700'
                    }`}>
                    {img.url ? (
                      <Image src={img.url} alt={img.description || ''} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-[var(--background)] flex items-center justify-center text-xl">🖼️</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedImageId && (
              <p className="text-xs text-[var(--muted)] mt-2">
                Selected: <code className="text-violet-500">{selectedImageId.slice(0, 12)}…</code>
              </p>
            )}
          </div>

          <button onClick={runTest} disabled={!selectedImageId || testing}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
            {testing ? 'Generating captions…' : 'Generate Captions'}
          </button>

          {testError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Error</p>
              <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">{testError}</pre>
            </div>
          )}
          {testResult && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Response</p>
              <pre className="text-xs text-[var(--foreground)] whitespace-pre-wrap break-all">{testResult}</pre>
            </div>
          )}
        </div>
      )}

      {/* ─── CAPTIONS TAB ─── */}
      {tab === 'captions' && (
        <div>
          {captionsLoading ? (
            <div className="text-center py-12 text-[var(--muted)]">Loading captions…</div>
          ) : captions.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)] text-sm">
              No captions generated yet for this flavor.
            </div>
          ) : (
            <div className="space-y-2">
              {captions.map(c => (
                <div key={c.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">&ldquo;{c.content}&rdquo;</p>
                  {c.created_datetime_utc && (
                    <p className="text-xs text-[var(--muted)] mt-1.5">
                      {new Date(c.created_datetime_utc).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--muted)] mt-4">{captions.length} caption{captions.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </Shell>
  )
}
