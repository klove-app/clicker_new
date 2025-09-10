import { useRef, useState, DragEvent, ChangeEvent } from 'react'

type Props = {
  onFilesSelected: (files: File[]) => void
  acceptedTypes?: string[]
  maxFiles?: number
  title?: string
  subtitle?: string
  multiple?: boolean
}

export default function FileUpload({
  onFilesSelected,
  acceptedTypes = ['.xlsx', '.xls', '.csv'],
  maxFiles = 10,
  title = "Загрузить файлы",
  subtitle = "Перетащите файлы сюда или нажмите для выбора",
  multiple = true
}: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => {
      const newCount = prev - 1
      if (newCount === 0) {
        setIsDragging(false)
      }
      return newCount
    })
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragCounter(0)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    
    // Очищаем input для возможности повторного выбора того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFiles = (files: File[]) => {
    // Фильтруем по типу файлов
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      return acceptedTypes.some(type => type.toLowerCase() === extension)
    })

    // Ограничиваем количество файлов
    const limitedFiles = validFiles.slice(0, maxFiles)

    if (validFiles.length !== files.length) {
      console.warn(`Некоторые файлы были отклонены. Поддерживаемые форматы: ${acceptedTypes.join(', ')}`)
    }

    if (limitedFiles.length > 0) {
      onFilesSelected(limitedFiles)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: isDragging 
          ? '2px solid #0d6efd' 
          : '2px dashed #dee2e6',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        background: isDragging 
          ? '#f0f8ff' 
          : '#fafbfc',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Animation */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, transparent 30%, rgba(13, 110, 253, 0.1) 50%, transparent 70%)',
          animation: 'shimmer 2s infinite'
        }} />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          color: isDragging ? '#0d6efd' : '#6c757d'
        }}>
          {isDragging ? '↑' : '+'}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: isDragging ? '#0d6efd' : '#212529',
          marginBottom: '8px',
          transition: 'color 0.3s ease'
        }}>
          {isDragging ? 'Отпустите файлы для загрузки' : title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '14px',
          color: '#6c757d',
          marginBottom: '20px'
        }}>
          {isDragging ? 'Файлы будут загружены автоматически' : subtitle}
        </div>

        {/* Supported formats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px'
        }}>
          {acceptedTypes.map((type, index) => (
            <span
              key={index}
              style={{
                background: '#e9ecef',
                color: '#495057',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500',
                textTransform: 'uppercase'
              }}
            >
              {type}
            </span>
          ))}
        </div>

        {/* Upload button */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: isDragging ? '#0d6efd' : 'white',
          color: isDragging ? 'white' : '#0d6efd',
          border: `2px solid ${isDragging ? '#0d6efd' : '#0d6efd'}`,
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}>
          Выбрать файлы
        </div>

        {/* Limits info */}
        <div style={{
          fontSize: '12px',
          color: '#adb5bd',
          marginTop: '16px'
        }}>
          Максимум {maxFiles} файл{maxFiles > 1 ? (maxFiles > 4 ? 'ов' : 'а') : ''}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        aria-label="Выбор файлов для загрузки"
      />

      {/* CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
