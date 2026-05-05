import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

import { decodeCamelCase } from '@/helpers/decode-camel-case'

export type ErrorProps = {
  message: string
  _tag: string
  details?: string
  input?: unknown
  expected?: unknown
}

export const extractErrorProps = (error: unknown): ErrorProps => {
  if (typeof error === 'object' && error !== null && '_tag' in error) {
    const { _tag, message, details, input, expected } = error as Record<
      string,
      unknown
    >
    return {
      _tag: String(_tag),
      message: String(message ?? 'An error occurred'),
      details: details ? String(details) : undefined,
      input,
      expected,
    }
  }

  return {
    _tag: 'UnknownError',
    message: typeof error === 'string' ? error : 'An unknown error occurred',
  }
}

const ErrorMessage: React.FC<ErrorProps> = ({
  message,
  _tag,
  details,
  input,
  expected,
}) => {
  return (
    <Card className='border-red-500'>
      <CardHeader>
        <CardTitle className='text-destructive'>
          {decodeCamelCase(_tag)}
        </CardTitle>
      </CardHeader>
      <CardContent className='text-destructive'>
        <p>{message}</p>
        {_tag === 'DbErrorInvalidData' && (
          <>
            {details && <pre>{details}</pre>}
            <pre>
              {JSON.stringify({ input: input, expected: expected }, null, 2)}
            </pre>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ErrorMessage
