# Dinox — Обзор проекта: функционал и особенности

## Что такое Dinox

Локальный календарь-планировщик (local-first) с поддержкой задач, событий, проектов и тегов.  
Работает как веб-приложение и как настольное приложение на Electron (Windows).

---

## Стек технологий

| Слой | Технологии |
|---|---|
| Фреймворк | Next.js 16.1.6 (App Router), React 19 |
| Язык | TypeScript 5 |
| База данных | SQLite (через Prisma 6.14.0) |
| Стили | TailwindCSS 4 |
| Календарный UI | react-big-calendar 1.19.4 |
| Даты | date-fns 4.1.0, chrono-node 2.9.0 |
| Валидация | Zod 4.3.6 |
| Рабочий стол | Electron 40.7.0, electron-builder 26.8.1 |
| AI | @anthropic-ai/sdk 0.78.0 |
| Пакетный менеджер | pnpm 10+ |

---

## Архитектура

Трёхслойная чистая архитектура:

```
domain/          — бизнес-логика, интерфейсы репозиториев, Zod-схемы, сервисы
data/prisma/     — реализации репозиториев, маперы, Prisma-клиент
ui/              — React-компоненты, fetch-клиент, темы, настройки
app/             — Next.js маршруты (страницы и API)
desktop/         — Electron main-процесс
```

**Паттерны:**
- Dependency Injection через `src/app-services/container.ts`
- Service Layer: `ItemService`, `ProjectService`, `TagService` — принимают Zod-валидацию, бросают `ValidationError` / `NotFoundError`
- Repository Pattern: интерфейсы в `domain/`, Prisma-реализации в `data/prisma/repositories/`
- Маперы: трансформация между доменными типами и Prisma-моделями

---

## Модели данных

**Item (задача/событие)**
- `kind`: TASK | EVENT
- `status`: TODO | DONE | CANCELLED (события не могут иметь DONE)
- `title`, `description`, `color`, `links[]`
- `startAt`, `endAt` (endAt > startAt — бизнес-правило)
- `projectId` — опциональная привязка к проекту
- `tags` — many-to-many через ItemTag
- `seriesId`, `parentId` — для повторяющихся событий
- `externalSource`, `externalId` — для будущей синхронизации

**Project**
- `name`, `emoji`, `color`
- Поддержка архивирования

**Tag**
- `name`
- Привязка ко многим Items

**CalendarSubscription**
- `url`, `name`, `syncedAt`
- Подписка на внешние iCalendar-источники

---

## Функционал

### Календарные представления

- **Месяц** — сетка-месяц
- **Неделя** — почасовая сетка недели
- **День** — почасовая сетка дня
- **Agenda** — список предстоящих событий

Переключение представлений сохраняется как пользовательская настройка.

### Создание и редактирование элементов

- Клик по дню / слоту времени — быстрое создание
- Полный редактор: тип, статус, дата/время, цвет, описание, ссылки, проект, теги
- Редактирование: модальное окно с немедленным обновлением UI

### Повторяющиеся события (Recurrence)

- Паттерны: DAILY, WEEKLY, MONTHLY, YEARLY
- Интервал повторения и BYDAY-селектор
- Управление серией: изменить / удалить всю серию или один экземпляр

### Проекты

- Создание проектов с цветом и emoji
- Фильтрация календаря по проектам
- Архивирование проектов
- Отдельная страница проекта (`/projects/[id]`)

### Теги

- Произвольные теги для Items
- Фильтрация по тегам (multi-select)
- Защита от дублирования тегов внутри элемента

### Фильтрация

- По проектам (multi-select)
- По тегам (multi-select)
- По тексту (поиск в title и description)
- По диапазону дат

### Дашборд (`/dashboard`)

- Карточки статистики: всего элементов, выполненных задач, предстоящих событий
- Тепловая карта активности по неделям
- Разбивка по статусам

### Настройки (`/settings`)

- **Тема**: Dark, Light, Custom (редактор CSS-токенов — цвета, отступы)
- **Акцентный цвет**: color-picker
- **Начало недели**: Понедельник / Воскресенье
- **Формат времени**: 12h / 24h
- **Представление по умолчанию**: Month / Week / Day / Agenda
- **Локаль**: English, Русский
- **Справочник горячих клавиш**
- **Раздел About**

### Импорт / Экспорт

- **ICS Export**: экспорт всех элементов как `.ics`-файл
- **ICS Import**: импорт событий из `.ics` с обработкой конфликтов
- **Подписки на внешние календари**: создание, обновление, удаление, синхронизация по URL (CalDAV/iCalendar)

### Telegram-интеграция

