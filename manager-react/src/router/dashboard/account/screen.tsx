'use client'

import Mfa from './mfa/Mfa'
import Sessions from './sessions/Sessions'

import { useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import { UpdatePassword } from '@/components/update-password'

export function ManagerAccountScreen() {
  const accountInfoQuery = useManagerQuery({
    name: 'manager.auth.accountInfo',
    input: undefined,
  })

  if (!accountInfoQuery.data) {
    return <Loading />
  }

  return (
    <div className='container mx-auto flex flex-col items-start gap-6 px-4 py-10'>
      <div className='flex w-full justify-end'>
        <UpdatePassword />
      </div>
      <Mfa {...accountInfoQuery.data} />
      <Sessions
        current={accountInfoQuery.data.currentSession}
        sessions={accountInfoQuery.data.sessions}
      />
    </div>
  )
}
