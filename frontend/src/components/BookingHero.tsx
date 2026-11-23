import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

function BookingHero() {
  return (
    <section className="lg:col-span-6">
      <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase shadow-2xs">
        Быстрая запись на звонок
      </span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Calendar
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500 sm:text-lg">
        Забронируйте встречу за минуту: выберите тип события и удобное время.
      </p>
      <Button
        asChild
        className="mt-6 h-auto gap-2 rounded-lg bg-[#f97316] px-5 py-2.5 font-medium text-white shadow-xs hover:bg-orange-600"
      >
        <Link to="/book">
          Записаться
          <ArrowRight />
        </Link>
      </Button>
    </section>
  )
}

export { BookingHero }
