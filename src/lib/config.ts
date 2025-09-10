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

  // Здесь можно добавить инициализацию других сервисов (Supabase и т.д.)
}

// Проверка доступности сервисов
export function checkServicesAvailability() {
  const services = {
    claude: import.meta.env.VITE_CLAUDE_API_ENABLED === 'true',
    supabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  }

  return services
}
