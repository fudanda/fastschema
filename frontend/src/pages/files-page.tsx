import {
  File as FileIcon,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Grid2X2,
  List,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/page'
import { withQuery } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatBytes, formatDate } from '../lib/format'
import { useToast } from '../lib/toast'
import type { MediaFile, Pagination } from '../lib/types'

type MediaFilter = 'all' | 'image' | 'video' | 'audio' | 'document'

function mediaKind(file: MediaFile): MediaFilter {
  const type = file.type || ''
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  return 'document'
}

function MediaIcon({ file, size = 24 }: { file: MediaFile; size?: number }) {
  const kind = mediaKind(file)
  if (kind === 'image') return <FileImage size={size} />
  if (kind === 'video') return <FileVideo size={size} />
  if (kind === 'audio') return <FileAudio size={size} />
  if (kind === 'document') return <FileText size={size} />
  return <FileIcon size={size} />
}

export function FilesPage() {
  const { request } = useAuth()
  const { notify } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<Array<MediaFile>>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [dragging, setDragging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await request<Pagination<MediaFile>>(withQuery('/content/file', { limit: 100 }))
      setFiles(result.items || [])
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => {
    void load()
  }, [load])

  const visibleFiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return files.filter((file) => {
      const matchesFilter = filter === 'all' || mediaKind(file) === filter
      const matchesSearch = !normalizedSearch || file.name.toLowerCase().includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [files, filter, search])

  const upload = async (selected: FileList | Array<File>) => {
    const items = Array.from(selected)
    if (!items.length) return
    const form = new FormData()
    items.forEach((file) => form.append('files', file))
    setUploading(true)
    try {
      const result = await request<{ success: Array<MediaFile>; error: Array<MediaFile> }>('/file/upload', {
        method: 'POST',
        body: form,
      })
      if (result.error?.length) notify(`${result.error.length} file(s) could not be uploaded`, 'error')
      if (result.success?.length) notify(`${result.success.length} file(s) uploaded`, 'success')
      await load()
    } catch (nextError) {
      notify(nextError instanceof Error ? nextError.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (file: MediaFile) => {
    if (!window.confirm(`Delete ${file.name}? This action cannot be undone.`)) return
    try {
      await request('/file', { method: 'DELETE', body: [file.id] })
      notify('File deleted', 'success')
      await load()
    } catch (nextError) {
      notify(nextError instanceof Error ? nextError.message : 'Delete failed', 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Media Library" description="Manage your media files here." />
      <section className="media-card">
        <div className="media-toolbar">
          <label className="media-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for media..." />
          </label>
          <div className="media-filter" role="group" aria-label="Filter media by type">
            {(['all', 'image', 'video', 'audio', 'document'] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={filter === value ? 'active' : ''}
                onClick={() => setFilter(value)}
              >
                {value === 'all' ? 'All' : value === 'document' ? 'Docs' : `${value.charAt(0).toUpperCase()}${value.slice(1)}s`}
              </button>
            ))}
          </div>
          <div className="view-switcher">
            <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><Grid2X2 size={16} /></button>
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={16} /></button>
          </div>
          <select aria-label="Sort media"><option>Newest first</option><option>Oldest first</option><option>Name A–Z</option></select>
        </div>

        <div
          className={`upload-zone ${dragging ? 'upload-zone-active' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files) }}
        >
          <input ref={inputRef} type="file" multiple hidden onChange={(event) => event.target.files && void upload(event.target.files)} />
          {uploading ? <span className="spinner" /> : <UploadCloud size={24} />}
          <div><strong>{uploading ? 'Uploading files…' : 'Drag & drop files here'}</strong><span>or click to browse</span></div>
          <button type="button" className="button button-outline" onClick={() => inputRef.current?.click()} disabled={uploading}>Browse Files</button>
        </div>

        {loading ? (
          <LoadingState label="Loading media…" />
        ) : error ? (
          <ErrorState error={error} retry={() => void load()} />
        ) : visibleFiles.length === 0 ? (
          <EmptyState icon={<FileBoxIcon />} title="No files found" description={files.length ? 'Try changing your search or filter.' : 'Upload a file to get started.'} />
        ) : view === 'grid' ? (
          <div className="media-grid">
            {visibleFiles.map((file) => (
              <article className="media-item" key={file.id}>
                <div className="media-preview">
                  {mediaKind(file) === 'image' && file.url ? <img src={file.url} alt="" /> : <MediaIcon file={file} size={30} />}
                  <button type="button" className="icon-button danger-button" onClick={() => void remove(file)} aria-label={`Delete ${file.name}`}><Trash2 size={15} /></button>
                </div>
                <strong title={file.name}>{file.name}</strong>
                <span>{formatBytes(file.size)} · {formatDate(file.created_at)}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="media-list">
            {visibleFiles.map((file) => (
              <article key={file.id}>
                <span className="file-type-icon"><MediaIcon file={file} size={19} /></span>
                <div><strong>{file.name}</strong><small>{file.type || 'Unknown type'}</small></div>
                <span>{formatBytes(file.size)}</span>
                <span>{formatDate(file.created_at)}</span>
                <button type="button" className="icon-button danger-button" onClick={() => void remove(file)} aria-label={`Delete ${file.name}`}><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FileBoxIcon() {
  return <FileIcon size={22} />
}
