import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Записаться', to: '/book' },
  { label: 'Админка', to: '/owner' },
] as const

function Navbar() {
  return (
    <header className="border-b border-slate-100 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-10">
        <Link className="flex items-center gap-2" to="/">
          <CalendarClock aria-hidden="true" className="size-5 text-orange-500" />
          <span className="font-semibold text-slate-900">Calendar</span>
        </Link>
        <div className="flex items-center gap-6">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
              to={to}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}

export { Navbar }
