import { initializeClaude } from './claude-api'

// Инициализация всех API сервисов
export function initializeServices() {
  // Инициализация Claude API
  const claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY
  const claudeModel = import.meta.env.VITE_CLAUDE_MODEL || 'claude-sonnet-4-20250514'

  if (claudeApiKey) {
    initializeClaude({
      apiKey: claudeApiKey,
      model: claudeModel,
      maxTokens: 4000
    })
    console.log('✅ Claude API инициализирован:', claudeModel)
  } else {
    console.warn('⚠️ Claude API ключ не найден в переменных окружения')
  }

  // Здесь можно добавить инициализацию других сервисов (Supabase и т.д.)
}

// Проверка доступности сервисов
export function checkServicesAvailability() {
  const services = {
    claude: !!import.meta.env.VITE_CLAUDE_API_KEY,
    supabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  }

  return services
}
