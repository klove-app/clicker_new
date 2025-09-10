import { initializeClaude } from './claude-api'

// Инициализация всех API сервисов
export function initializeServices() {
  // Проверяем доступность Claude API через Netlify Functions
  const claudeEnabled = import.meta.env.VITE_CLAUDE_API_ENABLED === 'true'

  if (claudeEnabled) {
    // Инициализируем с пустыми параметрами - реальные ключи на сервере
    initializeClaude({
      apiKey: 'netlify-function', // Заглушка
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4000
    })
    console.log('✅ Claude API инициализирован через Netlify Functions')
  } else {
    console.warn('⚠️ Claude API отключен')
  }

  // Инициализация локального хранилища
  console.log('✅ Локальное хранилище готово к использованию')
}

// Проверка доступности сервисов
export function checkServicesAvailability() {
  const services = {
    claude: import.meta.env.VITE_CLAUDE_API_ENABLED === 'true',
    localStorage: typeof Storage !== 'undefined'
  }

  return services
}
