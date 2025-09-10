import { initializeClaude } from './claude-api'

// Инициализация всех API сервисов
export function initializeServices() {
  // Проверяем доступность Claude API
  const claudeEnabled = import.meta.env.VITE_CLAUDE_API_ENABLED === 'true'
  const claudeApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const claudeModel = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

  if (claudeEnabled && claudeApiKey) {
    // Инициализируем с реальными ключами для dev режима
    initializeClaude({
      apiKey: claudeApiKey,
      model: claudeModel,
      maxTokens: 4000
    })
    console.log('✅ Claude API инициализирован для dev режима:', claudeModel)
  } else {
    console.warn('⚠️ Claude API отключен или ключ не найден')
  }

  // Инициализация локального хранилища
  console.log('✅ Локальное хранилище готово к использованию')
}

// Проверка доступности сервисов
export function checkServicesAvailability() {
  const services = {
    claude: import.meta.env.VITE_CLAUDE_API_ENABLED === 'true' && !!import.meta.env.VITE_ANTHROPIC_API_KEY,
    localStorage: typeof Storage !== 'undefined'
  }

  return services
}
