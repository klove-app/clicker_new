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
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.content[0]?.text

      if (!content) {
        throw new Error('Пустой ответ от Claude API')
      }

      // Парсим JSON ответ
      const analysis = JSON.parse(content) as ClaudeFileAnalysis
      return analysis

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
