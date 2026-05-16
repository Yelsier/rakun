'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'
import { useState } from 'react'

import { columns } from './columns'
import DeleteSession from './delete'

import { DataTable } from '@/components/ui/data-table'

export default function Sessions(props: {
  sessions: AccountInfoOutput['sessions']
  current: string
}) {
  const [sessions, setSessions] = useState(props.sessions)
  const [deleteSession, setDeleteSession] = useState<string | null>(null)

  return (
    <div className='w-full' data-tour='account-sessions'>
      <h2 className='mb-4 text-xl font-bold'>Active Sessions</h2>
      <DeleteSession
        session={deleteSession}
        setDeleteSession={setDeleteSession}
        setSessions={setSessions}
      />
      <DataTable
        columns={columns({
          current: props.current,
          setDeleteSession,
        })}
        data={sessions}
      />
    </div>
  )
}
