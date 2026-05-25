import { useCallback, useEffect, useState } from 'react'

export type TranslationLanguage = {
  code: string
  name: string
}

export const useTranslationDialogState = ({
  currentLanguageCode,
  languageList,
}: {
  currentLanguageCode: string
  languageList: TranslationLanguage[]
}) => {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState(currentLanguageCode)
  const [targets, setTargets] = useState<string[]>(() =>
    languageList.filter((item) => item.code !== currentLanguageCode).map((item) => item.code),
  )
  const [overwrite, setOverwrite] = useState(false)

  const reset = useCallback(() => {
    setSource(currentLanguageCode)
    setTargets(
      languageList.filter((item) => item.code !== currentLanguageCode).map((item) => item.code),
    )
  }, [currentLanguageCode, languageList])

  useEffect(() => {
    const codes = new Set(languageList.map((item) => item.code))

    if (!codes.has(source)) {
      setSource(currentLanguageCode)
    }

    setTargets((currentTargets) =>
      currentTargets.filter((target) => codes.has(target) && target !== source),
    )
  }, [currentLanguageCode, languageList, source])

  return {
    open,
    overwrite,
    reset,
    setOpen,
    setOverwrite,
    setSource,
    setTargets,
    source,
    targets,
  }
}
