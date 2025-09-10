import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export type LogEvent = {
  id?: string
  created_at?: string
  action: string
  details?: Record<string, unknown>
}

export async function logEvent(event: LogEvent) {
  // Сохраняем в localStorage как fallback
  try {
    const events = JSON.parse(localStorage.getItem('etg_events') || '[]')
    events.push({
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    })
    // Оставляем только последние 100 событий
    if (events.length > 100) {
      events.splice(0, events.length - 100)
    }
    localStorage.setItem('etg_events', JSON.stringify(events))
    console.log('Event logged to localStorage:', event)
  } catch (error) {
    console.warn('localStorage logging failed:', error)
  }

  // Также пробуем Supabase, если настроен
  if (supabase) {
    try {
      await supabase.from('etl_events').insert({ action: event.action, details: event.details ?? {} })
      console.log('Event logged to Supabase:', event)
    } catch (error) {
      console.warn('Supabase logging failed:', error)
    }
  }
}

export function getStoredEvents(): LogEvent[] {
  try {
    return JSON.parse(localStorage.getItem('etg_events') || '[]')
  } catch {
    return []
  }
}

export function clearStoredEvents() {
  localStorage.removeItem('etg_events')
}



