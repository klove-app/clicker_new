import type { ExcelData } from './xlsx'
import { analyzeFileWithAI, suggestPairsWithAI, type ClaudeFileAnalysis, type ClaudePairingSuggestion } from './claude-api'

export interface FileAnalysis {
  fileName: string
  fileType: 'act' | 'export' | 'unknown'
  month: string | null
  group: string | null
  contentSample: string[]
  keywords: string[]
  rowCount: number
  columnCount: number
}

export interface FilePairSuggestion {
  file1: FileAnalysis
  file2: FileAnalysis
  score: number
  reasons: string[]
  confidence: 'high' | 'medium' | 'low'
}

// Ключевые слова для определения типа файла
const ACT_KEYWORDS = ['акт', 'отчет', 'отчёт', 'услуг', 'оказани']
const EXPORT_KEYWORDS = ['выгрузка', 'страховк', 'экспорт', 'данных']

// Месяцы для анализа
const MONTHS = {
  'январ': 'январь', 'янв': 'январь',
  'феврал': 'февраль', 'фев': 'февраль',
  'март': 'март', 'мар': 'март',
  'апрел': 'апрель', 'апр': 'апрель',
  'май': 'май', 'мая': 'май',
  'июн': 'июнь', 'июня': 'июнь',
  'июл': 'июль', 'июля': 'июль',
  'август': 'август', 'авг': 'август',
  'сентябр': 'сентябрь', 'сен': 'сентябрь',
  'октябр': 'октябрь', 'окт': 'октябрь',
  'ноябр': 'ноябрь', 'ноя': 'ноябрь',
  'декабр': 'декабрь', 'дек': 'декабрь'
}

export async function analyzeFileWithAI_Enhanced(fileName: string, excelData: ExcelData[]): Promise<FileAnalysis> {
  try {
    // Пробуем анализ через ИИ
    const headers = excelData[0]?.headers || []
    const sampleRows = excelData[0]?.data.slice(0, 5) || []
    const fileSize = fileName.length // Приблизительный размер
    
    const aiAnalysis = await analyzeFileWithAI(fileName, headers, sampleRows, fileSize)
    
    if (aiAnalysis) {
      // Конвертируем результат ИИ в наш формат
      return {
        fileName,
        fileType: aiAnalysis.fileType === 'act_report' ? 'act' : 
                  aiAnalysis.fileType === 'insurance_export' ? 'export' : 'unknown',
        month: aiAnalysis.period.month || null,
        group: aiAnalysis.organization || null,
        contentSample: aiAnalysis.dataStructure.keyFields.slice(0, 10),
        keywords: aiAnalysis.dataStructure.keyFields,
        rowCount: excelData.reduce((sum, sheet) => sum + sheet.actualRowCount, 0),
        columnCount: Math.max(...excelData.map(sheet => sheet.actualColumnCount))
      }
    }
  } catch (error) {
    console.warn('Ошибка ИИ-анализа, используем fallback:', error)
  }
  
  // Fallback к простому анализу
  return analyzeFile(fileName, excelData)
}

export function analyzeFile(fileName: string, excelData: ExcelData[]): FileAnalysis {
  const lowerFileName = fileName.toLowerCase()
  
  // Определение типа файла
  let fileType: 'act' | 'export' | 'unknown' = 'unknown'
  
  if (ACT_KEYWORDS.some(keyword => lowerFileName.includes(keyword))) {
    fileType = 'act'
  } else if (EXPORT_KEYWORDS.some(keyword => lowerFileName.includes(keyword))) {
    fileType = 'export'
  }
  
  // Извлечение месяца из названия файла
  let month: string | null = null
  for (const [key, value] of Object.entries(MONTHS)) {
    if (lowerFileName.includes(key)) {
      month = value
      break
    }
  }
  
  // Извлечение группы/организации (упрощенно - ищем заглавные слова)
  const groupMatches = fileName.match(/([А-ЯЁ]{3,})/g)
  const group = groupMatches ? groupMatches[0] : null
  
  // Анализ содержимого
  const contentSample: string[] = []
  const keywords: string[] = []
  
  if (excelData.length > 0) {
    const firstSheet = excelData[0]
    
    // Собираем образцы содержимого из первых строк
    firstSheet.data.slice(0, 5).forEach(row => {
      row.forEach(cell => {
        if (typeof cell === 'string' && cell.length > 2) {
          contentSample.push(cell)
          
          // Извлекаем ключевые слова (слова длиннее 3 символов)
          const words = cell.toLowerCase().match(/[а-яё]{4,}/g)
          if (words) {
            keywords.push(...words)
          }
        }
      })
    })
  }
  
  return {
    fileName,
    fileType,
    month,
    group,
    contentSample: contentSample.slice(0, 10), // Ограничиваем количество
    keywords: [...new Set(keywords)].slice(0, 20), // Уникальные ключевые слова
    rowCount: excelData.reduce((sum, sheet) => sum + sheet.actualRowCount, 0),
    columnCount: Math.max(...excelData.map(sheet => sheet.actualColumnCount))
  }
}

