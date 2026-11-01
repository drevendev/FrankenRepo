import * as Sentry from '@sentry/node';
// No automatic HTTP/database/console integrations: the explicit metadata-only
// spans below cannot capture cookies, prompts, repository text or capabilities.
if (process.env.SENTRY_ENABLED === 'true' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: true,
    defaultIntegrations: false,
    sendDefaultPii: false,
    tracesSampleRate:
      process.env.SENTRY_OPERATOR_DEMO === 'true'
        ? 1
        : process.env.NODE_ENV === 'production'
          ? 0.1
          : 1,
    beforeSend(event) {
      return {
        type: event.type,
        event_id: event.event_id,
        timestamp: event.timestamp,
        level: event.level,
        message: 'FrankenRepo controlled diagnostic',
        tags: { project: 'frankenrepo' },
      };
    },
    beforeSendTransaction(event) {
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      delete event.extra;
      delete event.server_name;
      delete event.contexts?.trace?.data;
      return event;
    },
  });
}
