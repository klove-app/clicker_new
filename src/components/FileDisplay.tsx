import { useState } from 'react'

type FileInfo = {
  name: string
  size: number
  type: string
  lastModified: number
}

type Props = {
  files: FileInfo[]
  onRemoveFile: (index: number) => void
  onPreviewFile?: (index: number) => void
  onProcessFiles?: () => void
  title?: string
  subtitle?: string
  showActions?: boolean
  processing?: boolean
}

export default function FileDisplay({ 
  files, 
  onRemoveFile, 
  onPreviewFile, 
  onProcessFiles,
  title = "Загруженные файлы",
  subtitle,
  showActions = true,
  processing = false
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileExtension = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    return extension?.toUpperCase() || 'FILE'
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (files.length === 0) {
    return (
      <div style={{
        background: '#f8f9fa',
        border: '2px dashed #e9ecef',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        color: '#6c757d'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
        <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
          Файлы не загружены
        </div>
        <div style={{ fontSize: '14px' }}>
          Загрузите файлы для начала работы
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e9ecef',
        background: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#212529'
            }}>
              {title} ({files.length})
            </h3>
            {subtitle && (
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: '#6c757d'
              }}>
                {subtitle}
              </p>
            )}
          </div>
          
          {showActions && files.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {onProcessFiles && (
                <button
                  onClick={onProcessFiles}
                  disabled={processing}
                  style={{
                    background: processing ? '#6c757d' : '#0d6efd',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {processing ? (
                    <>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Обработка...
                    </>
                  ) : (
                    <>
                      Сопоставить
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      <div style={{ padding: '0' }}>
        {files.map((file, index) => (
          <div
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: index < files.length - 1 ? '1px solid #f1f3f4' : 'none',
              background: hoveredIndex === index ? '#f8f9fa' : 'white',
              transition: 'background-color 0.2s',
              cursor: 'pointer'
            }}
          >
            {/* File Extension Badge */}
            <div style={{
              background: '#e9ecef',
              color: '#495057',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: '600',
              marginRight: '16px',
              minWidth: '40px',
              textAlign: 'center'
            }}>
              {getFileExtension(file.name)}
            </div>

            {/* File Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '500',
                color: '#212529',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {file.name}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: '#6c757d'
              }}>
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{formatDate(file.lastModified)}</span>
              </div>
            </div>

            {/* File Actions */}
            {showActions && hoveredIndex === index && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: '16px'
              }}>
                {onPreviewFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreviewFile(index)
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      color: '#495057',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e9ecef'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    Просмотр
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFile(index)
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #dc3545',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#dc3545',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#dc3545'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#dc3545'
                  }}
                >
                  Удалить
                </button>
              </div>
            )}

            {/* Status Indicator */}
            <div style={{
              marginLeft: '16px',
              minWidth: '80px',
              textAlign: 'right'
            }}>
              <span style={{
                background: '#d1ecf1',
                color: '#0c5460',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500',
                textTransform: 'uppercase'
              }}>
                Готов
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with summary */}
      {files.length > 0 && (
        <div style={{
          padding: '16px 24px',
          background: '#f8f9fa',
          borderTop: '1px solid #e9ecef',
          fontSize: '13px',
          color: '#6c757d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            Всего файлов: {files.length}
          </span>
          <span>
            Общий размер: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
          </span>
        </div>
      )}

      {/* CSS для анимации загрузки */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
