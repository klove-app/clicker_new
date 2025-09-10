// Массовая обработка файлов и автоматическое определение пар

export type FileInfo = {
  file: File
  type: 'insurance' | 'act-report' | 'unknown'
  confidence: number
  metadata?: {
    month?: string
    year?: string
    period?: string
    contractNumber?: string
  }
}

export type FilePair = {
  insurance: FileInfo
  actReport: FileInfo
  confidence: number
  reason: string
}

// Продвинутый анализ типа файла по названию с извлечением метаданных
export function analyzeFileType(file: File): FileInfo {
  const name = file.name.toLowerCase()
  
  let type: 'insurance' | 'act-report' | 'unknown' = 'unknown'
  let confidence = 0
  const metadata: FileInfo['metadata'] = {}

  // Определение типа по ключевым словам в названии
  if (name.includes('выгрузка') || name.includes('страхов') || name.includes('insurance')) {
    type = 'insurance'
    confidence += 0.7
  }
  
  if (name.includes('акт') || name.includes('отчет') || name.includes('отчёт') || name.includes('act')) {
    type = 'act-report'
    confidence += 0.7
  }

  // Расширенное извлечение периода из названия
  const monthMap: Record<string, string> = {
    'янв': 'январь', 'фев': 'февраль', 'мар': 'март', 'апр': 'апрель',
    'май': 'май', 'июн': 'июнь', 'июл': 'июль', 'авг': 'август',
    'сен': 'сентябрь', 'окт': 'октябрь', 'ноя': 'ноябрь', 'дек': 'декабрь',
    'january': 'январь', 'february': 'февраль', 'march': 'март', 'april': 'апрель',
    'may': 'май', 'june': 'июнь', 'july': 'июль', 'august': 'август',
    'september': 'сентябрь', 'october': 'октябрь', 'november': 'ноябрь', 'december': 'декабрь'
  }

  // Ищем месяцы в разных форматах
  for (const [pattern, normalized] of Object.entries(monthMap)) {
    if (name.includes(pattern)) {
      metadata.month = normalized
      confidence += 0.15
      break
    }
  }

  // Ищем числовые месяцы (01, 02, ... 12)
  const numericMonth = name.match(/[-_\s](\d{2})[-_\s]/)?.[1]
  if (numericMonth && parseInt(numericMonth) >= 1 && parseInt(numericMonth) <= 12) {
    const months = ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 
                   'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
    metadata.month = months[parseInt(numericMonth)]
    confidence += 0.15
  }

  // Ищем год
  const yearMatches = name.match(/20\d{2}/)
  if (yearMatches) {
    metadata.year = yearMatches[0]
    confidence += 0.1
  }

  // Извлечение дат из названия (DD.MM.YYYY, DD-MM-YYYY)
  const dateMatches = name.match(/(\d{1,2})[-.\s](\d{1,2})[-.\s](20\d{2})/)
  if (dateMatches) {
    const [, day, month, year] = dateMatches
    metadata.period = `${day}.${month}.${year}`
    metadata.year = year
    confidence += 0.2
  }

  // Поиск номеров документов/договоров
  const contractMatches = name.match(/(25-\d{4}|№\s*\d+|договор\s*\d+)/i)
  if (contractMatches) {
    metadata.contractNumber = contractMatches[1]
    confidence += 0.1
  }

  // Дополнительные индикаторы для страховок
  if (name.includes('b2b') || name.includes('commission') || name.includes('полис') || name.includes('policy')) {
    if (type === 'unknown') type = 'insurance'
    confidence += 0.2
  }

  // Дополнительные индикаторы для актов
  if (name.includes('агент') || name.includes('услуг') || name.includes('вознаграждение') || name.includes('оказан')) {
    if (type === 'unknown') type = 'act-report'
    confidence += 0.2
  }

  // Анализ структуры названия файла
  const nameParts = file.name.split(/[-_\s\.]+/).filter(part => part.length > 2)
  for (const part of nameParts) {
    const partLower = part.toLowerCase()
    if (partLower.includes('страх') || partLower.includes('insur')) {
      if (type === 'unknown') type = 'insurance'
      confidence += 0.1
    }
    if (partLower.includes('акт') || partLower.includes('отчет')) {
      if (type === 'unknown') type = 'act-report'  
      confidence += 0.1
    }
  }

  console.log(`📁 Продвинутый анализ файла "${file.name}":`, { 
    type, 
    confidence: Math.round(confidence * 100) / 100, 
    metadata,
    nameParts 
  })

  return { file, type, confidence: Math.min(confidence, 1), metadata }
}

