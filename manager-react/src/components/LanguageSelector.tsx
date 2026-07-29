import { cx } from 'class-variance-authority'

import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  Select,
} from './ui/select'

import { useManagerI18n, useTranslations } from '@/i18n'
import { useLanguage } from '@/state/language'

const ManagerLanguageSelector: React.FC<{ className?: string }> = (props) => {
  const { locale, locales, setLocale } = useManagerI18n()
  const t = useTranslations()

  if (locales.length <= 1) return null

  return (
    <Select value={locale} onValueChange={setLocale}>
      <SelectTrigger className={cx('w-45', props.className)}>
        <SelectValue
          placeholder={
            locales.find((item) => item.code === locale)?.name ?? locale
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('navUser.language')}</SelectLabel>
          {locales.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const ContentLanguageSelector: React.FC<{ className?: string }> = (props) => {
  const { language, languageList, setLanguage } = useLanguage()
  const t = useTranslations()

  if (languageList.length <= 1) return null

  return (
    <Select
      value={language.code}
      onValueChange={(value) => {
        setLanguage(languageList.find((lang) => lang.code === value)!)
      }}
    >
      <SelectTrigger className={cx('w-45', props.className)}>
        <SelectValue placeholder={language.name} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('navUser.language')}</SelectLabel>
          {languageList.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const LanguageSelector: React.FC<{ manager?: boolean; className?: string }> = (
  props,
) => {
  if (props.manager) {
    return <ManagerLanguageSelector className={props.className} />
  }

  return <ContentLanguageSelector className={props.className} />
}

export default LanguageSelector
