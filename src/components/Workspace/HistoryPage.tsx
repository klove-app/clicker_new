import { useState, useEffect } from 'react'
import { type ReconciliationRecord } from '../../types/workspace'

type Props = {
  onViewDetails: (record: ReconciliationRecord) => void
}

export default function HistoryPage({ onViewDetails }: Props) {
  const [records, setRecords] = useState<ReconciliationRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<ReconciliationRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'matches' | 'percentage'>('date')

  useEffect(() => {
    loadRecords()
  }, [])

  useEffect(() => {
    let filtered = records.filter(record =>
      record.files.insurance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.files.actReport.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        case 'matches':
          return b.results.matches - a.results.matches
        case 'percentage':
          return b.results.matchPercentage - a.results.matchPercentage
        default:
          return 0
      }
    })

    setFilteredRecords(filtered)
  }, [records, searchTerm, sortBy])

  const loadRecords = () => {
    try {
      const stored = localStorage.getItem('reconciliation_history')
      const data: ReconciliationRecord[] = stored ? JSON.parse(stored) : []
      setRecords(data)
    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
    }
  }

  const clearHistory = () => {
    if (confirm('Удалить всю историю сверок?')) {
      localStorage.removeItem('reconciliation_history')
      setRecords([])
    }
  }

  const exportHistory = () => {
    const dataStr = JSON.stringify(records, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `история-сверок-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '24px', width: '100%', maxWidth: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          📚 История сверок
        </h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="modern-button" onClick={exportHistory}>
            💾 Экспорт истории
          </button>
          <button 
            className="modern-button" 
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
            onClick={clearHistory}
          >
            🗑️ Очистить
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Поиск по названию файлов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="date">📅 По дате</option>
            <option value="matches">🎯 По совпадениям</option>
            <option value="percentage">📊 По проценту</option>
          </select>
        </div>
      </div>

      {/* Список сверок */}
      {filteredRecords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
          <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>История пуста</h3>
          <p style={{ color: '#9ca3af' }}>Выполните первую сверку, чтобы увидеть результаты здесь</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="card"
              onClick={() => onViewDetails(record)}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{
                      background: record.results.matchPercentage > 80 ? '#10b981' :
                                 record.results.matchPercentage > 60 ? '#f59e0b' : '#ef4444',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginRight: '12px'
                    }}>
                      {record.results.matchPercentage}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(record.timestamp).toLocaleString('ru')}
                    </div>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                    📊 {record.files.insurance.name}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                    📋 {record.files.actReport.name}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#16a34a' }}>
                      ✅ {record.results.matches} совпадений
                    </div>
                    <div style={{ color: '#ef4444' }}>
                      ❌ {record.results.notFoundInAct} не найдено
                    </div>
                    <div style={{ color: '#f59e0b' }}>
                      🔧 {record.results.formulaErrors} ошибок формул
                    </div>
                  </div>

                  {record.aiAnalysis && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: '#f0f9ff',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#1e40af'
                    }}>
                      🤖 {record.aiAnalysis}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetails(record)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Подробнее →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
