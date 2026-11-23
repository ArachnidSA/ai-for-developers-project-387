import { Card, CardContent, CardHeader } from '@/components/ui/card'

const FEATURES = [
  'Выбор типа события и удобного времени для встречи.',
  'Быстрое бронирование с подтверждением и дополнительными заметками.',
  'Просмотр занятых слотов и предстоящих записей в админке.',
] as const

function FeaturesCard() {
  return (
    <Card className="max-w-[480px] rounded-2xl border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-5 lg:col-start-8">
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-900">Возможности</h2>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-3 pl-4 text-sm leading-relaxed text-slate-500">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export { FeaturesCard }
