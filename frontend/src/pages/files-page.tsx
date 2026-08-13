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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/page'
import { ActionButton, SelectInput, TextInput } from '../components/semi-controls'
import { useAuth } from '../lib/auth'
import { confirmDanger } from '../lib/confirm'
import { formatBytes, formatDate } from '../lib/format'
import { filesQueryOptions, queryKeys } from '../lib/queries'
import { useToast } from '../lib/toast'
import { m } from '../paraglide/messages.js'
import type { MediaFile } from '../lib/types'

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
  const queryClient = useQueryClient()
  const filesQuery = useQuery(filesQueryOptions())
  const { notify } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [dragging, setDragging] = useState(false)

  const files = useMemo(() => filesQuery.data || [], [filesQuery.data])

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
      const result = await request<{ success: Array<MediaFile>; error: Array<MediaFile> }>(
        '/file/upload',
        {
          method: 'POST',
          body: form,
        },
      )
      if (result.error?.length)
        notify(m.media_upload_errors({ count: result.error.length }), 'error')
      if (result.success?.length)
        notify(m.media_upload_success({ count: result.success.length }), 'success')
      await queryClient.invalidateQueries({ queryKey: queryKeys.files })
    } catch (nextError) {
      notify(nextError instanceof Error ? nextError.message : m.media_upload_failed(), 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (file: MediaFile) => {
    if (!(await confirmDanger(m.media_delete_confirm({ name: file.name })))) return
    try {
      await request('/file', { method: 'DELETE', body: [file.id] })
      notify(m.media_deleted(), 'success')
      await queryClient.invalidateQueries({ queryKey: queryKeys.files })
    } catch (nextError) {
      notify(nextError instanceof Error ? nextError.message : m.common_delete_failed(), 'error')
    }
  }

  return (
    <div>
      <PageHeader title={m.media_title()} description={m.media_description()} />
      <section className="media-card">
        <div className="media-toolbar">
          <label className="media-search">
            <Search size={16} />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={m.media_search()}
            />
          </label>
          <div className="media-filter" role="group" aria-label={m.media_filter_label()}>
            {(['all', 'image', 'video', 'audio', 'document'] as const).map((value) => (
              <ActionButton
                type="button"
                key={value}
                className={filter === value ? 'active' : ''}
                onClick={() => setFilter(value)}
              >
                {
                  {
                    all: m.media_filter_all(),
                    image: m.media_filter_images(),
                    video: m.media_filter_videos(),
                    audio: m.media_filter_audio(),
                    document: m.media_filter_docs(),
                  }[value]
                }
              </ActionButton>
            ))}
          </div>
          <div className="view-switcher">
            <ActionButton
              type="button"
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              aria-label={m.media_grid_view()}
            >
              <Grid2X2 size={16} />
            </ActionButton>
            <ActionButton
              type="button"
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              aria-label={m.media_list_view()}
            >
              <List size={16} />
            </ActionButton>
          </div>
          <SelectInput aria-label={m.media_sort()}>
            <option>{m.media_sort_newest()}</option>
            <option>{m.media_sort_oldest()}</option>
            <option>{m.media_sort_name()}</option>
          </SelectInput>
        </div>

        <div
          className={`upload-zone ${dragging ? 'upload-zone-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void upload(event.dataTransfer.files)
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => event.target.files && void upload(event.target.files)}
          />
          {uploading ? <span className="spinner" /> : <UploadCloud size={24} />}
          <div>
            <strong>{uploading ? m.media_uploading() : m.media_drop_files()}</strong>
            <span>{m.media_browse_hint()}</span>
          </div>
          <ActionButton
            type="button"
            className="button button-outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {m.media_browse()}
          </ActionButton>
        </div>

        {filesQuery.isPending ? (
          <LoadingState label={m.media_loading()} />
        ) : filesQuery.error ? (
          <ErrorState error={filesQuery.error} retry={() => void filesQuery.refetch()} />
        ) : visibleFiles.length === 0 ? (
          <EmptyState
            icon={<FileBoxIcon />}
            title={m.media_no_files()}
            description={files.length ? m.media_no_search_results() : m.media_empty_help()}
          />
        ) : view === 'grid' ? (
          <div className="media-grid">
            {visibleFiles.map((file) => (
              <article className="media-item" key={file.id}>
                <div className="media-preview">
                  {mediaKind(file) === 'image' && file.url ? (
                    <img src={file.url} alt="" />
                  ) : (
                    <MediaIcon file={file} size={30} />
                  )}
                  <ActionButton
                    type="button"
                    className="icon-button danger-button"
                    onClick={() => void remove(file)}
                    aria-label={m.media_delete_label({ name: file.name })}
                  >
                    <Trash2 size={15} />
                  </ActionButton>
                </div>
                <strong title={file.name}>{file.name}</strong>
                <span>
                  {formatBytes(file.size)} · {formatDate(file.created_at)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="media-list">
            {visibleFiles.map((file) => (
              <article key={file.id}>
                <span className="file-type-icon">
                  <MediaIcon file={file} size={19} />
                </span>
                <div>
                  <strong>{file.name}</strong>
                  <small>{file.type || m.media_unknown_type()}</small>
                </div>
                <span>{formatBytes(file.size)}</span>
                <span>{formatDate(file.created_at)}</span>
                <ActionButton
                  type="button"
                  className="icon-button danger-button"
                  onClick={() => void remove(file)}
                  aria-label={m.media_delete_label({ name: file.name })}
                >
                  <Trash2 size={15} />
                </ActionButton>
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
