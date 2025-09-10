import { useState } from 'react'
import type { ReconciliationResult } from '../lib/claude-parser'
import { exportClaudeResults } from '../lib/claude-excel-export'

type Props = {
  results: ReconciliationResult
  files: {
    insurance: string
    actReport: string
  }
  pairIndex?: number
}

export default function ResultsVisualization({ results, files, pairIndex }: Props) {
  const [activeView, setActiveView] = useState<'overview' | 'matches' | 'issues'>('overview')

  const totalRecords = results.matched.length + results.unmatched.actReports.length + results.unmatched.insurance.length
  const matchPercentage = Math.round(results.summary.matchPercentage)

  return (
    <div style={{ 
      background: 'white',
      borderRadius: '8px',
      padding: '24px',
      margin: '20px 0',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '16px',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Результаты сопоставления{pairIndex !== undefined ? ` (Пара ${pairIndex + 1})` : ''}
        </h2>
        <p style={{
          color: '#6b7280',
          margin: '0'
        }}>
          {files.insurance} ↔ {files.actReport}
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0ea5e9' }}>
            {results.matched.length}
          </div>
          <div style={{ color: '#0369a1', fontWeight: '500' }}>Совпадений</div>
        </div>

        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
            {results.unmatched.actReports.length + results.unmatched.insurance.length}
          </div>
          <div style={{ color: '#dc2626', fontWeight: '500' }}>Не сопоставлено</div>
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '2px solid #22c55e',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>
            {matchPercentage}%
          </div>
          <div style={{ color: '#16a34a', fontWeight: '500' }}>Точность</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          gap: '8px'
        }}>
          {[
            { id: 'overview' as const, label: 'Обзор' },
            { id: 'matches' as const, label: `Совпадения (${results.matched.length})` },
            { id: 'issues' as const, label: `Проблемы (${results.unmatched.actReports.length + results.unmatched.insurance.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeView === tab.id ? '#3b82f6' : 'transparent',
                color: activeView === tab.id ? 'white' : '#6b7280',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontWeight: activeView === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active view */}
      <div>
        {activeView === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {/* Summary Stats */}
            <div>
              <h3 style={{ color: '#1f2937', marginBottom: '12px' }}>Статистика сопоставления</h3>
              <ul style={{ 
                listStyle: 'none', 
                padding: '0', 
                background: '#f9fafb', 
                borderRadius: '6px',
                padding: '16px'
              }}>
                <li style={{ marginBottom: '6px' }}>Найдено {results.matched.length} совпадений</li>
                <li style={{ marginBottom: '6px' }}>Всего записей: {totalRecords}</li>
                <li style={{ marginBottom: '6px' }}>Процент совпадений: {matchPercentage}%</li>
              </ul>
            </div>

            {/* Issues Summary */}
            {(results.unmatched.actReports.length > 0 || results.unmatched.insurance.length > 0) && (
              <div>
                <h3 style={{ color: '#dc2626', marginBottom: '12px' }}>Обнаруженные проблемы</h3>
                <ul style={{ 
                  listStyle: 'none', 
                  padding: '0', 
                  background: '#fef2f2', 
                  borderRadius: '6px',
                  padding: '16px'
                }}>
                  <li style={{ marginBottom: '6px' }}>{results.unmatched.actReports.length} записей не найдено в акт-отчете</li>
                  <li style={{ marginBottom: '6px' }}>{results.unmatched.insurance.length} записей не найдено в страховках</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeView === 'matches' && results.matched.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0' }}>Найденные совпадения</h3>
              <button
                onClick={() => exportClaudeResults(results, { filename: `reconciliation_results_pair_${(pairIndex || 0) + 1}.xlsx` })}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                📊 Экспорт в Excel
              </button>
            </div>

            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID Акта</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Дата</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Сумма Акта</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Полис</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Страх. Сумма</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Уверенность</th>
                  </tr>
                </thead>
                <tbody>
                  {results.matched.slice(0, 20).map((match, idx) => (
                    <tr key={idx} style={{
                      borderBottom: idx < Math.min(19, results.matched.length - 1) ? '1px solid #e5e7eb' : 'none',
                      background: idx % 2 === 0 ? '#f9fafb' : 'white'
                    }}>
                      <td style={{ padding: '12px' }}>{match.actReport.id}</td>
                      <td style={{ padding: '12px' }}>{match.actReport.date}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {new Intl.NumberFormat('ru-RU', { 
                          style: 'currency', 
                          currency: 'RUB' 
                        }).format(match.actReport.amount)}
                      </td>
                      <td style={{ padding: '12px' }}>{match.insurance.policyNumber}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {new Intl.NumberFormat('ru-RU', { 
                          style: 'currency', 
                          currency: 'RUB' 
                        }).format(match.insurance.insuredAmount)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          background: match.confidence > 0.8 ? '#dcfce7' : '#fef3c7',
                          color: match.confidence > 0.8 ? '#166534' : '#92400e',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {Math.round(match.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {results.matched.length > 20 && (
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '6px',
                padding: '12px',
                marginTop: '12px',
                textAlign: 'center',
                color: '#0369a1'
              }}>
                Показаны первые 20 из {results.matched.length} совпадений. Полный список в Excel отчёте.
              </div>
            )}
          </div>
        )}

        {activeView === 'issues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {results.unmatched.actReports.length > 0 && (
              <div>
                <h3 style={{ 
                  color: '#dc2626', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  Не найдено в акт-отчете ({results.unmatched.actReports.length})
                </h3>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {results.unmatched.actReports.slice(0, 10).map((item, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      borderBottom: idx < Math.min(9, results.unmatched.actReports.length - 1) ? '1px solid #fca5a5' : 'none',
                      fontSize: '14px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#dc2626' }}>{item.id}</div>
                      <div style={{ color: '#991b1b' }}>{item.description} - {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(item.amount)}</div>
                    </div>
                  ))}
                  {results.unmatched.actReports.length > 10 && (
                    <div style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontStyle: 'italic',
                      color: '#dc2626'
                    }}>
                      ... и ещё {results.unmatched.actReports.length - 10} записей
                    </div>
                  )}
                </div>
              </div>
            )}

            {results.unmatched.insurance.length > 0 && (
              <div>
                <h3 style={{ 
                  color: '#dc2626', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  Не найдено в страховках ({results.unmatched.insurance.length})
                </h3>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {results.unmatched.insurance.slice(0, 10).map((item, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      borderBottom: idx < Math.min(9, results.unmatched.insurance.length - 1) ? '1px solid #fca5a5' : 'none',
                      fontSize: '14px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#dc2626' }}>{item.policyNumber}</div>
                      <div style={{ color: '#991b1b' }}>Страховая сумма: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(item.insuredAmount)}</div>
                    </div>
                  ))}
                  {results.unmatched.insurance.length > 10 && (
                    <div style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontStyle: 'italic',
                      color: '#dc2626'
                    }}>
                      ... и ещё {results.unmatched.insurance.length - 10} записей
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Button */}
      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <button
          onClick={() => exportClaudeResults(results, { 
            filename: `reconciliation_results${pairIndex !== undefined ? `_pair_${pairIndex + 1}` : ''}.xlsx` 
          })}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
        >
          📊 Скачать полный отчёт Excel
        </button>
      </div>
    </div>
  )
}