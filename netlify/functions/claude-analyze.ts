import type { Handler } from '@netlify/functions'

const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { fileName, headers: fileHeaders, sampleRows, fileSize } = JSON.parse(event.body || '{}')

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

НАЗВАНИЕ ФАЙЛА: ${fileName}
РАЗМЕР: ${fileSize} байт

ЗАГОЛОВКИ СТОЛБЦОВ:
${fileHeaders.join(' | ')}

ПРИМЕРЫ СТРОК (первые 3-5):
${sampleRows.map((row: any[], i: number) => `Строка ${i + 1}: ${row.join(' | ')}`).join('\n')}

Верни анализ в JSON формате с полями:
- fileType: тип файла
- confidence: уверенность 0-1
- period: {month, year, dateRange}
- organization: название организации
- dataStructure: {primaryColumns, dataTypes, keyFields}
- contentSummary: краткое описание
- recommendations: рекомендации для сопоставления`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 4000,
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

    const analysis = JSON.parse(content)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis)
    }

  } catch (error) {
    console.error('Ошибка анализа файла:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Ошибка анализа файла',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
    }
  }
}

export { handler }
