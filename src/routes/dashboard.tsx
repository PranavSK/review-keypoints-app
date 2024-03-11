import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: () => <div className='h-screen'><Outlet /></div>
})
