// Анализ содержимого файлов для умного сопоставления

import { readExcel } from './xlsx'

export type FileContentInfo = {
  fileName: string
  recordCount: number
  dateRange: { start: Date | null; end: Date | null }
  amountRange: { min: number; max: number; avg: number }
  keyColumns: string[]
  sampleData: any[]
  contentSignature: string
}

// Анализ содержимого файла
export async function analyzeFileContent(file: File): Promise<FileContentInfo> {
  try {
    const sheets = await readExcel(file)
    const sheet = sheets[0] // Берем первый лист
    
    if (!sheet || sheet.rows.length === 0) {
      throw new Error('Пустой файл или нет данных')
    }

    console.log(`🔍 Анализ содержимого файла "${file.name}":`, {
      headers: sheet.headers,
      rowCount: sheet.rows.length
    })

    // Поиск колонок с датами
    const dateColumns = sheet.headers.filter(h => 
      h.toLowerCase().includes('date') || 
      h.toLowerCase().includes('дата') ||
      h.toLowerCase().includes('created') ||
      h.toLowerCase().includes('start') ||
      h.toLowerCase().includes('finish')
    )

    // Поиск колонок с суммами
    const amountColumns = sheet.headers.filter(h => 
      h.toLowerCase().includes('amount') || 
      h.toLowerCase().includes('сумма') ||
      h.toLowerCase().includes('премия') ||
      h.toLowerCase().includes('commission') ||
      h.toLowerCase().includes('sum')
    )

    // Анализ диапазона дат
    let dateRange = { start: null as Date | null, end: null as Date | null }
    if (dateColumns.length > 0) {
      const dates = sheet.rows
        .map(row => row[dateColumns[0]])
        .filter(date => date)
        .map(date => new Date(String(date)))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())
      
      if (dates.length > 0) {
        dateRange = { start: dates[0], end: dates[dates.length - 1] }
      }
    }

    // Анализ диапазона сумм
    let amountRange = { min: 0, max: 0, avg: 0 }
    if (amountColumns.length > 0) {
      const amounts = sheet.rows
        .map(row => Number(row[amountColumns[0]]) || 0)
        .filter(amount => amount > 0)
      
      if (amounts.length > 0) {
        amountRange = {
          min: Math.min(...amounts),
          max: Math.max(...amounts),
          avg: amounts.reduce((a, b) => a + b, 0) / amounts.length
        }
      }
    }

    // Создание "подписи" содержимого для сравнения
    const contentSignature = [
      sheet.headers.slice(0, 5).join('|'),
      `rows:${sheet.rows.length}`,
      `amounts:${amountRange.min}-${amountRange.max}`,
      dateRange.start ? `date:${dateRange.start.getFullYear()}-${dateRange.start.getMonth() + 1}` : ''
    ].filter(Boolean).join('::')

    const result: FileContentInfo = {
      fileName: file.name,
      recordCount: sheet.rows.length,
      dateRange,
      amountRange,
      keyColumns: [...dateColumns, ...amountColumns],
      sampleData: sheet.rows.slice(0, 3),
      contentSignature
    }

    console.log(`📊 Анализ содержимого "${file.name}":`, result)
    return result

  } catch (error) {
    console.error(`❌ Ошибка анализа содержимого "${file.name}":`, error)
    throw error
  }
}

