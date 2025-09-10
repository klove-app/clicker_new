import { useState } from 'react'
import FileUpload from './FileUpload'
import FileDisplay from './FileDisplay'
import { readExcel } from '../lib/xlsx'
import { parseActReport, parseInsurance, performClaudeReconciliation } from '../lib/claude-parser'
import type { ReconciliationResult } from '../lib/claude-parser'
import ResultsVisualization from './ResultsVisualization'

type Props = {
  onComplete?: (results: ReconciliationResult, files: { file1: File; file2: File }) => void
  onBack?: () => void
}

type FileInfo = {
  name: string
  size: number
  type: string
  lastModified: number
  file: File
  stats?: {
    rows: number
    columns: number
    sheets: number
    preview: any[]
  }
}

type Step = 'upload' | 'analyze' | 'match' | 'results'

export default function StepByStepReconcile({ onComplete, onBack }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ReconciliationResult | null>(null)

  const handleFilesSelected = async (files: File[]) => {
    setProcessing(true)
    
    try {
      const fileInfos: FileInfo[] = []
      
      for (const file of files) {
        const excelData = await readExcel(file)
        const totalRows = excelData.reduce((sum, sheet) => sum + sheet.data.length, 0)
        const totalColumns = Math.max(...excelData.map(sheet => sheet.headers.length))
        
        fileInfos.push({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file,
          stats: {
            rows: totalRows,
            columns: totalColumns,
            sheets: excelData.length,
            preview: excelData[0]?.data.slice(0, 3) || []
          }
        })
      }
      
      setUploadedFiles(prev => [...prev, ...fileInfos])
      if (uploadedFiles.length + fileInfos.length >= 2) {
        setCurrentStep('analyze')
      }
    } catch (error) {
      console.error('Ошибка анализа файлов:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    if (uploadedFiles.length <= 2) {
      setCurrentStep('upload')
    }
  }

  const handleStartMatching = async () => {
    if (uploadedFiles.length < 2) return
    
    setProcessing(true)
    setCurrentStep('match')
    
    try {
      const file1Data = await readExcel(uploadedFiles[0].file)
      const file2Data = await readExcel(uploadedFiles[1].file)
      
      const actReports = await parseActReport(file1Data[0].data)
      const insurance = await parseInsurance(file2Data[0].data)
      
      const reconciliationResults = await performClaudeReconciliation(actReports, insurance)
      
      setResults(reconciliationResults)
      setCurrentStep('results')
      
      if (onComplete) {
        onComplete(reconciliationResults, {
          file1: uploadedFiles[0].file,
          file2: uploadedFiles[1].file
        })
      }
    } catch (error) {
      console.error('Ошибка сопоставления:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return 'Загрузка файлов'
      case 'analyze': return 'Анализ файлов'
      case 'match': return 'Сопоставление'
      case 'results': return 'Результаты'
      default: return 'Сверка данных'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'upload': return 'Загрузите файлы для сопоставления'
      case 'analyze': return 'Проверьте структуру и содержимое файлов'
      case 'match': return 'Выполняется сопоставление данных...'
      case 'results': return 'Результаты сопоставления готовы'
      default: return ''
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '8px 12px',
                marginRight: '16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6c757d'
              }}
            >
              ← Назад
            </button>
          )}
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#212529',
            margin: '0'
          }}>
            {getStepTitle()}
          </h1>
        </div>
        <p style={{
          fontSize: '16px',
          color: '#6c757d',
          margin: '0'
        }}>
          {getStepDescription()}
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '40px',
        padding: '0 20px'
      }}>
        {[
          { key: 'upload', label: 'Загрузка', number: 1 },
          { key: 'analyze', label: 'Анализ', number: 2 },
          { key: 'match', label: 'Сопоставление', number: 3 },
          { key: 'results', label: 'Результаты', number: 4 }
        ].map((step, index) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: currentStep === step.key ? '#0d6efd' : 
                         ['upload', 'analyze', 'match', 'results'].indexOf(currentStep) > index ? '#198754' : '#e9ecef',
              color: currentStep === step.key || ['upload', 'analyze', 'match', 'results'].indexOf(currentStep) > index ? 'white' : '#6c757d',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {['upload', 'analyze', 'match', 'results'].indexOf(currentStep) > index ? '✓' : step.number}
            </div>
            <div style={{
              marginLeft: '12px',
              fontSize: '14px',
              fontWeight: currentStep === step.key ? '600' : '400',
              color: currentStep === step.key ? '#0d6efd' : '#6c757d'
            }}>
              {step.label}
            </div>
            {index < 3 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: ['upload', 'analyze', 'match', 'results'].indexOf(currentStep) > index ? '#198754' : '#e9ecef',
                margin: '0 20px'
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div>
        {currentStep === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              title="Загрузите файлы для сверки"
              subtitle="Поддерживаются Excel (.xlsx, .xls) и CSV файлы"
              maxFiles={10}
              multiple={true}
            />
            
            {uploadedFiles.length > 0 && (
              <FileDisplay
                files={uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type, lastModified: f.lastModified }))}
                onRemoveFile={handleRemoveFile}
                title="Загруженные файлы"
                subtitle={`${uploadedFiles.length} файл${uploadedFiles.length > 1 ? (uploadedFiles.length > 4 ? 'ов' : 'а') : ''} готов${uploadedFiles.length > 1 ? 'ы' : ''} к анализу`}
                showActions={true}
              />
            )}
          </div>
        )}

        {currentStep === 'analyze' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e9ecef',
                background: '#f8f9fa'
              }}>
                <h3 style={{
                  margin: '0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#212529'
                }}>
                  Анализ файлов
                </h3>
              </div>
              
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          background: '#e9ecef',
                          color: '#495057',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          fontSize: '10px',
                          fontWeight: '600',
                          marginRight: '8px'
                        }}>
                          {file.name.split('.').pop()?.toUpperCase()}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#212529',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {file.name}
                        </div>
                      </div>
                      
                      {file.stats && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '12px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#0d6efd' }}>
                              {file.stats.rows}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6c757d' }}>строк</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#198754' }}>
                              {file.stats.columns}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6c757d' }}>столбцов</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#fd7e14' }}>
                              {file.stats.sheets}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6c757d' }}>листов</div>
                          </div>
                        </div>
                      )}
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d'
                      }}>
                        Размер: {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  marginTop: '24px',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={handleStartMatching}
                    disabled={uploadedFiles.length < 2}
                    style={{
                      background: uploadedFiles.length >= 2 ? '#0d6efd' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: uploadedFiles.length >= 2 ? 'pointer' : 'not-allowed',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    Начать сопоставление
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'match' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              border: '4px solid #e9ecef',
              borderTop: '4px solid #0d6efd',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '24px'
            }} />
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#212529',
              marginBottom: '8px'
            }}>
              Выполняется сопоставление
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6c757d',
              textAlign: 'center'
            }}>
              Анализируем данные и ищем совпадения...
            </p>
          </div>
        )}

        {currentStep === 'results' && results && (
          <ResultsVisualization
            results={results}
            files={{
              insurance: uploadedFiles[0]?.name || 'Файл 1',
              actReport: uploadedFiles[1]?.name || 'Файл 2'
            }}
          />
        )}
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
