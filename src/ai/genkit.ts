import { genkit, modelRef } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { openAI } from '@genkit-ai/compat-oai/openai';

type SupportedAiProvider = 'openai' | 'gemini' | 'compatible';

type ProviderRegistration = {
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
    return 3;
  }
  if (provider === 'openai') return 1;
  if (provider === 'gemini') return 2;
  return 3;
}

const plugins = [];
const configuredProviders: ProviderRegistration[] = [];

const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
if (hasOpenAi) {
  plugins.push(openAI({ apiKey: process.env.OPENAI_API_KEY }));
  configuredProviders.push({
    provider: 'openai',
    model: openAI.model(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    label: `OpenAI:${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`,
  });
}

const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
if (hasGemini) {
  plugins.push(googleAI());
  configuredProviders.push({
    provider: 'gemini',
    model: googleAI.model(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
    label: `Gemini:${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`,
  });
}

const compatiblePluginName = process.env.OPENAI_COMPATIBLE_NAME || 'compat';
const hasCompatible = Boolean(process.env.OPENAI_COMPATIBLE_BASE_URL && process.env.OPENAI_COMPATIBLE_MODEL);
if (hasCompatible) {
  plugins.push(openAICompatible({
    name: compatiblePluginName,
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || 'placeholder',
    baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL,
  }));
  configuredProviders.push({
    provider: 'compatible',
    model: modelRef({
      name: `${compatiblePluginName}/${process.env.OPENAI_COMPATIBLE_MODEL}`,
    }),
    label: `${compatiblePluginName}:${process.env.OPENAI_COMPATIBLE_MODEL}`,
  });
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
