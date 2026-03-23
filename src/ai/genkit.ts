import { genkit, modelRef } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { openAI } from '@genkit-ai/compat-oai/openai';

export type SupportedAiProvider = 'openai' | 'gemini' | 'groq' | 'compatible';

export type ProviderRegistration = {
  provider: SupportedAiProvider;
  model: ReturnType<typeof modelRef>;
  label: string;
};

const providerPreference = (process.env.AI_PRIMARY_PROVIDER || '').trim().toLowerCase();

function providerRank(provider: SupportedAiProvider) {
  if (providerPreference === provider) return 0;
  if (!providerPreference) {
    if (provider === 'openai') return 1;
    if (provider === 'gemini') return 2;
    if (provider === 'groq') return 3;
    return 4;
  }
  if (provider === 'openai') return 1;
  if (provider === 'gemini') return 2;
  if (provider === 'groq') return 3;
  return 4;
}

const plugins: any[] = [];
const configuredProviders: ProviderRegistration[] = [];

function registerProvider(registration: ProviderRegistration, plugin?: ReturnType<typeof openAICompatible> | ReturnType<typeof openAI> | ReturnType<typeof googleAI>) {
  if (plugin) {
    plugins.push(plugin);
  }
  configuredProviders.push(registration);
}

const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
if (hasOpenAi) {
  registerProvider({
    provider: 'openai',
    model: openAI.model(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    label: `OpenAI:${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`,
  }, openAI({ apiKey: process.env.OPENAI_API_KEY }));
}

const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
if (hasGemini) {
  registerProvider({
    provider: 'gemini',
    model: googleAI.model(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
    label: `Gemini:${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`,
  }, googleAI());
}

const groqPluginName = 'groq';
const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL);
if (hasGroq) {
  registerProvider({
    provider: 'groq',
    model: modelRef({
      name: `${groqPluginName}/${process.env.GROQ_MODEL}`,
    }),
    label: `Groq:${process.env.GROQ_MODEL}`,
  }, openAICompatible({
    name: groqPluginName,
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  }));
}

const compatiblePluginName = process.env.OPENAI_COMPATIBLE_NAME || 'compat';
const hasCompatible = Boolean(process.env.OPENAI_COMPATIBLE_BASE_URL && process.env.OPENAI_COMPATIBLE_MODEL);
if (hasCompatible) {
  registerProvider({
    provider: 'compatible',
    model: modelRef({
      name: `${compatiblePluginName}/${process.env.OPENAI_COMPATIBLE_MODEL}`,
    }),
    label: `${compatiblePluginName}:${process.env.OPENAI_COMPATIBLE_MODEL}`,
  }, openAICompatible({
    name: compatiblePluginName,
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || 'placeholder',
    baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL,
  }));
}

configuredProviders.sort((a, b) => providerRank(a.provider) - providerRank(b.provider));

export const ai = genkit({
  plugins,
  ...(configuredProviders[0] ? { model: configuredProviders[0].model } : {}),
});

export function hasConfiguredAiModel() {
  return configuredProviders.length > 0;
}

export function getConfiguredAiProviders() {
  return configuredProviders.map((item) => ({
    provider: item.provider,
    label: item.label,
  }));
}

export function getConfiguredAiProviderRegistrations() {
  return [...configuredProviders];
}
