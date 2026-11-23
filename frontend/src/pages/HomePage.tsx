import { BookingHero } from '@/components/BookingHero'
import { FeaturesCard } from '@/components/FeaturesCard'
import { Navbar } from '@/components/Navbar'

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="relative flex flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-white"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_0%_0%,rgba(196,181,253,0.45),transparent_70%),radial-gradient(60%_60%_at_100%_0%,rgba(251,146,60,0.18),transparent_70%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-12 px-6 pt-16 md:px-10 md:pt-24 lg:grid-cols-12">
          <BookingHero />
          <FeaturesCard />
        </div>
      </main>
    </div>
  )
}

export { HomePage }
