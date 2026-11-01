# Локальный партнёрский апдейт — 31 октября 2026

> Дополнение от 1 ноября 2026: ниже сохранён отчёт о состоянии на 31 октября.
> Позднее владелец разрешил публикацию статьи и source update. Статья с пятью
> категориями вышла до дедлайна; Sentry и коммиты исходного обновления — после.
> [README](../../README.md#post-deadline-source-update--1-november-2026) фиксирует
> время и состав source update; [STATUS.json](STATUS.json) содержит шесть
> проверенных локальных сценариев. Render deployment, Backboard corpus и Tinker
> training остаются отложенными. Публикация исходников не означает их выполнение.

Работа не является завершённой публичной v0.2 и не опубликована. Канонические
спецификация и initialization prompt сохранены. Начатый владельцем Mongo-архив
продолжен, а не заменён второй реализацией. Последнее указание владельца:
всё, требующее его проверки или вмешательства, отложить до отдельного прохода.

## Что работает и чем подтверждено

| Ветка          | Фактический результат                                                                                                                                                     | Доказательство                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MongoDB Atlas  | Private save/reconnect/read, wrong-key read/delete denial, consent/public read/unpublish/delete; tombstone запрещает восстановить удалённую карточку старым save          | [Atlas receipt](../eval/ATLAS_V2_QUALIFICATION.json), [реальные HTTP права после рестарта API](../eval/runs/2026-10-31T14-17-36-153Z-permissions.json)                      |
| Durable limits | Один CAS-документ атомарно резервирует idempotency, calls, cost ceiling и concurrency; unknown не возмещается; в гонке 20 запросов бюджет 6 принял ровно три резерва по 2 | Тот же Atlas receipt; [policy tests](../../tests/controls.test.ts) — отдельно mock/policy evidence                                                                          |
| Mastra         | Реальные inspect → approved-context → Gemma/contract → reveal; отмена и optional failure не обещают durable resume                                                        | `workflow` в настоящих [Chaotic](../eval/runs/2026-10-31T14-30-13-808Z-chaotic-browser.json) и [Cursed](../eval/runs/2026-10-31T14-30-53-569Z-cursed-browser.json) receipts |
| Sentry         | Workflow/tool/inference spans, модель, latency, usage; успешная и контролируемая failure traces приняты; Agent Activity виден в кабинете                                  | [Console verification](../eval/SENTRY_CONSOLE_VERIFICATION.json), [failure receipt](../eval/SENTRY_CONTROLLED_FAILURE.json)                                                 |
| Ultramarine    | Две структурно валидные рецензии через официальный OpenAI SDK и один невалидный ответ; исходная карточка не потеряна                                                      | [Chaotic review](../eval/runs/2026-10-31T14-06-24-828Z-chaotic-browser.json), [Useful review](../eval/runs/2026-10-31T14-21-17-817Z-useful-browser.json)                    |
| Gemma revision | Отдельная новая карточка, исходный hash не изменён, входные snapshots совпадают                                                                                           | [Revision receipt](../eval/runs/2026-10-31T14-23-42-050Z-revision.json) — качество ниже порога, это отрицательный пример                                                    |
| Browserbase    | Настоящий облачный браузер прочитал pinned README; source/excerpt/hash/session попали в настоящий Gemma input                                                             | [Research](../eval/BROWSERBASE_RESEARCH.json), `record.context.research` в Chaotic review receipt                                                                           |
| Backboard      | Серверный bounded search, manifest consent filter, tombstone/outbox deletion и operator commands реализованы; действующий тариф прочитан                                  | Живая запись/поиск/удаление **не выполнены**: корпус отложен; тестовую неутверждённую запись отклонил auto-review                                                           |
| Tinker         | Официальный SDK, tokenizer, замороженный rubric/split manifest, отдельная Python-команда одного LoRA/eval и расчёт верхнего бюджета подготовлены                          | [Preflight](../eval/TINKER_PREFLIGHT.json), [human review](../../tools/apprentice/data/REVIEW.html); train/checkpoint отсутствуют                                           |
| Render         | Подготовлен один Free service, Node 24, auto-deploy off, default model disabled                                                                                           | [render.yaml](../../render.yaml); сервис не создан, публичного URL нет                                                                                                      |

Кабинет Render доступен, но публичный GitHub содержит прежнюю v0.1.0.
Владелец запретил push без отдельного указания. Разворачивать старый код с
генерацией вместо непубликованного обновления небезопасно; разрешение на push,
проверка нового deployment commit и точечный Atlas network allowlist отложены.
Не использован обход через публикацию bundle на другом сервисе.

## Качество и честные неуспехи

Текущий prompt — v6. Chaotic дал **The Gluttonous Wing-Scraper**, Cursed —
**The Sallow Scribe of Brackets**. Useful v6 не создал карточку: после bounded
repair защитная проверка остановила шутку о репрессиях. [Receipt отказа](../eval/runs/2026-10-31T14-30-38-334Z-useful-browser.json)
сохранён; generic error в этом прогоне выявил потерю error code внутри Mastra.
Обёртка исправлена и сохраняет безопасный код исходной ошибки для будущих запусков.

Useful v5 и его revision успешно выполнили технический цикл, но предлагали
«verified lineage report» из литературных имён и архивных записей. Такой мост
не подтверждён. Revision не достиг цели +2/10 и не включён в успешный shortlist.
Добавлены regressions и узкий gate против этого обещания и использования
исторической трагедии в hook/curse/firstWords. Это не общий семантический verifier:
AI по-прежнему может придумывать неподтверждённые механизмы.

Chaotic revision остановлена `REVISION_LIMIT`: исходный ритуал уже использовал
initial + repair. Бюджет не сброшен и дополнительный вызов не выполнен.
Не запускаются новые модели/варианты ради случайно удачного результата.

## Расход

[Итоговый ledger и balances](../eval/PARTNER_QUALIFICATION_ROLLUP.json):

- Gemma: 11 фактических attempts, 17 из 20 суточных попыток зарезервированы;
  provider Neurons и billed cost не сняты, остаются `null`.
  Финальный runtime также ограничивает input 40 kB и резервирует $0.005/call
  по [датированной цене](../eval/GEMMA_PRICE_BOUND.json). Старые локальные резервы
  сохранены как были; новая оценка не приписана им задним числом.
- Paper Instruments: 3 запроса, 2811 input / 1318 completion tokens;
  наблюдённый account balance delta $0.00108065, остаток $4.99891935.
  Это account-wide разница; per-response estimates отдельно в рецензиях.
- Backboard: бесплатный остаток $4.967132 не изменился. Corpus/lifecycle writes
  не отправлены. Auto-reload выключен, paid/subscription credit $0, карта отсутствует.
- Tinker: train и sampling не запускались. Preflight подтверждает Qwen3-8B
  trainable/sampleable, $10 до 1 ноября 2027 и Free checkpoint storage.
  Оценка пилота с запасом $0.17416282 ниже cap $3, но не является фактическим расходом.
- Browserbase: одна новая research-сессия, 12.686 секунд измеренного полного
  operator flow; зарезервированы 120 секунд. Provider-billed minutes не сняты.
  Локальный лимит включает ранний failed smoke и не сбрасывается автоматически.
- Платёжных транзакций, карты, подписок и повышения тарифа не было.

## Отложено по последнему указанию владельца

1. Проверить 36 предложенных Tinker labels: 16 train / 8 validation / 12 holdout,
   всего три независимые donor components, поэтому только пилот. Не утверждено
   человеком, не обучено. Один future run защищён atomic reservation file.
2. Утвердить шесть текстов [corpus proposal](NOTEBOOK_CORPUS.json), затем выполнить
   bounded write/search/restart/delete и сравнение input с памятью/без неё.
   Private save не означает такого согласия.
3. Разрешение на source push, конкретный Render deploy и необходимые security/terms
   действия; выбрать Free и точечные outbound ranges для Atlas. Не открывать 0.0.0.0/0.
4. Публичный Browserbase E2E, cold start, публичный ritual/save/reload/export и видео.
5. Человеческий quality/category review и окончательная DEV-заявка. Только прежняя
   локальная категория Gemma остаётся VERIFIED; новые технические receipts не
   превращены автоматически в конкурсное одобрение.

Entire отсутствует в доступном PATH; настоящая запись сессии не создана задним
числом. Copilot не использован. Текущие изменения не pushed, поэтому старый
GitHub Actions run не назван проверкой этого diff. Schedulers не запускались.

## Локальные команды

Обычный `npm start` сохраняет default-disabled provider, если оператор сам не
настроил `.env`. Live provider теперь требует MongoDB и устойчивый SESSION_SECRET.
`scripts/serve-qualified.ts` — отдельный явный операторский вход на 3002;
он включает реальные интеграции только для конечного разрешённого прогона.
E2E работает на отдельном 3003 с model/storage/telemetry выключенными.

`npm run verify` включает типы, lint, форматирование, тесты, сборку, bundle budget
и проверку evidence/secrets. После сборки выполняется `npm run test:e2e`.
Финальные результаты находятся в [validation](../VALIDATION.md).
