import { type WorkspaceView } from '../../types/workspace'

type Props = {
  currentView: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
  reconciliationCount: number
}

export default function Sidebar({ currentView, onViewChange, reconciliationCount }: Props) {
  const menuItems = [
    { id: 'dashboard' as WorkspaceView, label: 'Dashboard', badge: null },
    { id: 'reconcile-single' as WorkspaceView, label: 'Одна пара', badge: null },
    { id: 'reconcile-bulk' as WorkspaceView, label: 'Массовая сверка', badge: null },
    { id: 'history' as WorkspaceView, label: 'История сверок', badge: reconciliationCount > 0 ? reconciliationCount : null },
    { id: 'settings' as WorkspaceView, label: 'Настройки', badge: null }
  ]

  return (
    <div style={{
      width: '240px',
      background: '#f7f8fa',
      padding: '24px 16px',
      borderRight: '1px solid #e1e5e9',
      height: '100vh',
      overflow: 'auto',
      flexShrink: 0
    }}>
      {/* Логотип в стиле Notion */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e1e5e9'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '4px'
        }}>
          ETG Сверка
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Автоматическая сверка файлов
        </div>
      </div>

      {/* Меню */}
      <nav>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '2px',
              border: 'none',
              borderRadius: '6px',
              background: currentView === item.id ? '#2563eb' : 'transparent',
              color: currentView === item.id ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              if (currentView !== item.id) {
                e.currentTarget.style.background = '#f1f3f4'
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== item.id) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {item.label}
            </div>
            {item.badge && (
              <span style={{
                background: currentView === item.id ? 'rgba(255, 255, 255, 0.2)' : '#2563eb',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: '600'
              }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Статистика в стиле Notion */}
      <div style={{
        marginTop: '24px',
        padding: '12px',
        background: '#f1f3f4',
        borderRadius: '6px',
        border: '1px solid #e1e5e9'
      }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Локальное хранилище
        </div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
          {reconciliationCount} сверок сохранено
        </div>
      </div>
    </div>
  )
}
