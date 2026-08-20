/**
 * The narrow translator contract these components rely on: call a message key,
 * optionally with ICU values, get a string back. Satisfied by both
 * `useTranslations` (client) and the resolved value of `getTranslations`
 * (server) without coupling prop types to next-intl's exact return type.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;
