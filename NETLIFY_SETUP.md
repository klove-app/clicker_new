# Настройка Netlify для Claude API

## Настройка переменных окружения в Netlify Dashboard:

### 1. Перейдите в настройки сайта:
- Откройте ваш сайт в Netlify Dashboard
- Перейдите в **Site settings**
- Выберите **Environment variables**

### 2. Добавьте переменные окружения:

```
CLAUDE_API_KEY = your_claude_api_key_here
CLAUDE_MODEL = claude-sonnet-4-20250514
```

### 3. Настройка деплоя:

#### **Автоматический деплой из GitHub:**
- **Repository:** `https://github.com/klove-app/clicker_new`
- **Branch:** `main`
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Functions directory:** `netlify/functions`

#### **Build settings:**
- **Node.js version:** 20.x
- **Package manager:** npm

### 4. Проверка функций:

После деплоя функции будут доступны по адресам:
- `https://your-site.netlify.app/.netlify/functions/claude-analyze`
- `https://your-site.netlify.app/.netlify/functions/claude-report`

### 5. Локальная разработка с Netlify Dev:

```bash
# Установка Netlify CLI (если не установлен)
npm install -g netlify-cli

# Запуск локального сервера с функциями
netlify dev

# Или обычный dev сервер (функции работать не будут)
npm run dev
```

## Архитектура решения:

```
Браузер → Netlify Function → Claude API → Ответ → Браузер
```

**Преимущества:**
- ✅ Нет CORS проблем
- ✅ API ключи безопасно хранятся на сервере  
- ✅ Работает в продакшене и локально
- ✅ Serverless архитектура - оплата только за использование

## Что делают функции:

### `claude-analyze`:
- Анализирует загруженные файлы
- Определяет тип, период, организацию
- Возвращает структурированные данные

### `claude-report`:
- Создает управленческую сводку
- Анализирует результаты сверки
- Дает рекомендации и план действий

## Fallback режим:

Если функции недоступны, приложение продолжит работать с:
- Простым анализом файлов по ключевым словам
- Базовой логикой сопоставления
- Локальным хранилищем для истории
