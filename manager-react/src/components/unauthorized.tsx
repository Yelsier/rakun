'use client'

import { Permission } from '@rakun-kit/core/client'

import { decodeCamelCase } from '@/helpers/decode-camel-case'
import { useTranslations } from '@/i18n'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export type UnauthorizedProps = {
  message?: string
  details?: string
  neededPermission: Permission[]
  anyPermission?: boolean
}

const UnauthorizedMessage: React.FC<UnauthorizedProps> = ({
  message,
  details,
  neededPermission = [],
  anyPermission,
}) => {
  const t = useTranslations()
  const resolvedMessage = message ?? t('unauthorized.defaultMessage')

  return (
    <Card className="border-red-500 gap-4">
      <CardHeader>
        <CardTitle className="text-destructive">
          {t('unauthorized.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-destructive flex flex-col gap-4">
        <p>{resolvedMessage}</p>
        {details && <pre>{details}</pre>}
        {neededPermission && (
          <div>
            <p>
              <b>
                {anyPermission
                  ? t('unauthorized.neededPermissionAny')
                  : t('unauthorized.neededPermission')}
              </b>
            </p>
            <ul className="pl-4">
              {neededPermission.map((perm) => (
                <li key={perm} className="ml-4 list-disc">
                  {decodeCamelCase(perm).replaceAll('.', ' -> ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UnauthorizedMessage
