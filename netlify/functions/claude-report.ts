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
    const { reconciliationResults, fileAnalyses, fileNames } = JSON.parse(event.body || '{}')

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
${fileNames.map((name: string, i: number) => `${i + 1}. ${name}`).join('\n')}

АНАЛИЗ ФАЙЛОВ:
${fileAnalyses.map((analysis: any, i: number) => `
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 6000,
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

    const summary = JSON.parse(content)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(summary)
    }

  } catch (error) {
    console.error('Ошибка создания отчета:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Ошибка создания управленческой сводки',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
    }
  }
}

export { handler }
