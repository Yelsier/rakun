import { useManagerI18n } from './provider'

export const useTranslations = () => {
  const { t } = useManagerI18n()
  return t
}
