import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { translations, Language, Translations } from './translations';

export function useTranslation(): {
  t: Translations;
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
} {
  const language = usePlayerStore((state) => state.language) || 'ar';
  const setLanguage = usePlayerStore((state) => state.setLanguage);

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', language);
      if (isRTL) {
        document.documentElement.classList.add('font-arabic');
        document.documentElement.classList.remove('font-latin');
      } else {
        document.documentElement.classList.add('font-latin');
        document.documentElement.classList.remove('font-arabic');
      }
    }
  }, [language, dir, isRTL]);

  return {
    t: translations[language] || translations.ar,
    language,
    setLanguage,
    isRTL,
    dir,
  };
}
