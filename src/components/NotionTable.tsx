import { useState } from 'react'

type TableColumn = {
  key: string
  label: string
  width?: string
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'status'
  sortable?: boolean
}

type Props = {
  data: any[]
  title: string
  subtitle?: string
  maxRows?: number
}

export default function NotionTable({ data, title, subtitle, maxRows = 50 }: Props) {
  const [sortBy, setSortBy] = useState<string>('upsell_id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(0)

  const columns: TableColumn[] = [
    { key: 'upsell_id', label: 'ID полиса', width: '120px', type: 'text', sortable: true },
    { key: 'act_name', label: 'Клиент', width: '200px', type: 'text', sortable: true },
    { key: 'amount_b2b2c', label: 'Сумма B2B2C', width: '120px', type: 'currency', sortable: true },
    { key: 'act_sum', label: 'Сумма акта', width: '120px', type: 'currency', sortable: true },
    { key: 'insurance_commission', label: 'Комиссия факт', width: '120px', type: 'currency', sortable: true },
    { key: 'expected_commission', label: 'Комиссия ожид', width: '120px', type: 'currency', sortable: true },
    { key: 'commission_match', label: 'Статус комиссии', width: '100px', type: 'status', sortable: true },
    { key: 'sell_match', label: 'Статус продажи', width: '100px', type: 'status', sortable: true }
  ]

  // Сортировка данных
  const sortedData = [...data].sort((a, b) => {
    const aVal = (a as any)[sortBy]
    const bVal = (b as any)[sortBy]
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    const aStr = String(aVal || '').toLowerCase()
    const bStr = String(bVal || '').toLowerCase()
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr)
    } else {
      return bStr.localeCompare(aStr)
    }
  })

  const pageSize = maxRows
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  const formatValue = (value: any, type: string) => {
    switch (type) {
      case 'currency':
        return typeof value === 'number' ? `${value.toFixed(2)} ₽` : value
      case 'percentage':
        return typeof value === 'number' ? `${value}%` : value
      case 'status':
        return value ? '✅ OK' : '❌ Ошибка'
      default:
        return String(value || '')
    }
  }

  const getStatusColor = (value: any, type: string) => {
    if (type === 'status') {
      return value ? '#16a34a' : '#dc2626'
    }
    return '#374151'
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e1e5e9',
      overflow: 'hidden'
    }}>
      {/* Заголовок таблицы */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e1e5e9',
        background: '#fafbfc'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0,
          marginBottom: subtitle ? '4px' : 0
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Таблица */}
      <div style={{ overflow: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ background: '#fafbfc' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#6b7280',
                    borderBottom: '1px solid #e1e5e9',
                    cursor: column.sortable ? 'pointer' : 'default',
                    width: column.width,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      <span style={{ fontSize: '10px' }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #f1f3f4',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {columns.map((column) => {
                  const value = (row as any)[column.key]
                  return (
                    <td
                      key={column.key}
                      style={{
                        padding: '12px 16px',
                        color: getStatusColor(value, column.type || 'text'),
                        fontWeight: column.type === 'currency' ? '500' : '400',
                        maxWidth: column.width,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: column.key === 'act_name' ? 'nowrap' : 'normal'
                      }}
                    >
                      {formatValue(value, column.type || 'text')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация в стиле Notion */}
      {totalPages > 1 && (
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e1e5e9',
          background: '#fafbfc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Показано {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, sortedData.length)} из {sortedData.length}
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              style={{
                padding: '6px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                background: 'white',
                color: currentPage === 0 ? '#d1d5db' : '#374151',
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ← Назад
            </button>
            
            <div style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {currentPage + 1} / {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              style={{
                padding: '6px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                background: 'white',
                color: currentPage === totalPages - 1 ? '#d1d5db' : '#374151',
                cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Вперед →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

