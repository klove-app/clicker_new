import { useState, useEffect } from 'react'
import { getStoredEvents, clearStoredEvents, type LogEvent } from '../lib/supabase'

export default function EventHistory() {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEvents(getStoredEvents())
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <div style={{ marginTop: 16 }}>
        <button onClick={() => setIsOpen(true)}>
          Показать историю операций
        </button>
      </div>
    )
  }

  return (
    <div className="card summary" style={{ marginTop: 16 }}>
      <div className="history-header">
        <h3>История операций ({events.length})</h3>
        <div className="history-buttons">
          <button onClick={() => setEvents(getStoredEvents())}>
            Обновить
          </button>
          <button 
            onClick={() => {
              clearStoredEvents()
              setEvents([])
            }}
          >
            Очистить
          </button>
          <button onClick={() => setIsOpen(false)}>Скрыть</button>
        </div>
      </div>
      
      {events.length === 0 ? (
        <p>Нет записей</p>
      ) : (
        <div className="history-scroll">
          {events.slice().reverse().map((event, idx) => (
            <div key={idx} className="history-item">
              <div className="history-item-header">
                <strong>{event.action}</strong>
                <span className="history-item-time">
                  {new Date(event.created_at || '').toLocaleString('ru')}
                </span>
              </div>
              {event.details && Object.keys(event.details).length > 0 && (
                <pre className="history-item-details">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