// Умное создание пар файлов 1:1 (без дублирования)
export function createFilePairs(files: FileInfo[]): FilePair[] {
  const insuranceFiles = files.filter(f => f.type === 'insurance')
  const actReportFiles = files.filter(f => f.type === 'act-report')
  
  console.log('📊 Классификация файлов:', {
    insurance: insuranceFiles.length,
    actReports: actReportFiles.length,
    unknown: files.filter(f => f.type === 'unknown').length
  })

  const pairs: FilePair[] = []
  const usedInsurance = new Set<number>()
  const usedActReports = new Set<number>()

  // Стратегия 1: Точное совпадение по периоду (1:1)
  for (let i = 0; i < insuranceFiles.length; i++) {
    if (usedInsurance.has(i)) continue
    
    const ins = insuranceFiles[i]
    let bestMatch: { index: number; confidence: number; reason: string } | null = null

    for (let j = 0; j < actReportFiles.length; j++) {
      if (usedActReports.has(j)) continue
      
      const act = actReportFiles[j]
      
      // Проверяем совпадение по периоду
      if (ins.metadata?.month && act.metadata?.month && 
          ins.metadata.month === act.metadata.month &&
          ins.metadata?.year === act.metadata?.year) {
        bestMatch = {
          index: j,
          confidence: 0.9,
          reason: `Совпадение по периоду: ${ins.metadata.month} ${ins.metadata.year}`
        }
        break // Берем первое точное совпадение
      }
    }

    if (bestMatch) {
      pairs.push({
        insurance: ins,
        actReport: actReportFiles[bestMatch.index],
        confidence: bestMatch.confidence,
        reason: bestMatch.reason
      })
      usedInsurance.add(i)
      usedActReports.add(bestMatch.index)
    }
  }

  // Стратегия 2: По дате создания для оставшихся файлов
  for (let i = 0; i < insuranceFiles.length; i++) {
    if (usedInsurance.has(i)) continue
    
    const ins = insuranceFiles[i]
    let bestMatch: { index: number; confidence: number; reason: string } | null = null

    for (let j = 0; j < actReportFiles.length; j++) {
      if (usedActReports.has(j)) continue
      
      const act = actReportFiles[j]
      const timeDiff = Math.abs(ins.file.lastModified - act.file.lastModified)
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
      
      if (daysDiff < 30) {
        const confidence = Math.max(0.3, 0.8 - daysDiff / 30)
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            index: j,
            confidence,
            reason: `Близкие даты создания (разница ${Math.round(daysDiff)} дней)`
          }
        }
      }
    }

    if (bestMatch) {
      pairs.push({
        insurance: ins,
        actReport: actReportFiles[bestMatch.index],
        confidence: bestMatch.confidence,
        reason: bestMatch.reason
      })
      usedInsurance.add(i)
      usedActReports.add(bestMatch.index)
    }
  }

  // Стратегия 3: Простое сопоставление оставшихся
  for (let i = 0; i < insuranceFiles.length; i++) {
    if (usedInsurance.has(i)) continue
    
    for (let j = 0; j < actReportFiles.length; j++) {
      if (usedActReports.has(j)) continue
      
      pairs.push({
        insurance: insuranceFiles[i],
        actReport: actReportFiles[j],
        confidence: 0.2,
        reason: 'Автоматическое сопоставление оставшихся файлов'
      })
      usedInsurance.add(i)
      usedActReports.add(j)
      break // Только одна пара на файл
    }
  }

  console.log('🔗 Оптимальные пары файлов (1:1):', pairs.map(p => ({
    insurance: p.insurance.file.name,
    actReport: p.actReport.file.name,
    confidence: p.confidence,
    reason: p.reason
  })))

  return pairs
}

// Обработка очереди пар файлов
export async function processBulkFiles(
  pairs: FilePair[],
  onProgress: (current: number, total: number, currentPair: FilePair) => void,
  onPairComplete: (pair: FilePair, result: any) => void,
  onError: (pair: FilePair, error: string) => void
) {
  console.log(`🚀 Начинаем массовую обработку ${pairs.length} пар файлов...`)

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    
    try {
      onProgress(i + 1, pairs.length, pair)
      
      // Здесь будет вызов существующей логики сверки
      // Пока заглушка
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockResult = {
        matches: Math.floor(Math.random() * 70),
        notFoundInAct: Math.floor(Math.random() * 10),
        confidence: pair.confidence
      }
      
      onPairComplete(pair, mockResult)
      
    } catch (error) {
      onError(pair, String(error))
    }
  }
  
  console.log('✅ Массовая обработка завершена!')
}

// Анализ сложных случаев для Claude API
export function identifyComplexCases(results: any[]): {
  case: string
  description: string
  data: any
  priority: 'high' | 'medium' | 'low'
}[] {
  const complexCases = []

  // Случай 1: Много несопоставленных записей
  for (const result of results) {
    const unmatchedRatio = result.notFoundInAct / (result.matches + result.notFoundInAct)
    if (unmatchedRatio > 0.3) {
      complexCases.push({
        case: 'high_unmatched_ratio',
        description: `Высокий процент несопоставленных записей: ${Math.round(unmatchedRatio * 100)}%`,
        data: result,
        priority: 'high' as const
      })
    }
  }

  // Случай 2: Подозрительные суммы
  for (const result of results) {
    if (result.matches && result.matches.some((m: any) => m.amountDiff > 100)) {
      complexCases.push({
        case: 'large_amount_differences',
        description: 'Найдены большие расхождения в суммах',
        data: result,
        priority: 'medium' as const
      })
    }
  }

  // Случай 3: Много ошибок в формулах
  for (const result of results) {
    if (result.formulaErrors && result.formulaErrors.length > result.matches * 0.2) {
      complexCases.push({
        case: 'formula_errors',
        description: 'Много ошибок в формулах расчета комиссии',
        data: result,
        priority: 'medium' as const
      })
    }
  }

  return complexCases.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}
