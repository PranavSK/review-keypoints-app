import { Input } from '@/components/ui/input'
import { initDatabaseFromText, unparseInfoJSON } from '@/lib/loader'
import { StoreProvider, StoreState } from '@/lib/store'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ChangeEvent, useState } from 'react'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

function Dashboard() {
  const [state, setState] = useState<StoreState>({})
  const [text, setText] = useState<string>('')

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setText(text)
    const data = await initDatabaseFromText(text)
    setState(data)
  }

  return <div className='h-screen'>
    {Object.entries(state).length
      ? <StoreProvider value={{ state, setState, unparse: (keyMoments) => unparseInfoJSON(text, keyMoments) }}><Outlet /></StoreProvider>
      : <div className='container p-8'><Input type='file' onChange={(e) => { void handleChange(e) }} /></div>
    }
  </div>
}
