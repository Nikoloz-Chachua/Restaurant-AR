'use client'
import { useEffect, useState } from 'react'
import { translations, type Lang, type Translations } from './i18n'

export function useLang(): [Translations, Lang] {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('bl-admin-lang')
    if (saved === 'en' || saved === 'ka') setLang(saved)

    function onPref(e: Event) {
      const l = (e as CustomEvent<{ lang?: string }>).detail?.lang
      if (l === 'en' || l === 'ka') setLang(l)
    }
    window.addEventListener('bl-pref', onPref)
    return () => window.removeEventListener('bl-pref', onPref)
  }, [])

  return [translations[lang], lang]
}