- API-эндпоинт для запуска и остановки Telegram-бота
- Скрипт `scripts/telegram-agent.mjs` — агент для создания задач через Telegram

### Онбординг

- Экран приветствия для новых пользователей
- Production-сборка стартует с пустой локальной базой
- Демо-данные доступны только для разработки через `pnpm seed`

---

## API-эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| GET, POST | `/api/projects` | Список / создание проектов |
| GET, PATCH, DELETE | `/api/projects/[id]` | Проект по ID |
| GET, POST | `/api/tags` | Список / создание тегов |
| GET, PATCH, DELETE | `/api/tags/[id]` | Тег по ID |
| GET, POST | `/api/items` | Список / создание элементов |
| GET, PATCH, DELETE | `/api/items/[id]` | Элемент по ID |
| GET, PATCH, DELETE | `/api/items/series/[seriesId]` | Управление серией повторений |
| GET, POST | `/api/subscriptions` | Подписки |
| GET, PATCH, DELETE | `/api/subscriptions/[id]` | Подписка по ID |
| POST | `/api/subscriptions/[id]/sync` | Синхронизация подписки |
| GET | `/api/ics/export` | Экспорт ICS |
| POST | `/api/ics/import` | Импорт ICS |
| GET, POST | `/api/integrations/telegram` | Telegram-бот |

---

## Desktop-приложение (Electron)

- BrowserWindow поверх встроенного Next.js-сервера
- Локальная SQLite: `%APPDATA%/Dinox/dinox.db`
- Авто-миграция Prisma при запуске
- Горячая перезагрузка в dev-режиме (concurrently + wait-on)
- **Windows-установщик**: NSIS `.exe` с ярлыком на рабочем столе и в меню Пуск

### Команды сборки

```bash
pnpm dev              # веб-режим разработки
pnpm build            # production-сборка Next.js
pnpm desktop:dev      # Electron + Next.js совместно
pnpm desktop:pack     # распаковать Electron-приложение
pnpm desktop:package:win  # NSIS-установщик для Windows
```

---

## Бизнес-правила и валидация

- `endAt > startAt` — обязательное условие
- События (EVENT) не могут иметь статус DONE
- Проект должен существовать перед привязкой
- Теги должны существовать перед привязкой к элементу
- Дублирующиеся теги в одном элементе запрещены
- Zod-валидация на уровне сервисного слоя (до записи в БД)

---

## Интернационализация

- Поддержка **English** и **Русский** локалей
- Форматирование дат через date-fns с locale-адаптерами
- Переключение в настройках, сохраняется в localStorage

---

## Хранение настроек

Все пользовательские настройки (тема, локаль, формат времени, начало недели, представление по умолчанию) хранятся в `localStorage` браузера.

---

## Точки расширения

- **Sync hooks** — поля `externalSource` / `externalId` готовы к двусторонней синхронизации
- **Recurrence expansion** — заложена инфраструктура для полного раскрытия серий
- **Multi-user** — архитектура репозиториев допускает добавление userId
- **AI-функции** — `@anthropic-ai/sdk` подключён, готов к интеграции

---

## Структура файлов (ключевые пути)

```
Dinox/
├── app/                        # Next.js маршруты
│   ├── api/                    # API-эндпоинты
│   ├── dashboard/              # Дашборд
│   ├── settings/               # Настройки
│   └── projects/[id]/          # Страница проекта
├── src/
│   ├── domain/                 # Бизнес-логика
│   │   ├── models/types.ts     # Типы домена
│   │   ├── repositories/       # Интерфейсы репозиториев
│   │   ├── schemas/            # Zod-схемы
│   │   └── services/           # Сервисы (Item, Project, Tag)
│   ├── data/prisma/            # Слой данных
│   │   ├── client.ts           # Prisma-клиент
│   │   ├── repositories/       # Prisma-реализации
│   │   └── mappers/            # Domain <-> Prisma трансформации
│   ├── ui/                     # UI-компоненты
│   │   ├── calendar/           # Календарные виды
│   │   ├── dashboard/          # Дашборд
│   │   ├── settings/           # UI настроек
│   │   ├── onboarding/         # Онбординг
│   │   ├── theme/              # Система тем
│   │   └── prefs/              # Пользовательские настройки
│   └── app-services/           # DI-контейнер
├── desktop/
│   ├── main.cjs                # Electron main-процесс
│   └── require-hook.cjs        # Module resolution hook
├── prisma/
│   ├── schema.prisma           # Схема БД
│   ├── migrations/             # Миграции
│   └── dev.db                  # SQLite dev-база
├── scripts/
│   ├── qa/smoke-api.mjs        # API smoke-тесты
│   └── telegram-agent.mjs      # Telegram-агент
└── docs/                       # Документация проекта
```
