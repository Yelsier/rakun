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

import { useLanguage } from '@/state/language'

const LanguageSelector: React.FC<{ manager?: boolean; className?: string }> = (
  props,
) => {
  const {
    language,
    languageList,
    setLanguage,
    managerLanguage,
    setManagerLanguage,
  } = useLanguage()

  if (languageList.length <= 1) return null

  return (
    <Select
      value={props.manager ? managerLanguage.code : language.code}
      onValueChange={(value) => {
        if (props.manager) {
          setManagerLanguage(
            languageList.find((lang) => lang.code === value)!,
          )
        } else {
          setLanguage(languageList.find((lang) => lang.code === value)!)
        }
      }}
    >
      <SelectTrigger className={cx('w-45', props.className)}>
        <SelectValue
          placeholder={props.manager ? managerLanguage.name : language.name}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Languages</SelectLabel>
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

export default LanguageSelector
