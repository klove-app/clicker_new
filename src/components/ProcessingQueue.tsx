import { useState, useEffect } from 'react'
import { type FilePair } from '../lib/bulk-processor'
import { readExcel } from '../lib/xlsx'
import { parseActReport, parseInsurance, performClaudeReconciliation } from '../lib/claude-parser'
import ResultsVisualization from './ResultsVisualization'

type ProcessingResult = {
  pair: FilePair
  result?: any
  error?: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  aiAnalysis?: string
}

type Props = {
  pairs: FilePair[]
  onAllComplete: (results: ProcessingResult[]) => void
}

export default function ProcessingQueue({ pairs, onAllComplete }: Props) {
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (pairs.length > 0) {
      setResults(pairs.map(pair => ({ pair, status: 'pending' as const })))
    }
  }, [pairs])

  const processAllPairs = async () => {
    console.log(`🚀 Запуск обработки ${pairs.length} пар`)
    
    for (let index = 0; index < pairs.length; index++) {
      setCurrentIndex(index)
      const pair = pairs[index]
      
      console.log(`🔄 Обработка пары ${index + 1}/${pairs.length}:`, {
        insurance: pair.insurance.file.name,
        actReport: pair.actReport.file.name
      })

      // Обновляем статус на "обработка"
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'processing' as const } : r
      ))

      try {
        // Читаем файлы
        const [f1, f2] = await Promise.all([
          readExcel(pair.insurance.file),
          readExcel(pair.actReport.file)
        ])

        const insuranceData = await parseInsurance(f1[0].data)
        const actReportData = await parseActReport(f2[0].data)
        
        // Выполняем сверку
        const claudeResult = await performClaudeReconciliation(actReportData, insuranceData)
        
        // Анализ результата для Claude API
        let aiAnalysis = ''
        const matchRate = (claudeResult.matched?.length || 0) / ((claudeResult.matched?.length || 0) + (claudeResult.unmatched?.actReports?.length || 0))
        
        if (matchRate < 0.5) {
          aiAnalysis = '🚨 Низкий процент совпадений - требует проверки'
        } else if (matchRate > 0.9) {
          aiAnalysis = '⚠️ Много ошибок в формулах - проверьте расчеты'
        } else if (matchRate > 0.9) {
          aiAnalysis = '✅ Отличное качество сверки'
        } else {
          aiAnalysis = '👍 Хорошее качество сверки'
        }

        // Обновляем результат
        setResults(prev => prev.map((r, i) => 
          i === index ? { 
            ...r, 
            result: claudeResult, 
            status: 'completed' as const,
            aiAnalysis 
          } : r
        ))

        console.log(`✅ Пара ${index + 1} обработана успешно`)

      } catch (error) {
        console.error(`❌ Ошибка при обработке пары ${index + 1}:`, error)
        
        setResults(prev => prev.map((r, i) => 
          i === index ? { 
            ...r, 
            error: String(error), 
            status: 'error' as const 
          } : r
        ))
      }

      // Пауза между парами
      if (index < pairs.length - 1) {
        console.log(`⏳ Пауза 1 сек перед следующей парой...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Завершение обработки
    console.log(`🎉 Все ${pairs.length} пар обработаны!`)
    setIsProcessing(false)
    
    // Отправляем результаты через setTimeout чтобы избежать React warning
    setTimeout(() => {
      setResults(prevResults => {
        console.log('📊 Отправляем финальные результаты:', prevResults)
        onAllComplete(prevResults)
        return prevResults
      })
    }, 100)
  }

  const startProcessing = () => {
    setIsProcessing(true)
    setCurrentIndex(-1)
    processAllPairs()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6b7280'
      case 'processing': return '#3b82f6'
      case 'completed': return '#16a34a'
      case 'error': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'processing': return '🔄'
      case 'completed': return '✅'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  if (pairs.length === 0) return null

  return (
    <div className="card summary" style={{ marginTop: '20px', width: '100%', maxWidth: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>⚡ Очередь обработки ({pairs.length} пар)</h3>
        <button
          onClick={startProcessing}
          disabled={isProcessing}
          style={{
            background: isProcessing ? '#6b7280' : '#16a34a',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isProcessing ? '🔄 Обработка...' : '🚀 Запустить массовую сверку'}
        </button>
      </div>

      {/* Прогресс */}
      {isProcessing && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Прогресс: {currentIndex + 1} из {pairs.length}</span>
            <span>{Math.round((currentIndex + 1) / pairs.length * 100)}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e5e7eb', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(currentIndex + 1) / pairs.length * 100}%`,
              height: '100%',
              background: '#16a34a',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* Список пар с результатами */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {results.map((result, idx) => (
          <div key={idx} style={{
            padding: '12px',
            background: currentIndex === idx ? '#f0f9ff' : '#f9fafb',
            borderRadius: '6px',
            marginBottom: '8px',
            border: `2px solid ${currentIndex === idx ? '#3b82f6' : '#e5e7eb'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  <span style={{ marginRight: '8px', fontSize: '20px' }}>
                    {getStatusIcon(result.status)}
                  </span>
                  Пара #{idx + 1}
                </div>
                
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  📊 {result.pair.insurance.file.name}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  📋 {result.pair.actReport.file.name}
                </div>

                {result.result && (
                  <ResultsVisualization 
                    results={result.result}
                    files={{
                      insurance: result.pair.insurance.file.name,
                      actReport: result.pair.actReport.file.name
                    }}
                    pairIndex={idx + 1}
                  />
                )}

                {result.aiAnalysis && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6366f1',
                    background: '#f0f9ff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}>
                    🤖 AI: {result.aiAnalysis}
                  </div>
                )}

                {result.error && (
                  <div style={{ fontSize: '14px', color: '#dc2626' }}>
                    ❌ Ошибка: {result.error}
                  </div>
                )}
              </div>

              <div style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: getStatusColor(result.status),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                minWidth: '80px'
              }}>
                {result.status === 'pending' && 'Ожидает'}
                {result.status === 'processing' && 'Обработка'}
                {result.status === 'completed' && 'Готово'}
                {result.status === 'error' && 'Ошибка'}
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Итоговая статистика */}
      {results.length > 0 && results.every(r => r.status === 'completed' || r.status === 'error') && (
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: '#f0fdf4', 
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <h4 style={{ color: '#16a34a', marginBottom: '12px' }}>🎉 Массовая обработка завершена!</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>✅ Успешно: {results.filter(r => r.status === 'completed').length}</div>
            <div>❌ Ошибки: {results.filter(r => r.status === 'error').length}</div>
            <div>📊 Всего файлов Excel: {results.filter(r => r.status === 'completed').length}</div>
          </div>
        </div>
      )}
    </div>
  )
}
