import { useState, useEffect } from 'react'
import { type ReconciliationRecord, type WorkspaceView } from '../../types/workspace'

type Props = {
  onNavigate: (view: WorkspaceView, data?: any) => void
}

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState({
    totalReconciliations: 0,
    totalMatches: 0,
    avgMatchRate: 0,
    lastReconciliation: null as Date | null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    try {
      const stored = localStorage.getItem('reconciliation_history')
      const records: ReconciliationRecord[] = stored ? JSON.parse(stored) : []
      
      if (records.length > 0) {
        const totalMatches = records.reduce((sum, r) => sum + r.results.matches, 0)
        const avgMatchRate = records.reduce((sum, r) => sum + r.results.matchPercentage, 0) / records.length
        
        setStats({
          totalReconciliations: records.length,
          totalMatches,
          avgMatchRate: Math.round(avgMatchRate),
          lastReconciliation: new Date(records[records.length - 1].timestamp)
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ 
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          margin: '0'
        }}>
          Главная панель
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6c757d',
          margin: '8px 0 0 0'
        }}>
          Загружайте файлы и выполняйте сопоставление данных
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#0d6efd',
            marginBottom: '8px'
          }}>
            {stats.totalReconciliations}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            fontWeight: '500'
          }}>
            Всего сверок
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#198754',
            marginBottom: '8px'
          }}>
            {stats.totalMatches}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            fontWeight: '500'
          }}>
            Найдено совпадений
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#fd7e14',
            marginBottom: '8px'
          }}>
            {stats.avgMatchRate}%
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            fontWeight: '500'
          }}>
            Средняя точность
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#6f42c1',
            marginBottom: '8px'
          }}>
            {stats.lastReconciliation ? formatDate(stats.lastReconciliation) : 'Никогда'}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            fontWeight: '500'
          }}>
            Последняя сверка
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        <button
          onClick={() => onNavigate('reconcile-bulk')}
          style={{
            background: 'white',
            border: '2px solid #e9ecef',
            borderRadius: '12px',
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0d6efd'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e9ecef'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: '#0d6efd'
          }}>
            ↗
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#212529',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Начать сверку
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6c757d',
            lineHeight: '1.5',
            margin: '0'
          }}>
            Загрузите файлы и выполните сопоставление данных с пошаговым процессом
          </p>
        </button>

        <button
          onClick={() => onNavigate('history')}
          style={{
            background: 'white',
            border: '2px solid #e9ecef',
            borderRadius: '12px',
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6f42c1'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(111, 66, 193, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e9ecef'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: '#6f42c1'
          }}>
            ↻
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#212529',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            История сверок
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6c757d',
            lineHeight: '1.5',
            margin: '0'
          }}>
            Просмотр результатов предыдущих сверок и детальная аналитика
          </p>
        </button>
      </div>
    </div>
  )
}