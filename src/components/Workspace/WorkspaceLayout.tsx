import { useState, useEffect } from 'react'
import { type WorkspaceView, type ReconciliationRecord, type DetailedViewData } from '../../types/workspace'
import Sidebar from './Sidebar'
import Dashboard from './Dashboard'
import HistoryPage from './HistoryPage'
import DetailedView from './DetailedView'

// Импорты существующих компонентов
import StepByStepReconcile from '../StepByStepReconcile'

type Props = {}

export default function WorkspaceLayout({}: Props) {
  const [currentView, setCurrentView] = useState<WorkspaceView>('dashboard')
  const [detailedViewData, setDetailedViewData] = useState<DetailedViewData | null>(null)
  const [reconciliationHistory, setReconciliationHistory] = useState<ReconciliationRecord[]>([])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('reconciliation_history')
      const data: ReconciliationRecord[] = stored ? JSON.parse(stored) : []
      setReconciliationHistory(data)
    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
    }
  }

  const handleViewChange = (view: WorkspaceView, data?: any) => {
    if (view === 'detailed-view' && data) {
      setDetailedViewData({
        record: data,
        fullResults: null, // Будет загружено из localStorage или API
        rawData: undefined
      })
    }
    setCurrentView(view)
  }

  const handleReconciliationComplete = (results: any, files: { file1: File; file2: File }) => {
    // Сохраняем результат в историю
    const record: ReconciliationRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      files: {
        insurance: { name: files.file1.name, size: files.file1.size },
        actReport: { name: files.file2.name, size: files.file2.size }
      },
      results: {
        matches: results.matched?.length || 0,
        notFoundInAct: results.unmatched?.actReports?.length || 0,
        notFoundInInsurance: results.unmatched?.insurance?.length || 0,
        formulaErrors: 0,
        matchPercentage: Math.round(results.summary?.matchPercentage || 0)
      },
      status: 'completed',
      aiAnalysis: generateAIAnalysis(results)
    }

    // Сохраняем в localStorage
    const updatedHistory = [...reconciliationHistory, record]
    localStorage.setItem('reconciliation_history', JSON.stringify(updatedHistory))
    setReconciliationHistory(updatedHistory)

    // Сохраняем полные результаты отдельно для детального просмотра
    localStorage.setItem(`reconciliation_${record.id}`, JSON.stringify(results))

    console.log('💾 Сверка сохранена в историю:', record.id)
  }

  const generateAIAnalysis = (results: any): string => {
    const matchRate = (results.summary?.matchPercentage || 0) / 100
    
    if (matchRate > 0.9) return 'Отличное качество сверки'
    if (matchRate > 0.8) return 'Хорошее качество сверки'
    if (matchRate > 0.6) return 'Среднее качество - есть расхождения'
    if (matchRate > 0.4) return 'Низкое качество - много расхождений'
    return 'Критическое качество - требует проверки'
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleViewChange} />
      
      case 'reconcile-bulk':
        return (
          <StepByStepReconcile 
            onComplete={handleReconciliationComplete}
            onBack={() => setCurrentView('dashboard')}
          />
        )
      
      case 'history':
        return (
          <HistoryPage 
            onViewDetails={(record) => {
              // Загружаем полные данные
              try {
                const fullResults = localStorage.getItem(`reconciliation_${record.id}`)
                setDetailedViewData({
                  record,
                  fullResults: fullResults ? JSON.parse(fullResults) : null
                })
                setCurrentView('detailed-view')
              } catch (error) {
                console.error('Ошибка загрузки детальных данных:', error)
              }
            }}
          />
        )
      
      case 'detailed-view':
        return detailedViewData ? (
          <DetailedView 
            data={detailedViewData}
            onBack={() => setCurrentView('history')}
          />
        ) : (
          <div>Ошибка загрузки данных</div>
        )
      
      case 'settings':
        return (
          <div style={{ padding: '24px' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '24px'
            }}>
              ⚙️ Настройки
            </h1>
            <div className="card">
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
                Настройки будут добавлены в следующих версиях
              </p>
            </div>
          </div>
        )
      
      default:
        return <Dashboard onNavigate={handleViewChange} />
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#fafbfc'
    }}>
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        reconciliationCount={reconciliationHistory.length}
      />
      
      <div style={{ 
        flex: 1,
        background: 'white',
        overflow: 'auto',
        minWidth: 0,
        maxWidth: 'calc(100vw - 240px)'
      }}>
        {renderContent()}
      </div>
    </div>
  )
}