export function calculateContentSimilarity(analysis1: FileAnalysis, analysis2: FileAnalysis): number {
  const keywords1 = new Set(analysis1.keywords)
  const keywords2 = new Set(analysis2.keywords)
  
  // Пересечение ключевых слов
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)))
  const union = new Set([...keywords1, ...keywords2])
  
  // Коэффициент Жаккара
  const jaccardSimilarity = intersection.size / union.size
  
  // Дополнительная проверка по образцам содержимого
  const content1 = analysis1.contentSample.join(' ').toLowerCase()
  const content2 = analysis2.contentSample.join(' ').toLowerCase()
  
  let contentMatches = 0
  const words1 = content1.split(/\s+/)
  const words2 = content2.split(/\s+/)
  
  words1.forEach(word => {
    if (word.length > 3 && words2.some(w => w.includes(word) || word.includes(w))) {
      contentMatches++
    }
  })
  
  const contentSimilarity = contentMatches / Math.max(words1.length, words2.length)
  
  // Комбинированная оценка
  return (jaccardSimilarity * 0.7 + contentSimilarity * 0.3)
}

export function suggestFilePairs(analyses: FileAnalysis[]): FilePairSuggestion[] {
  const suggestions: FilePairSuggestion[] = []
  
  // Разделяем файлы по типам
  const actFiles = analyses.filter(a => a.fileType === 'act')
  const exportFiles = analyses.filter(a => a.fileType === 'export')
  const unknownFiles = analyses.filter(a => a.fileType === 'unknown')
  
  // Сопоставляем акты с выгрузками
  actFiles.forEach(actFile => {
    exportFiles.forEach(exportFile => {
      const suggestion = createPairSuggestion(actFile, exportFile)
      if (suggestion.score > 0.3) { // Минимальный порог
        suggestions.push(suggestion)
      }
    })
  })
  
  // Если есть неопознанные файлы, пробуем их сопоставить
  if (unknownFiles.length > 0) {
    for (let i = 0; i < unknownFiles.length; i++) {
      for (let j = i + 1; j < unknownFiles.length; j++) {
        const suggestion = createPairSuggestion(unknownFiles[i], unknownFiles[j])
        if (suggestion.score > 0.4) { // Более высокий порог для неопознанных
          suggestions.push(suggestion)
        }
      }
    }
  }
  
  // Сортируем по убыванию рейтинга
  return suggestions.sort((a, b) => b.score - a.score)
}

function createPairSuggestion(file1: FileAnalysis, file2: FileAnalysis): FilePairSuggestion {
  let score = 0
  const reasons: string[] = []
  
  // 1. Проверка типов файлов (акт + выгрузка = хорошо)
  if ((file1.fileType === 'act' && file2.fileType === 'export') ||
      (file1.fileType === 'export' && file2.fileType === 'act')) {
    score += 0.3
    reasons.push('Подходящие типы файлов (акт + выгрузка)')
  }
  
  // 2. Совпадение месяца
  if (file1.month && file2.month && file1.month === file2.month) {
    score += 0.25
    reasons.push(`Одинаковый месяц: ${file1.month}`)
  }
  
  // 3. Совпадение группы/организации
  if (file1.group && file2.group && file1.group === file2.group) {
    score += 0.2
    reasons.push(`Одинаковая группа: ${file1.group}`)
  }
  
  // 4. Схожесть содержимого
  const contentSimilarity = calculateContentSimilarity(file1, file2)
  if (contentSimilarity > 0.5) {
    score += contentSimilarity * 0.25
    reasons.push(`Схожесть содержимого: ${Math.round(contentSimilarity * 100)}%`)
  }
  
  // 5. Схожесть размеров файлов (не должны сильно отличаться)
  const sizeDifference = Math.abs(file1.rowCount - file2.rowCount) / Math.max(file1.rowCount, file2.rowCount)
  if (sizeDifference < 0.5) {
    score += 0.1
    reasons.push('Схожие размеры файлов')
  }
  
  // Определение уверенности
  let confidence: 'high' | 'medium' | 'low'
  if (score > 0.8) confidence = 'high'
  else if (score > 0.6) confidence = 'medium'
  else confidence = 'low'
  
  return {
    file1,
    file2,
    score,
    reasons,
    confidence
  }
}

export function extractDateFromFilename(filename: string): Date | null {
  // Ищем даты в различных форматах
  const datePatterns = [
    /(\d{1,2})[-._](\d{1,2})[-._](\d{4})/,  // DD.MM.YYYY
    /(\d{4})[-._](\d{1,2})[-._](\d{1,2})/,  // YYYY.MM.DD
    /(\d{1,2})[-._](\d{1,2})[-._](\d{2})/   // DD.MM.YY
  ]
  
  for (const pattern of datePatterns) {
    const match = filename.match(pattern)
    if (match) {
      const [, part1, part2, part3] = match
      
      // Пробуем разные интерпретации
      try {
        if (part3.length === 4) { // Год в конце
          return new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))
        } else if (part1.length === 4) { // Год в начале
          return new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3))
        } else { // Двузначный год
          const year = parseInt(part3) + (parseInt(part3) > 50 ? 1900 : 2000)
          return new Date(year, parseInt(part2) - 1, parseInt(part1))
        }
      } catch {
        continue
      }
    }
  }
  
  return null
}
