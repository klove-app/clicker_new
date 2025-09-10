// Claude API интеграция для анализа файлов

export interface ClaudeConfig {
  apiKey: string
  model: string
  maxTokens?: number
}

export interface FileAnalysisPrompt {
  fileName: string
  headers: string[]
  sampleRows: any[][]
  fileSize: number
}

export interface ClaudeFileAnalysis {
  fileType: 'act_report' | 'insurance_export' | 'other'
  confidence: number
  period: {
    month?: string
    year?: number
    dateRange?: string
  }
  organization?: string
  dataStructure: {
    primaryColumns: string[]
    dataTypes: Record<string, string>
    keyFields: string[]
  }
  contentSummary: string
  recommendations: string[]
}

export interface ClaudePairingSuggestion {
  file1Name: string
  file2Name: string
  compatibility: number
  reasons: string[]
  confidence: 'high' | 'medium' | 'low'
  recommendedAction: string
}

export interface ClaudeExecutiveSummary {
  overview: string
  keyFindings: string[]
  dataQualityAssessment: {
    completeness: number
    accuracy: string
    consistency: string
    issues: string[]
  }
  reconciliationSummary: {
    totalMatches: number
    matchRate: number
    significantDiscrepancies: string[]
    riskAreas: string[]
  }
  businessInsights: {
    trends: string[]
    anomalies: string[]
    recommendations: string[]
  }
  actionItems: {
    immediate: string[]
    followUp: string[]
    longTerm: string[]
  }
  compliance: {
    status: 'compliant' | 'issues' | 'critical'
    notes: string[]
  }
}

const DEFAULT_CONFIG: Partial<ClaudeConfig> = {
  model: 'claude-sonnet-4-20250514', // Claude Sonnet 4 - самая новая модель
  maxTokens: 4000
}

class ClaudeAPI {
  private config: ClaudeConfig

  constructor(config: ClaudeConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async analyzeFile(prompt: FileAnalysisPrompt): Promise<ClaudeFileAnalysis> {
    const systemPrompt = `Ты - эксперт по анализу финансовых документов и страховых данных. 
Анализируй загруженные файлы Excel/CSV и определи:

1. ТИП ФАЙЛА:
   - act_report: акт-отчеты об оказании услуг
   - insurance_export: выгрузки по страховкам  
   - other: другие типы файлов

2. ПЕРИОД ДАННЫХ:
   - Месяц и год из названия файла или содержимого
   - Диапазон дат если есть

3. ОРГАНИЗАЦИЯ:
   - Название компании/группы из файла

4. СТРУКТУРА ДАННЫХ:
   - Основные столбцы с данными
   - Типы данных в столбцах
   - Ключевые поля для сопоставления

5. КРАТКОЕ ОПИСАНИЕ содержимого

Отвечай ТОЛЬКО в формате JSON без дополнительного текста.`

    const userPrompt = `Проанализируй файл:

НАЗВАНИЕ ФАЙЛА: ${prompt.fileName}
РАЗМЕР: ${prompt.fileSize} байт

ЗАГОЛОВКИ СТОЛБЦОВ:
${prompt.headers.join(' | ')}

ПРИМЕРЫ СТРОК (первые 3-5):
${prompt.sampleRows.map((row, i) => `Строка ${i + 1}: ${row.join(' | ')}`).join('\n')}

Верни анализ в JSON формате с полями:
- fileType: тип файла
- confidence: уверенность 0-1
- period: {month, year, dateRange}
- organization: название организации
- dataStructure: {primaryColumns, dataTypes, keyFields}
- contentSummary: краткое описание
- recommendations: рекомендации для сопоставления`

    try {
      // Обращаемся к Netlify Function вместо прямого API
      const response = await fetch('/.netlify/functions/claude-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: prompt.fileName,
          headers: prompt.headers,
          sampleRows: prompt.sampleRows,
          fileSize: prompt.fileSize
        })
      })

      if (!response.ok) {
        throw new Error(`Netlify Function error: ${response.status} ${response.statusText}`)
      }

