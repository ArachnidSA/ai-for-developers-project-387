import { client } from '@/api/generated/client.gen'

// В dev-режиме Vite проксирует /api на бэкенд, поэтому базовый URL по умолчанию
// относительный: запросы уходят на тот же origin. Значение можно переопределить
// через VITE_API_BASE_URL.
client.setConfig({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '' })

export { client }
