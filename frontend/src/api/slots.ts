import { client } from '@/api/client'
import { calendarApiListEventTypeSlots, type Slot } from '@/api/generated'

export type { Slot }

/** Свободные слоты типа события на календарный день (YYYY-MM-DD), через SDK. */
export async function listEventTypeSlots(eventTypeId: number, date: string): Promise<Slot[]> {
  const { data } = await calendarApiListEventTypeSlots({
    client,
    path: { event_type_id: eventTypeId },
    query: { date },
  })
  return data ?? []
}