// Умное сопоставление пар по содержимому
export function matchFilesByContent(
  insuranceContents: FileContentInfo[],
  actReportContents: FileContentInfo[]
): Array<{
  insurance: FileContentInfo
  actReport: FileContentInfo
  confidence: number
  reasons: string[]
}> {
  const matches: Array<{
    insurance: FileContentInfo
    actReport: FileContentInfo
    confidence: number
    reasons: string[]
  }> = []

  const usedInsurance = new Set<number>()
  const usedActReports = new Set<number>()

  // Анализируем все возможные пары и выбираем лучшие
  const allPossiblePairs: Array<{
    insIndex: number
    actIndex: number
    confidence: number
    reasons: string[]
  }> = []

  for (let i = 0; i < insuranceContents.length; i++) {
    for (let j = 0; j < actReportContents.length; j++) {
      const ins = insuranceContents[i]
      const act = actReportContents[j]
      
      let confidence = 0
      const reasons: string[] = []

      // 1. Сравнение по диапазону дат
      if (ins.dateRange.start && act.dateRange.start) {
        const monthDiff = Math.abs(
          (ins.dateRange.start.getFullYear() * 12 + ins.dateRange.start.getMonth()) -
          (act.dateRange.start.getFullYear() * 12 + act.dateRange.start.getMonth())
        )
        
        if (monthDiff === 0) {
          confidence += 0.4
          reasons.push('Точное совпадение периода')
        } else if (monthDiff <= 1) {
          confidence += 0.2
          reasons.push('Близкий период (±1 месяц)')
        }
      }

      // 2. Сравнение по количеству записей (УСИЛЕННАЯ ЛОГИКА)
      const recordRatio = Math.min(ins.recordCount, act.recordCount) / Math.max(ins.recordCount, act.recordCount)
      if (recordRatio > 0.8) {
        confidence += 0.4 // Увеличил с 0.2 до 0.4
        reasons.push(`Очень похожее количество записей (${ins.recordCount} vs ${act.recordCount})`)
      } else if (recordRatio > 0.6) {
        confidence += 0.3
        reasons.push(`Похожее количество записей (${ins.recordCount} vs ${act.recordCount})`)
      } else if (recordRatio > 0.4) {
        confidence += 0.1
        reasons.push(`Приблизительно похожее количество записей (${ins.recordCount} vs ${act.recordCount})`)
      }

      // 3. Сравнение по диапазону сумм
      if (ins.amountRange.avg > 0 && act.amountRange.avg > 0) {
        const amountRatio = Math.min(ins.amountRange.avg, act.amountRange.avg) / Math.max(ins.amountRange.avg, act.amountRange.avg)
        if (amountRatio > 0.5) {
          confidence += 0.2
          reasons.push(`Похожие суммы (${Math.round(ins.amountRange.avg)} vs ${Math.round(act.amountRange.avg)})`)
        }
      }

      // 4. Анализ названий файлов на схожесть (УСИЛЕННАЯ ЛОГИКА)
      const insName = ins.fileName.toLowerCase()
      const actName = act.fileName.toLowerCase()
      
      // Ищем общие ключевые слова
      const insWords = insName.split(/[-_\s\.]+/).filter(w => w.length > 2)
      const actWords = actName.split(/[-_\s\.]+/).filter(w => w.length > 2)
      const commonWords = insWords.filter(w => actWords.some((aw: string) => aw.includes(w) || w.includes(aw)))
      
      if (commonWords.length > 0) {
        // Если есть общие слова + похожее количество записей = высокая уверенность
        const nameBonus = recordRatio > 0.5 ? 0.4 : 0.2
        confidence += Math.min(nameBonus, commonWords.length * 0.1)
        reasons.push(`Общие слова в названии: ${commonWords.slice(0, 3).join(', ')}`)
      }

      // 5. Анализ номеров договоров/документов
      const insNumbers: string[] = insName.match(/\d{4,}/g) || []
      const actNumbers: string[] = actName.match(/\d{4,}/g) || []
      const commonNumbers = insNumbers.filter(n => actNumbers.includes(n))
      
      if (commonNumbers.length > 0) {
        confidence += 0.3
        reasons.push(`Общие номера: ${commonNumbers.join(', ')}`)
      }

      // БОНУС ЗА КОМБИНАЦИЮ ФАКТОРОВ
      if (recordRatio > 0.6 && commonWords.length > 0) {
        confidence += 0.3 // Дополнительный бонус за комбинацию
        reasons.push(`🎯 Высокое совпадение: количество записей + название`)
      }

      // Нормализация уверенности (максимум 95%)
      confidence = Math.min(confidence, 0.95)

      if (confidence > 0.1) { // Только если есть хоть какая-то связь
        allPossiblePairs.push({
          insIndex: i,
          actIndex: j,
          confidence,
          reasons
        })
      }
    }
  }

  // Сортируем по уверенности и выбираем лучшие пары без пересечений
  allPossiblePairs.sort((a, b) => b.confidence - a.confidence)

  for (const pair of allPossiblePairs) {
    if (!usedInsurance.has(pair.insIndex) && !usedActReports.has(pair.actIndex)) {
      matches.push({
        insurance: insuranceContents[pair.insIndex],
        actReport: actReportContents[pair.actIndex],
        confidence: pair.confidence,
        reasons: pair.reasons
      })
      
      usedInsurance.add(pair.insIndex)
      usedActReports.add(pair.actIndex)
    }
  }

  console.log('🧠 Умное сопоставление по содержимому:', matches.map(m => ({
    insurance: m.insurance.fileName,
    actReport: m.actReport.fileName,
    confidence: Math.round(m.confidence * 100) / 100,
    reasons: m.reasons
  })))

  return matches
}
