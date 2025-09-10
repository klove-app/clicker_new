import { useState, useRef } from 'react'
import { analyzeFileType, createFilePairs, type FileInfo, type FilePair } from '../lib/bulk-processor'
import { analyzeFileContent, matchFilesByContent } from '../lib/content-analyzer'

type Props = {
  onPairsReady: (pairs: FilePair[]) => void
}

export default function BulkUpload({ onPairsReady }: Props) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [pairs, setPairs] = useState<FilePair[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (newFiles: FileList) => {
    const fileInfos = Array.from(newFiles)
      .filter(file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))
      .map(analyzeFileType)
    
    const allFiles = [...files, ...fileInfos]
    setFiles(allFiles)
    
    // Если достаточно файлов для анализа содержимого, делаем умное сопоставление
    const insuranceFiles = allFiles.filter(f => f.type === 'insurance')
    const actReportFiles = allFiles.filter(f => f.type === 'act-report')
    
    if (insuranceFiles.length > 0 && actReportFiles.length > 0) {
      setIsAnalyzing(true)
      
      try {
        console.log('🧠 Запуск умного анализа содержимого...')
        
        // Анализируем содержимое файлов
        const [insuranceContents, actReportContents] = await Promise.all([
          Promise.all(insuranceFiles.map(f => analyzeFileContent(f.file))),
          Promise.all(actReportFiles.map(f => analyzeFileContent(f.file)))
        ])
        
        // Создаем умные пары на основе содержимого
        const contentMatches = matchFilesByContent(insuranceContents, actReportContents)
        
        const smartPairs: FilePair[] = contentMatches.map(match => ({
          insurance: insuranceFiles.find(f => f.file.name === match.insurance.fileName)!,
          actReport: actReportFiles.find(f => f.file.name === match.actReport.fileName)!,
          confidence: match.confidence,
          reason: `Умное сопоставление: ${match.reasons.join(', ')}`
        }))
        
        setPairs(smartPairs)
        onPairsReady(smartPairs)
        
      } catch (error) {
        console.error('❌ Ошибка при анализе содержимого, используем базовый алгоритм:', error)
        
        // Fallback к базовому алгоритму
        const detectedPairs = createFilePairs(allFiles)
        setPairs(detectedPairs)
        onPairsReady(detectedPairs)
      }
      
      setIsAnalyzing(false)
    } else {
      // Базовый алгоритм если недостаточно файлов
      const detectedPairs = createFilePairs(allFiles)
      setPairs(detectedPairs)
      onPairsReady(detectedPairs)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    const newPairs = createFilePairs(newFiles)
    setPairs(newPairs)
    onPairsReady(newPairs)
  }

  return (
    <div className="card stack" style={{ width: '100%', maxWidth: 'none' }}>
      <h2>📁 Массовая загрузка файлов</h2>
      <p style={{ color: '#666', textAlign: 'center' }}>
        Перетащите несколько Excel файлов или выберите их - система автоматически найдет пары для сверки
      </p>

      {/* Зона перетаскивания */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
      >
        {/* Иконка как в референсе */}
        <div style={{ fontSize: '48px', marginBottom: '16px', color: '#9ca3af' }}>
          {isDragging ? '📂' : '☁️'}
        </div>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
          {isDragging ? 'Отпустите файлы здесь' : 'Выберите файлы или перетащите их сюда'}
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          xlsx, xls - до 50MB
        </div>
        
        {!isDragging && (
          <button 
            className="modern-button secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ marginTop: '8px' }}
          >
            Обзор файлов
          </button>
        )}
        {isAnalyzing && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f0f9ff', 
            borderRadius: '6px',
            color: '#0369a1'
          }}>
            🧠 Анализирую содержимое файлов для умного сопоставления...
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* Список загруженных файлов */}
      {files.length > 0 && (
        <div>
          <h3>📋 Загруженные файлы ({files.length})</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {files.map((fileInfo, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: fileInfo.type === 'insurance' ? '#f0f9ff' : 
                           fileInfo.type === 'act-report' ? '#fff7ed' : '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '4px',
                border: '1px solid #d1d5db'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {fileInfo.type === 'insurance' ? '📊' : 
                     fileInfo.type === 'act-report' ? '📋' : '❓'} 
                    {fileInfo.file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {fileInfo.type === 'insurance' ? 'Выгрузка по страховкам' :
                     fileInfo.type === 'act-report' ? 'Акт-отчет' : 'Неопределенный тип'}
                    {fileInfo.metadata?.month && ` • ${fileInfo.metadata.month}`}
                    {fileInfo.metadata?.year && ` ${fileInfo.metadata.year}`}
                    • Уверенность: {Math.round(fileInfo.confidence * 100)}%
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Найденные пары */}
      {pairs.length > 0 && (
        <div>
          <h3>🔗 Найденные пары для сверки ({pairs.length})</h3>
          {pairs.map((pair, idx) => (
            <div key={idx} style={{
              padding: '12px',
              background: '#f0fdf4',
              borderRadius: '6px',
              marginBottom: '8px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    Пара #{idx + 1} (уверенность: {Math.round(pair.confidence * 100)}%)
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    📊 {pair.insurance.file.name}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    📋 {pair.actReport.file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    💡 {pair.reason}
                  </div>
                </div>
                <div className={`tag ${
                  pair.confidence > 0.8 ? 'success' : 
                  pair.confidence > 0.5 ? 'info' :
                  pair.confidence > 0.3 ? 'warning' : 'error'
                }`}>
                  {pair.confidence > 0.8 ? '🎯 Отличная' : 
                   pair.confidence > 0.5 ? '✅ Высокая' :
                   pair.confidence > 0.3 ? '⚠️ Средняя' : '❌ Низкая'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
