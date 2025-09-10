import { useState, useEffect } from 'react'
import type { ClaudeExecutiveSummary } from '../lib/claude-api'

type Props = {
  summary: ClaudeExecutiveSummary | null
  loading?: boolean
}

export default function ExecutiveSummary({ summary, loading }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return { bg: '#d4edda', color: '#155724', label: 'Соответствует' }
      case 'issues': return { bg: '#fff3cd', color: '#856404', label: 'Есть замечания' }
      case 'critical': return { bg: '#f8d7da', color: '#721c24', label: 'Критические проблемы' }
      default: return { bg: '#e9ecef', color: '#495057', label: 'Неопределено' }
    }
  }

  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #0d6efd',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <h3 style={{ color: '#212529', marginBottom: '8px' }}>
          Создание управленческой сводки...
        </h3>
        <p style={{ color: '#6c757d', margin: '0' }}>
          ИИ анализирует результаты и готовит отчет
        </p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        padding: '32px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ color: '#6c757d', marginBottom: '8px' }}>
          Управленческая сводка недоступна
        </h3>
        <p style={{ color: '#6c757d', margin: '0' }}>
          ИИ-анализ не был выполнен
        </p>
      </div>
    )
  }

  const compliance = getComplianceColor(summary.compliance.status)

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: '700'
        }}>
          📋 Управленческая сводка
        </h2>
        <p style={{
          margin: '0',
          fontSize: '14px',
          opacity: 0.9
        }}>
          Аналитический отчет от Claude Sonnet 4
        </p>
      </div>

      {/* Overview */}
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f3f4' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#212529',
          marginBottom: '12px'
        }}>
          Общий обзор
        </h3>
        <p style={{
          fontSize: '15px',
          lineHeight: '1.6',
          color: '#495057',
          margin: '0'
        }}>
          {summary.overview}
        </p>
      </div>

      {/* Compliance Status */}
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f3f4' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#212529',
            margin: '0'
          }}>
            Статус соответствия
          </h3>
          <span style={{
            background: compliance.bg,
            color: compliance.color,
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            {compliance.label}
          </span>
        </div>
        {summary.compliance.notes.length > 0 && (
          <ul style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#495057'
          }}>
            {summary.compliance.notes.map((note, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>{note}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Collapsible Sections */}
      <div>
        {/* Key Findings */}
        <div style={{ borderBottom: '1px solid #f1f3f4' }}>
          <button
            onClick={() => toggleSection('findings')}
            style={{
              width: '100%',
              padding: '20px 24px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#212529',
              margin: '0'
            }}>
              🔍 Ключевые находки ({summary.keyFindings.length})
            </h3>
            <span style={{
              transform: expandedSections.has('findings') ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </button>
          {expandedSections.has('findings') && (
            <div style={{ padding: '0 24px 20px' }}>
              <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                {summary.keyFindings.map((finding, index) => (
                  <li key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Data Quality */}
        <div style={{ borderBottom: '1px solid #f1f3f4' }}>
          <button
            onClick={() => toggleSection('quality')}
            style={{
              width: '100%',
              padding: '20px 24px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#212529',
              margin: '0'
            }}>
              📊 Качество данных
            </h3>
            <span style={{
              transform: expandedSections.has('quality') ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </button>
          {expandedSections.has('quality') && (
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: summary.dataQualityAssessment.completeness > 0.8 ? '#198754' : '#ffc107'
                  }}>
                    {Math.round(summary.dataQualityAssessment.completeness * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Полнота</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    {summary.dataQualityAssessment.accuracy}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Точность</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    {summary.dataQualityAssessment.consistency}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Согласованность</div>
                </div>
              </div>
              {summary.dataQualityAssessment.issues.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', color: '#dc3545', marginBottom: '8px' }}>
                    Обнаруженные проблемы:
                  </h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                    {summary.dataQualityAssessment.issues.map((issue, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Business Insights */}
        <div style={{ borderBottom: '1px solid #f1f3f4' }}>
          <button
            onClick={() => toggleSection('insights')}
            style={{
              width: '100%',
              padding: '20px 24px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#212529',
              margin: '0'
            }}>
              💡 Бизнес-аналитика
            </h3>
            <span style={{
              transform: expandedSections.has('insights') ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </button>
          {expandedSections.has('insights') && (
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {summary.businessInsights.recommendations.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '14px', color: '#198754', marginBottom: '8px' }}>
                      Рекомендации:
                    </h4>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                      {summary.businessInsights.recommendations.map((rec, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {summary.businessInsights.anomalies.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '14px', color: '#ffc107', marginBottom: '8px' }}>
                      Выявленные аномалии:
                    </h4>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                      {summary.businessInsights.anomalies.map((anomaly, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Items */}
        <div>
          <button
            onClick={() => toggleSection('actions')}
            style={{
              width: '100%',
              padding: '20px 24px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#212529',
              margin: '0'
            }}>
              ✅ План действий
            </h3>
            <span style={{
              transform: expandedSections.has('actions') ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </button>
          {expandedSections.has('actions') && (
            <div style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {summary.actionItems.immediate.length > 0 && (
                  <div>
                    <h4 style={{ 
                      fontSize: '14px', 
                      color: '#dc3545', 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      🚨 Срочные действия:
                    </h4>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                      {summary.actionItems.immediate.map((action, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {summary.actionItems.followUp.length > 0 && (
                  <div>
                    <h4 style={{ 
                      fontSize: '14px', 
                      color: '#ffc107', 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      📋 Последующие действия:
                    </h4>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                      {summary.actionItems.followUp.map((action, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {summary.actionItems.longTerm.length > 0 && (
                  <div>
                    <h4 style={{ 
                      fontSize: '14px', 
                      color: '#198754', 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      🎯 Долгосрочные цели:
                    </h4>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#495057' }}>
                      {summary.actionItems.longTerm.map((action, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        background: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        Отчет сгенерирован ИИ • Claude Sonnet 4 • {new Date().toLocaleString('ru-RU')}
      </div>

      {/* CSS для анимации */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