      const analysis = await response.json()
      return analysis as ClaudeFileAnalysis

    } catch (error) {
      console.error('Ошибка анализа файла через Claude:', error)
      
      // Fallback к простому анализу
      return {
        fileType: 'other',
        confidence: 0.1,
        period: {},
        dataStructure: {
          primaryColumns: prompt.headers.slice(0, 5),
          dataTypes: {},
          keyFields: []
        },
        contentSummary: 'Ошибка анализа через ИИ',
        recommendations: ['Проверьте файл вручную']
      }
    }
  }

  async suggestPairs(analyses: ClaudeFileAnalysis[], fileNames: string[]): Promise<ClaudePairingSuggestion[]> {
    const systemPrompt = `Ты - эксперт по сопоставлению финансовых документов.
Анализируй файлы и предлагай оптимальные пары для сверки данных.

ПРАВИЛА СОПОСТАВЛЕНИЯ:
1. Акт-отчеты должны сопоставляться с выгрузками по страховкам
2. Период (месяц/год) должен совпадать или быть близким
3. Организация/группа должна совпадать
4. Содержимое должно иметь схожие ключевые поля
5. Размеры файлов должны быть сопоставимыми

Оценивай совместимость от 0 до 1, где:
- 0.8+ : высокая уверенность (рекомендуется)
- 0.6-0.8 : средняя уверенность (проверить)  
- <0.6 : низкая уверенность (не рекомендуется)

Отвечай ТОЛЬКО в формате JSON массива предложений.`

    const userPrompt = `Проанализируй файлы и предложи пары для сопоставления:

ФАЙЛЫ:
${analyses.map((analysis, i) => `
ФАЙЛ ${i + 1}: ${fileNames[i]}
- Тип: ${analysis.fileType}
- Период: ${JSON.stringify(analysis.period)}
- Организация: ${analysis.organization || 'не определена'}
- Ключевые поля: ${analysis.dataStructure.keyFields.join(', ')}
- Описание: ${analysis.contentSummary}
`).join('\n')}

Верни массив предложений в формате:
[{
  "file1Name": "имя первого файла",
  "file2Name": "имя второго файла", 
  "compatibility": число от 0 до 1,
  "reasons": ["причина 1", "причина 2"],
  "confidence": "high|medium|low",
  "recommendedAction": "рекомендация"
}]`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userPrompt
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.content[0]?.text

      if (!content) {
        return []
      }

      return JSON.parse(content) as ClaudePairingSuggestion[]

    } catch (error) {
      console.error('Ошибка получения предложений пар от Claude:', error)
      return []
    }
  }

  async generateExecutiveSummary(
    reconciliationResults: any,
    fileAnalyses: ClaudeFileAnalysis[],
    fileNames: string[]
  ): Promise<ClaudeExecutiveSummary> {
    const systemPrompt = `Ты - опытный финансовый аналитик и аудитор. 
Создай управленческую сводку по результатам сверки финансовых данных.

ТВОЯ ЗАДАЧА:
1. Проанализировать результаты сопоставления данных
2. Оценить качество и полноту данных
3. Выявить ключевые находки и риски
4. Дать практические рекомендации руководству
5. Определить следующие шаги

ФОРМАТ ОТВЕТА: JSON без дополнительного текста.

ФОКУС НА:
- Финансовые риски и возможности
- Качество процессов учета
- Соответствие требованиям
- Операционные улучшения`

    const userPrompt = `Проанализируй результаты сверки и создай управленческую сводку:

ФАЙЛЫ В СВЕРКЕ:
${fileNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

АНАЛИЗ ФАЙЛОВ:
${fileAnalyses.map((analysis, i) => `
Файл ${i + 1}: ${fileNames[i]}
- Тип: ${analysis.fileType}
- Период: ${JSON.stringify(analysis.period)}
- Организация: ${analysis.organization || 'не определена'}
- Структура: ${analysis.dataStructure.keyFields.join(', ')}
- Описание: ${analysis.contentSummary}
`).join('\n')}

РЕЗУЛЬТАТЫ СОПОСТАВЛЕНИЯ:
- Найдено совпадений: ${reconciliationResults.matched?.length || 0}
- Не сопоставлено актов: ${reconciliationResults.unmatched?.actReports?.length || 0}
- Не сопоставлено страховок: ${reconciliationResults.unmatched?.insurance?.length || 0}
- Процент совпадений: ${reconciliationResults.summary?.matchPercentage || 0}%

Верни управленческую сводку в JSON формате:
{
  "overview": "общий обзор ситуации",
  "keyFindings": ["ключевая находка 1", "ключевая находка 2"],
  "dataQualityAssessment": {
    "completeness": число от 0 до 1,
    "accuracy": "оценка точности",
    "consistency": "оценка согласованности", 
    "issues": ["проблема 1", "проблема 2"]
  },
  "reconciliationSummary": {
    "totalMatches": число,
    "matchRate": процент,
    "significantDiscrepancies": ["расхождение 1"],
    "riskAreas": ["зона риска 1"]
  },
  "businessInsights": {
    "trends": ["тренд 1"],
    "anomalies": ["аномалия 1"], 
    "recommendations": ["рекомендация 1"]
  },
  "actionItems": {
    "immediate": ["срочное действие 1"],
    "followUp": ["последующее действие 1"],
    "longTerm": ["долгосрочное действие 1"]
  },
  "compliance": {
    "status": "compliant|issues|critical",
    "notes": ["замечание 1"]
  }
}`

    try {
      // Обращаемся к Netlify Function для создания отчета
      const response = await fetch('/.netlify/functions/claude-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reconciliationResults,
          fileAnalyses,
          fileNames
        })
      })

      if (!response.ok) {
        throw new Error(`Netlify Function error: ${response.status}`)
      }

      const summary = await response.json()
      return summary as ClaudeExecutiveSummary

    } catch (error) {
      console.error('Ошибка создания управленческой сводки:', error)
      
      // Fallback отчет
      return {
        overview: 'Сверка данных выполнена. Подробный анализ недоступен.',
        keyFindings: ['Базовое сопоставление данных завершено'],
        dataQualityAssessment: {
          completeness: 0.8,
          accuracy: 'Требует проверки',
          consistency: 'Частичная',
          issues: ['ИИ-анализ недоступен']
        },
        reconciliationSummary: {
          totalMatches: reconciliationResults.matched?.length || 0,
          matchRate: reconciliationResults.summary?.matchPercentage || 0,
          significantDiscrepancies: [],
          riskAreas: ['Требуется ручная проверка']
        },
        businessInsights: {
          trends: [],
          anomalies: [],
          recommendations: ['Проверьте результаты вручную']
        },
        actionItems: {
          immediate: ['Просмотрите результаты сопоставления'],
          followUp: ['Проверьте несопоставленные записи'],
          longTerm: ['Настройте ИИ-анализ для лучших результатов']
        },
        compliance: {
          status: 'issues',
          notes: ['Анализ выполнен без ИИ-поддержки']
        }
      }
    }
  }
}

