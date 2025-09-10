import { useState } from 'react'
import FileUpload from './FileUpload'
import FileDisplay from './FileDisplay'
import { readExcel } from '../lib/xlsx'
import { parseActReport, parseInsurance, performClaudeReconciliation } from '../lib/claude-parser'
import type { ReconciliationResult } from '../lib/claude-parser'
import { analyzeFileWithAI_Enhanced, suggestFilePairs, type FileAnalysis, type FilePairSuggestion } from '../lib/file-matcher'
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
  analysis?: FileAnalysis
}

type Step = 'upload' | 'analyze' | 'match' | 'results'

type FilePair = {
  file1: FileInfo
  file2: FileInfo
  id: string
}

export default function StepByStepReconcile({ onComplete, onBack }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([])
  const [filePairs, setFilePairs] = useState<FilePair[]>([])
  const [pairSuggestions, setPairSuggestions] = useState<FilePairSuggestion[]>([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ReconciliationResult | null>(null)

  const handleFilesSelected = async (files: File[]) => {
    setProcessing(true)
    
    try {
      const fileInfos: FileInfo[] = []
      
      for (const file of files) {
        const excelData = await readExcel(file)
        const totalRows = excelData.reduce((sum, sheet) => sum + sheet.actualRowCount, 0)
        const totalColumns = Math.max(...excelData.map(sheet => sheet.actualColumnCount))
        
        // Анализируем файл через ИИ для умного сопоставления
        const analysis = await analyzeFileWithAI_Enhanced(file.name, excelData)
        
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
          },
          analysis
        })
      }
      
      const newFiles = [...uploadedFiles, ...fileInfos]
      setUploadedFiles(newFiles)
      
      // Автоматически генерируем предложения пар
      if (newFiles.length >= 2) {
        const analyses = newFiles.map(f => f.analysis).filter(Boolean) as FileAnalysis[]
        const suggestions = suggestFilePairs(analyses)
        setPairSuggestions(suggestions)
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
    // Удаляем пары, которые содержат этот файл
    setFilePairs(prev => prev.filter(pair => 
      pair.file1 !== uploadedFiles[index] && pair.file2 !== uploadedFiles[index]
    ))
    if (uploadedFiles.length <= 2) {
      setCurrentStep('upload')
    }
  }

  const handleCreatePair = (file1Index: number, file2Index: number) => {
    const file1 = uploadedFiles[file1Index]
    const file2 = uploadedFiles[file2Index]
    
    const newPair: FilePair = {
      file1,
      file2,
      id: `${file1.name}_${file2.name}_${Date.now()}`
    }
    
    setFilePairs(prev => [...prev, newPair])
  }

  const handleRemovePair = (pairId: string) => {
    setFilePairs(prev => prev.filter(pair => pair.id !== pairId))
  }

  const handleAcceptSuggestion = (suggestion: FilePairSuggestion) => {
    const file1 = uploadedFiles.find(f => f.analysis?.fileName === suggestion.file1.fileName)
    const file2 = uploadedFiles.find(f => f.analysis?.fileName === suggestion.file2.fileName)
    
    if (file1 && file2) {
      const newPair: FilePair = {
        file1,
        file2,
        id: `${file1.name}_${file2.name}_${Date.now()}`
      }
      
      setFilePairs(prev => [...prev, newPair])
      // Удаляем принятое предложение
      setPairSuggestions(prev => prev.filter(s => s !== suggestion))
    }
  }

  const handleStartMatching = async () => {
    if (filePairs.length === 0) return
    
    setProcessing(true)
    setCurrentStep('match')
    
    try {
      // Пока обрабатываем только первую пару для простоты
      // В будущем можно добавить обработку всех пар
      const firstPair = filePairs[0]
      
      const file1Data = await readExcel(firstPair.file1.file)
      const file2Data = await readExcel(firstPair.file2.file)
      
      const actReports = await parseActReport(file1Data[0].data)
      const insurance = await parseInsurance(file2Data[0].data)
      
      const reconciliationResults = await performClaudeReconciliation(actReports, insurance)
      
      setResults(reconciliationResults)
      setCurrentStep('results')
      
      if (onComplete) {
        onComplete(reconciliationResults, {
          file1: firstPair.file1.file,
          file2: firstPair.file2.file
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
            {/* Анализ файлов */}
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
                      padding: '16px',
                      position: 'relative'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
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
                        
                        <button
                          onClick={() => handleRemoveFile(index)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            color: '#dc3545',
                            cursor: 'pointer'
                          }}
                        >
                          Удалить
                        </button>
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

                      {/* Информация об анализе файла */}
                      {file.analysis && (
                        <div style={{
                          background: '#f8f9fa',
                          borderRadius: '6px',
                          padding: '8px',
                          marginBottom: '8px',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              background: file.analysis.fileType === 'act' ? '#d1ecf1' : 
                                         file.analysis.fileType === 'export' ? '#d4edda' : '#f8d7da',
                              color: file.analysis.fileType === 'act' ? '#0c5460' : 
                                     file.analysis.fileType === 'export' ? '#155724' : '#721c24',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              {file.analysis.fileType === 'act' ? 'АКТ-ОТЧЕТ' : 
                               file.analysis.fileType === 'export' ? 'ВЫГРУЗКА' : 'НЕОПРЕДЕЛЕН'}
                            </span>
                            {file.analysis.month && (
                              <span style={{
                                background: '#e7e3ff',
                                color: '#5a4fcf',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}>
                                {file.analysis.month.toUpperCase()}
                              </span>
                            )}
                            {file.analysis.group && (
                              <span style={{
                                background: '#fff3cd',
                                color: '#856404',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}>
                                {file.analysis.group}
                              </span>
                            )}
                          </div>
                          {file.analysis.keywords.length > 0 && (
                            <div style={{ color: '#6c757d' }}>
                              Ключевые слова: {file.analysis.keywords.slice(0, 3).join(', ')}
                              {file.analysis.keywords.length > 3 && '...'}
                            </div>
                          )}
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
              </div>
            </div>

            {/* Умные предложения пар */}
            {pairSuggestions.length > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #e9ecef',
                  background: '#f0f8ff'
                }}>
                  <h3 style={{
                    margin: '0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529'
                  }}>
                    🤖 Умные предложения пар
                  </h3>
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '14px',
                    color: '#6c757d'
                  }}>
                    На основе анализа содержимого и названий файлов
                  </p>
                </div>
                
                <div style={{ padding: '20px 24px' }}>
                  {pairSuggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} style={{
                      border: `2px solid ${suggestion.confidence === 'high' ? '#28a745' : 
                                            suggestion.confidence === 'medium' ? '#ffc107' : '#dc3545'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                      background: suggestion.confidence === 'high' ? '#f8fff9' : 
                                  suggestion.confidence === 'medium' ? '#fffef7' : '#fff5f5'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flex: 1
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#212529'
                          }}>
                            {suggestion.file1.fileName}
                          </div>
                          <div style={{ color: '#0d6efd' }}>↔</div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#212529'
                          }}>
                            {suggestion.file2.fileName}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            background: suggestion.confidence === 'high' ? '#d4edda' : 
                                        suggestion.confidence === 'medium' ? '#fff3cd' : '#f8d7da',
                            color: suggestion.confidence === 'high' ? '#155724' : 
                                   suggestion.confidence === 'medium' ? '#856404' : '#721c24',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {Math.round(suggestion.score * 100)}%
                          </span>
                          
                          <button
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            style={{
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            Принять
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {suggestion.reasons.map((reason, i) => (
                          <span key={i} style={{
                            background: '#e9ecef',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {pairSuggestions.length > 3 && (
                    <div style={{
                      textAlign: 'center',
                      color: '#6c757d',
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      ... и еще {pairSuggestions.length - 3} предложений
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ручное создание пар */}
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
                  Ручное сопоставление
                </h3>
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '14px',
                  color: '#6c757d'
                }}>
                  Создайте пары файлов вручную
                </p>
              </div>
              
              <div style={{ padding: '24px' }}>
                {uploadedFiles.length >= 2 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <select 
                        id="file1Select"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Выберите первый файл</option>
                        {uploadedFiles.map((file, index) => (
                          <option key={index} value={index}>
                            {file.name} ({file.stats?.rows} строк)
                          </option>
                        ))}
                      </select>
                      
                      <div style={{ color: '#6c757d' }}>↔</div>
                      
                      <select 
                        id="file2Select"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Выберите второй файл</option>
                        {uploadedFiles.map((file, index) => (
                          <option key={index} value={index}>
                            {file.name} ({file.stats?.rows} строк)
                          </option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => {
                          const file1Select = document.getElementById('file1Select') as HTMLSelectElement
                          const file2Select = document.getElementById('file2Select') as HTMLSelectElement
                          const file1Index = parseInt(file1Select.value)
                          const file2Index = parseInt(file2Select.value)
                          
                          if (!isNaN(file1Index) && !isNaN(file2Index) && file1Index !== file2Index) {
                            handleCreatePair(file1Index, file2Index)
                            file1Select.value = ''
                            file2Select.value = ''
                          }
                        }}
                        style={{
                          background: '#0d6efd',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Создать пару
                      </button>
                    </div>
                  </div>
                )}

                {/* Список созданных пар */}
                {filePairs.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '16px', marginBottom: '12px', color: '#212529' }}>
                      Созданные пары ({filePairs.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filePairs.map((pair) => (
                        <div key={pair.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '14px', color: '#212529' }}>
                              <strong>{pair.file1.name}</strong> ({pair.file1.stats?.rows} строк)
                            </div>
                            <div style={{ color: '#0d6efd' }}>↔</div>
                            <div style={{ fontSize: '14px', color: '#212529' }}>
                              <strong>{pair.file2.name}</strong> ({pair.file2.stats?.rows} строк)
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemovePair(pair.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #dc3545',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              color: '#dc3545',
                              cursor: 'pointer'
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div style={{
                  marginTop: '24px',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={handleStartMatching}
                    disabled={filePairs.length === 0}
                    style={{
                      background: filePairs.length > 0 ? '#0d6efd' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: filePairs.length > 0 ? 'pointer' : 'not-allowed',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    Начать сопоставление ({filePairs.length} пар)
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
