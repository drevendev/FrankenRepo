# Первый реальный ритуал: Cloudflare Free + Gemma

Проверено по официальной документации 27 октября 2026.
Настройку аккаунта и токена выполняет владелец. Этот документ ничего не
активирует, не добавляет карту и не утверждает, что модель уже запускалась.

## 1. Аккаунт и бесплатный тариф

1. Откройте [Cloudflare Dashboard](https://dash.cloudflare.com/sign-up),
   зарегистрируйтесь или войдите и подтвердите email.
2. Выберите свой аккаунт. Найдите Workers AI через поиск панели. Домен,
   покупка адреса и размещение Worker для локального FrankenRepo не нужны:
   сервер Node обращается к REST API.
3. Убедитесь, что используется **Workers Free**. Не подключайте Workers Paid,
   AI Gateway credits или платёжный метод. Если выбранный путь требует карту,
   остановитесь и проверьте, не попали ли вы в платное подключение.

Workers AI имеет общую бесплатную квоту **10 000 Neurons в сутки на аккаунт**.
Это не число запросов или токенов. На Workers Free превышение квоты приводит
к отказу запросов; доплаты выше квоты относятся к Paid. Сброс в 00:00 UTC
(02:00 Asia/Nicosia в текущем зимнем времени).
[Официальные лимиты и тарифы](https://developers.cloudflare.com/workers-ai/platform/pricing/).
Cloudflare описывает старт без обязательной карты на
[странице Workers AI](https://www.cloudflare.com/products/workers-ai/).

## 2. Account ID и API Token

1. На странице **Workers AI** нажмите **Use REST API**.
2. Выберите **Create a Workers AI API Token**.
3. Проверьте готовый шаблон и ограничьте Account Resources своим конкретным
   аккаунтом, если этот выбор доступен. Дайте токену имя FrankenRepo local.
4. Нажмите **Create API Token**, затем **Copy API Token**. Сохраните секрет
   локально: он показывается один раз. Не отправляйте его в чат/скриншот/Git.
5. Там же в **Get Account ID** скопируйте Account ID — 32 шестнадцатеричных символа.

Это путь из [официальной инструкции REST API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).
Если создаёте токен вручную: **My Profile → API Tokens → Create Token → Custom token**,
права **Account / Workers AI / Read** и **Account / Workers AI / Edit**, ресурс —
ваш конкретный аккаунт. Можно ограничить срок действия токена. Затем
**Continue to summary → Create Token**. Global API Key не нужен.
[Создание и ограничение токена](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).

Если Account ID не виден: поиск панели Ctrl+K → **Copy account ID**, либо
Workers & Pages → Account Details → Account ID.
[Где искать Account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

## 3. Локальный .env

В PowerShell:

```powershell
Set-Location 'C:\MyProjects\Codex\FrankenRepo'
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
notepad .env
```

Замените соответствующие строки в .env; сохраняйте один экземпляр каждой
переменной:

```dotenv
MODEL_PROVIDER=cloudflare
CF_ACCOUNT_ID=ВАШ_ACCOUNT_ID
CF_API_TOKEN=ВАШ_API_TOKEN
CF_GEMMA_MODEL=@cf/google/gemma-4-26b-a4b-it
MODEL_CALLS_PER_DAY=6
MAX_PARALLEL_RITUALS=1
RATE_LIMIT_MAX=3
```

Вместо заглушек вставьте свои значения без пробелов. .env уже исключён из Git.
Не добавляйте VITE_ к секретным переменным: ключ нужен только серверу.
Не включайте автопополнение/кредиты платного Gateway.

Именно этот Gemma ID указан как доступный на Workers Free в
[официальном объявлении](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/).
Реальная доступность зависит также от аккаунта и текущей ёмкости провайдера.
Лимит FrankenRepo ограничивает вызовы процесса, включая repair, но сбрасывается
при перезапуске; отсутствие расходов обеспечивает выбранный Workers Free,
а не один этот счётчик.

## 4. Первый ритуал в браузере

Если предыдущий npm start ещё работает, остановите его Ctrl+C в его терминале.
Переменные .env считываются при запуске, поэтому старый сервер нужно перезапустить.

```powershell
npm run build
npm start
```

1. Откройте http://127.0.0.1:3001/ и обновите страницу.
2. Введите Donor A: **pallets/flask**, Donor B: **jqlang/jq**.
3. Нажмите **Inspect donors** и проверьте реальные источники.
4. Выберите **Cursed** и нажмите **Pull the lever**.
5. Дождитесь completed, проверьте имя модели и источники Brain/Body/Curse,
   затем сохраните PNG/SVG.

Состояние «configured · connection unverified» до первого успеха нормально:
наличие настроек не выдаётся за доказанный вызов.
Для звука отдельно нажмите Sound on; это не требует Cloudflare.

## 5. Сохранить доказательство реального вызова

После успешного браузерного запуска можно сделать отдельный реальный
CLI-прогон с датой/моделью/результатом:

```powershell
npm run test:live -- pallets/flask jqlang/jq cursed
```

Успех: строка completed и JSON в docs/eval/runs/. Это ещё один вызов модели,
а не сохранение уже открытого браузерного результата. Проверка схемы не
доказывает качество юмора. Для других стилей позже повторите useful и chaotic.
Партнёрский статус обновляется только после просмотра фактического receipt.

## Если не получилось

| Симптом                       | Действие                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| MODEL_PROVIDER=disabled       | Сохранить .env, перезапустить API, обновить страницу                                                              |
| INVALID_CONFIG                | Проверить 32-символьный Account ID, непустой токен и точное имя модели                                            |
| MODEL_UNAVAILABLE / 401 / 403 | Проверить токен, оба Workers AI разрешения, выбранный аккаунт и доступ к модели; не переходить на Paid            |
| MODEL_QUOTA / 429             | Проверить Workers AI Usage и лимит процесса; подождать сброса, не пополнять кредиты                               |
| UPSTREAM_TIMEOUT              | Повторить позже: модель/сеть могут быть временно заняты                                                           |
| Ошибка схемы после repair     | Реальная модель ответила с неподходящим JSON; сохранить failure receipt, не заменять результат выдуманным успехом |
| Порт 3001 занят               | Остановить прежний сервер в его терминале; не запускать второй поверх него                                        |

Чтобы полностью отключить генерацию, поставьте MODEL_PROVIDER=disabled и
перезапустите API. Токен можно отозвать в My Profile → API Tokens.
