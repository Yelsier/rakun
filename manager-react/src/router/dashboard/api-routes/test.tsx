'use client'

import { useRef, useState } from 'react'

import { CodeBlock } from './CodeBlock'
import {
  EditableCodeBlock,
  type EditableCodeBlockRef,
} from './EditableCodeBlock'

import { useManagerClient } from '@/client/react'
import { Button } from '@/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

type Props = {
  operation: {
    name: string
    path: string
    method: 'get' | 'post'
  }
  defaultInput?: string
}

export default function ApiPlayground({
  operation,
  defaultInput,
}: Props) {
  const client = useManagerClient()
  const inputRef = useRef<EditableCodeBlockRef>(null)
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    setErr('')
    setOut('')

    let parsedInput: unknown = undefined

    try {
      const value = inputRef.current?.getValue().trim()
      parsedInput = value ? JSON.parse(value) : undefined
    } catch {
      setErr('Invalid input JSON')
      setRunning(false)
      return
    }

    try {
      const result = client.requestOperation
        ? await client.requestOperation(operation.name, parsedInput, {
            path: operation.path,
            method: operation.method,
          })
        : await client.request(operation.name as never, parsedInput as never)
      setOut(JSON.stringify(result, null, 2))
    } catch (error) {
      if (error instanceof Error) {
        setErr(error.message)
      } else {
        setErr('Unknown error')
      }

      setOut(JSON.stringify(error, null, 2))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className='mt-6'>
      <ResizablePanelGroup className='w-full' orientation='horizontal'>
        <ResizablePanel defaultSize={50}>
          <EditableCodeBlock ref={inputRef}>{defaultInput}</EditableCodeBlock>
        </ResizablePanel>
        <ResizableHandle withHandle className='mx-2' />
        <ResizablePanel defaultSize={50}>
          {err ? (
            <div className='mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
              {err}
            </div>
          ) : null}
          <CodeBlock>{out}</CodeBlock>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Button
        className='mt-4 w-full'
        onClick={() => void run()}
        disabled={running}
      >
        {running ? 'Running...' : 'Run'}
      </Button>
    </div>
  )
}
