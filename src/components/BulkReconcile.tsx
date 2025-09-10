import { useState } from 'react'
import { type FilePair } from '../lib/bulk-processor'
import BulkUpload from './BulkUpload'
import ProcessingQueue from './ProcessingQueue'

type Props = {
  onComplete?: (results: any, files: any) => void
}

export default function BulkReconcile({ onComplete }: Props) {
  const [bulkPairs, setBulkPairs] = useState<FilePair[]>([])
  const [bulkResults, setBulkResults] = useState<any[]>([])

  const handleBulkComplete = (results: any[]) => {
    setBulkResults(results)
    console.log('🎉 Массовая сверка завершена!', results)
    
    // Уведомляем родительский компонент о каждой завершенной сверке
    results.forEach(result => {
      if (result.status === 'completed' && result.result && onComplete) {
        onComplete(result.result, {
          file1: result.pair.insurance.file,
          file2: result.pair.actReport.file
        })
      }
    })
  }

  return (
    <div style={{ padding: '24px', width: '100%', maxWidth: 'none' }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px'
      }}>
        📁 Массовая обработка файлов
      </h1>
      <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '32px' }}>
        Загрузите множество файлов - система автоматически найдет пары и обработает их
      </p>

      <BulkUpload onPairsReady={setBulkPairs} />
      
      {bulkPairs.length > 0 && (
        <ProcessingQueue 
          pairs={bulkPairs} 
          onAllComplete={handleBulkComplete}
        />
      )}

      {/* Сводные результаты */}
      {bulkResults.length > 0 && (
        <div className="summary" style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '24px', color: '#374151' }}>
            📊 Сводные результаты массовой обработки
          </h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#0369a1' }}>
                {bulkResults.filter(r => r.status === 'completed').length}
              </div>
              <div className="stat-label">Пар обработано</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#16a34a' }}>
                {bulkResults.reduce((sum, r) => sum + (r.result?.matches?.length || 0), 0)}
              </div>
              <div className="stat-label">Всего совпадений</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#dc2626' }}>
                {bulkResults.filter(r => r.status === 'error').length}
              </div>
              <div className="stat-label">Ошибок обработки</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#16a34a' }}>
                {bulkResults.length > 0 ? Math.round(
                  bulkResults.reduce((sum, r) => {
                    const matches = r.result?.matches?.length || 0
                    const total = matches + (r.result?.notFoundInAct?.length || 0)
                    return sum + (total > 0 ? matches / total : 0)
                  }, 0) / bulkResults.filter(r => r.status === 'completed').length * 100
                ) : 0}%
              </div>
              <div className="stat-label">Средний % совпадений</div>
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', marginTop: '16px' }}>
            💡 Используйте кнопки "📊 Скачать Excel" в каждой паре для получения детальных отчётов
          </div>
        </div>
      )}
    </div>
  )
}
