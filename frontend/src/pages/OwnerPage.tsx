import { Link } from 'react-router-dom'

import { EventTypesManager } from '@/components/EventTypesManager'
import { UpcomingBookings } from '@/components/UpcomingBookings'

function OwnerPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Админка</h1>

      <UpcomingBookings />

      <EventTypesManager />

      <Link className="text-sm underline underline-offset-4" to="/">
        На главную
      </Link>
    </main>
  )
}

export { OwnerPage }
