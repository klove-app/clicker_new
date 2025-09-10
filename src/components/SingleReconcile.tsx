import { useState } from 'react'
import { readExcel } from '../lib/xlsx'
import { parseActReport, parseInsurance, performClaudeReconciliation } from '../lib/claude-parser'
import { exportClaudeResults } from '../lib/claude-excel-export'
import NotionTable from './NotionTable'
// import { logEvent } from '../lib/supabase' // Временно отключено - используем localStorage

type Props = {
  onComplete?: (results: any, files: { file1: File; file2: File }) => void
}

export default function SingleReconcile({ onComplete }: Props) {
  const [upload1, setUpload1] = useState<File | null>(null)
  const [upload2, setUpload2] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('')
  const [claudeResult, setClaudeResult] = useState<any | null>(null)

  const handleReconcile = async () => {
    if (!upload1 || !upload2) return
    
    setStatus('Чтение и анализ файлов...')
    try {
      const [f1, f2] = await Promise.all([readExcel(upload1), readExcel(upload2)])
      const left = f1[0]
      const right = f2[0]
      
      setStatus('Выполняется сверка по точному алгоритму Клода...')

      setTimeout(async () => {
        try {
          console.log('🚀 Запуск точного алгоритма Клода...')
          
          const insuranceData = await parseInsurance(left.data)
          const actReportData = await parseActReport(right.data)
          
          const claudeCmp = await performClaudeReconciliation(insuranceData, actReportData)
          setClaudeResult(claudeCmp)

          // Уведомляем родительский компонент
          if (onComplete) {
            onComplete(claudeCmp, { file1: upload1, file2: upload2 })
          }

          // logEvent({ action: 'claude_compare_done', details: { // Временно отключено
          console.log('Сверка завершена:', {
            matches: claudeCmp.matched?.length || 0,
            notFoundInAct: claudeCmp.unmatched?.actReports?.length || 0,
            notFoundInInsurance: claudeCmp.unmatched?.insurance?.length || 0,
            matchPercentage: claudeCmp.summary?.matchPercentage || 0
          })
          
          setStatus(`✅ Сверка завершена! Найдено ${claudeCmp.matched?.length || 0} совпадений (${claudeCmp.summary?.matchPercentage || 0}%)`)
        } catch (error) {
          setStatus('Ошибка при сверке: ' + String(error))
          console.error(error)
        }
      }, 500)
      
    } catch (error) {
      setStatus('Ошибка при чтении файлов: ' + String(error))
      console.error(error)
    }
  }

  return (
    <div style={{ padding: '24px', width: '100%', maxWidth: 'none' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '8px'
      }}>
        Сверка одной пары файлов
      </h1>
      <p style={{ color: '#6b7280', fontSize: '16px', margin: 0, marginBottom: '32px' }}>
        Загрузите два файла для автоматической сверки по алгоритму Клода
      </p>

      <div className="card stack">
        <label style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'left'
        }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            Выгрузка по страховкам
          </span>
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={(e) => setUpload1(e.target.files?.[0] ?? null)}
            className="modern-input"
          />
          {upload1 && (
            <span style={{ color: '#16a34a', fontSize: '14px', fontWeight: '600' }}>
              ✓ {upload1.name} ({Math.round(upload1.size / 1024)} KB)
            </span>
          )}
        </label>

        <label style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'left'
        }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            Акт-отчет об оказании услуг
          </span>
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={(e) => setUpload2(e.target.files?.[0] ?? null)}
            className="modern-input"
          />
          {upload2 && (
            <span style={{ color: '#16a34a', fontSize: '14px', fontWeight: '600' }}>
              ✓ {upload2.name} ({Math.round(upload2.size / 1024)} KB)
            </span>
          )}
        </label>
        
        <button
          className="modern-button"
          onClick={handleReconcile}
          disabled={!upload1 || !upload2}
          style={{
            marginTop: '16px',
            fontSize: '18px',
            padding: '16px 32px'
          }}
        >
          Запустить автоматическую сверку
        </button>
        
        {status && (
          <div style={{
            padding: '12px 16px',
            background: status.includes('✅') ? '#f0fdf4' : '#f0f9ff',
            borderRadius: '8px',
            color: status.includes('✅') ? '#166534' : '#1e40af',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}
      </div>

      {/* Результаты */}
      {claudeResult && (
        <div style={{ marginTop: '32px' }}>
          <div className="summary">
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '24px', color: '#374151' }}>
              🎯 Результаты сверки
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#0369a1' }}>
                  {claudeResult.matches.length}
                </div>
                <div className="stat-label">Найдено совпадений</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#dc2626' }}>
                  {claudeResult.notFoundInAct.length}
                </div>
                <div className="stat-label">Не найдено в акте</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#ea580c' }}>
                  {claudeResult.formulaErrors.length}
                </div>
                <div className="stat-label">Ошибки формул</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#16a34a' }}>
                  {claudeResult.matches.length > 0 ? Math.round(claudeResult.matches.length / (claudeResult.matches.length + claudeResult.notFoundInAct.length) * 100) : 0}%
                </div>
                <div className="stat-label">Процент совпадений</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
              <button
                className="modern-button"
                onClick={() => exportClaudeResults(
                  claudeResult, 
                  { 
                    file1Name: upload1?.name || 'выгрузка', 
                    file2Name: upload2?.name || 'акт-отчет' 
                  }
                )}
              >
                📊 Скачать Excel отчёт
              </button>
              
              <button
                className="modern-button"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                onClick={() => {
                  const blob = new Blob([JSON.stringify({
                    summary: {
                      matches: claudeResult.matches.length,
                      notFoundInAct: claudeResult.notFoundInAct.length,
                      notFoundInInsurance: claudeResult.notFoundInInsurance.length,
                      formulaErrors: claudeResult.formulaErrors.length
                    },
                    matches: claudeResult.matches,
                    notFoundInAct: claudeResult.notFoundInAct,
                    notFoundInInsurance: claudeResult.notFoundInInsurance,
                    formulaErrors: claudeResult.formulaErrors
                  }, null, 2)], { type: 'application/json' })
                  
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'сверка-данные.json'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                💾 Скачать JSON
              </button>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <NotionTable 
              data={claudeResult.matches}
              title="📊 Найденные совпадения"
              subtitle={`Показаны ${claudeResult.matches.length} записей с точным совпадением сумм`}
              maxRows={25}
            />
          </div>
        </div>
      )}
    </div>
  )
}
