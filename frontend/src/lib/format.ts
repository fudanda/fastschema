import { m } from '../paraglide/messages.js'
import { getLocale } from '../paraglide/runtime.js'

export function titleCase(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatDate(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatBytes(value?: number) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4)
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? m.common_yes() : m.common_no()
  if (Array.isArray(value)) return `${value.length}`
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return String(record.name ?? record.username ?? record.label ?? record.id ?? '—')
  }
  return String(value)
}

export function initials(name?: string, email?: string) {
  const source = name || email || m.common_user()
  return source
    .split(/[\s@._-]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
