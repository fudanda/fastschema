import Select from '@douyinfe/semi-ui/lib/es/select'
import { IconLanguage } from '@douyinfe/semi-icons'
import { useEffect } from 'react'

import { m } from '../paraglide/messages.js'
import { getLocale, isLocale, setLocale } from '../paraglide/runtime.js'

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  return (
    <div className={`locale-switcher ${className}`.trim()}>
      <IconLanguage aria-hidden="true" />
      <span className="sr-only">{m.language()}</span>
      <Select
        aria-label={m.language_selector()}
        value={getLocale()}
        size="small"
        optionList={[
          { value: 'zh-CN', label: m.language_zh_cn() },
          { value: 'en', label: m.language_en() },
        ]}
        onChange={(value) => {
          if (typeof value === 'string' && isLocale(value)) void setLocale(value)
        }}
      />
    </div>
  )
}

export function LocaleDocumentSync() {
  const locale = getLocale()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
