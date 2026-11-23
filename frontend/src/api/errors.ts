import { type ApiError } from '@/api/generated'

/** Понятное человеку сообщение из тела ошибки API, иначе — запасной текст. */
export function detailOf(error: ApiError | undefined, fallback: string): string {
  return error?.detail ?? fallback
}
