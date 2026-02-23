import ar from '@/messages/ar.json';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import { AppLocale } from './config';

export type AppMessages = typeof fr;

export const MESSAGES_BY_LOCALE: Record<AppLocale, AppMessages> = {
  fr,
  en,
  ar,
};

