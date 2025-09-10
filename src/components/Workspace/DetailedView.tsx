import { useState } from 'react'
import { type DetailedViewData } from '../../types/workspace'
import { exportClaudeResults } from '../../lib/claude-excel-export'

type Props = {
  data: DetailedViewData
  onBack: () => void
}

export default function DetailedView({ data, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'issues'>('overview')
  const { record, fullResults } = data

  const tabs = [
    { id: 'overview' as const, label: '📊 Обзор', icon: '📊' },
    { id: 'matches' as const, label: `✅ Совпадения (${record.results.matches})`, icon: '✅' },
    { id: 'issues' as const, label: `❌ Проблемы (${record.results.notFoundInAct + record.results.formulaErrors})`, icon: '❌' }
  ]

  return (
    <div style={{ padding: '24px', width: '100%', maxWidth: 'none' }}>
      {/* Заголовок с навигацией */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}
          >
            ← Назад к истории
          </button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Детальный просмотр сверки
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="modern-button"
            onClick={() => {
              if (fullResults) {
                exportClaudeResults(
                  fullResults,
                  {
                    filename: `${record.files.insurance.name}_${record.files.actReport.name}_detailed.xlsx`
                  }
                )
              }
            }}
          >
            📊 Скачать Excel
          </button>
        </div>
      </div>

      {/* Информация о сверке */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px', color: '#374151' }}>
              📁 Файлы сверки
            </h3>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                📊 Выгрузка по страховкам:
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {record.files.insurance.name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#ea580c' }}>
                📋 Акт-отчет:
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {record.files.actReport.name}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px', color: '#374151' }}>
              ⏰ Информация о сверке
            </h3>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>Дата:</strong> {new Date(record.timestamp).toLocaleString('ru')}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>Статус:</strong> 
              <span style={{ 
                color: record.status === 'completed' ? '#16a34a' : '#ef4444',
                marginLeft: '8px'
              }}>
                {record.status === 'completed' ? '✅ Завершено' : '❌ Ошибка'}
              </span>
            </div>
            <div style={{ fontSize: '14px' }}>
              <strong>ID сверки:</strong> {record.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </div>

      {/* Основная статистика */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#16a34a' }}>
            {record.results.matches}
          </div>
          <div className="stat-label">Найдено совпадений</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#ef4444' }}>
            {record.results.notFoundInAct}
          </div>
          <div className="stat-label">Не найдено в акте</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#f59e0b' }}>
            {record.results.formulaErrors}
          </div>
          <div className="stat-label">Ошибки формул</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#8b5cf6' }}>
            {record.results.matchPercentage}%
          </div>
          <div className="stat-label">Процент совпадений</div>
        </div>
      </div>

      {/* Табы */}
      <div className="card">
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e5e7eb', 
          marginBottom: '24px' 
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === tab.id ? '#f8fafc' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #667eea' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === tab.id ? '#667eea' : '#6b7280',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Содержимое табов */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: '#374151' }}>
              📈 Сводка результатов
            </h3>
            
            {record.aiAnalysis && (
              <div style={{
                padding: '16px',
                background: '#f0f9ff',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                  🤖 AI Анализ:
                </div>
                <div style={{ fontSize: '14px', color: '#1e40af' }}>
                  {record.aiAnalysis}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: '#16a34a' }}>
                  ✅ Успешные операции
                </h4>
                <ul style={{ fontSize: '14px', color: '#6b7280' }}>
                  <li>Найдено {record.results.matches} точных совпадений по суммам</li>
                  <li>Процент совпадения: {record.results.matchPercentage}%</li>
                  <li>Проверка формул выполнена</li>
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: '#ef4444' }}>
                  ❌ Выявленные проблемы
                </h4>
                <ul style={{ fontSize: '14px', color: '#6b7280' }}>
                  <li>{record.results.notFoundInAct} записей не найдено в акт-отчете</li>
                  <li>{record.results.notFoundInInsurance} записей не найдено в страховках</li>
                  <li>{record.results.formulaErrors} ошибок в расчете формул</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: '#374151' }}>
              ✅ Найденные совпадения ({record.results.matches})
            </h3>
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
              Детальная таблица совпадений будет доступна в Excel отчете
            </p>
          </div>
        )}

        {activeTab === 'issues' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: '#374151' }}>
              ❌ Выявленные проблемы
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fca5a5'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: '#dc2626' }}>
                  Не найдено в акт-отчете
                </h4>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626' }}>
                  {record.results.notFoundInAct}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  записей из страховок
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#fff7ed',
                borderRadius: '12px',
                border: '1px solid #fed7aa'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: '#ea580c' }}>
                  Ошибки в формулах
                </h4>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#ea580c' }}>
                  {record.results.formulaErrors}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  неправильных расчетов
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