// Singleton instance
let claudeInstance: ClaudeAPI | null = null

export function initializeClaude(config: ClaudeConfig) {
  claudeInstance = new ClaudeAPI(config)
}

export function getClaudeInstance(): ClaudeAPI | null {
  return claudeInstance
}

// Вспомогательные функции
export async function analyzeFileWithAI(
  fileName: string,
  headers: string[],
  sampleRows: any[][],
  fileSize: number
): Promise<ClaudeFileAnalysis | null> {
  const claude = getClaudeInstance()
  if (!claude) {
    console.warn('Claude API не инициализирован')
    return null
  }

  return await claude.analyzeFile({
    fileName,
    headers,
    sampleRows,
    fileSize
  })
}

export async function suggestPairsWithAI(
  analyses: ClaudeFileAnalysis[],
  fileNames: string[]
): Promise<ClaudePairingSuggestion[]> {
  const claude = getClaudeInstance()
  if (!claude) {
    console.warn('Claude API не инициализирован')
    return []
  }

  return await claude.suggestPairs(analyses, fileNames)
}

export async function generateExecutiveReport(
  reconciliationResults: any,
  fileAnalyses: ClaudeFileAnalysis[],
  fileNames: string[]
): Promise<ClaudeExecutiveSummary | null> {
  const claude = getClaudeInstance()
  if (!claude) {
    console.warn('Claude API не инициализирован')
    return null
  }

  return await claude.generateExecutiveSummary(reconciliationResults, fileAnalyses, fileNames)
}
