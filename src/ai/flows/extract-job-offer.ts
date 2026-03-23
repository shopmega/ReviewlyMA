'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { modelRef } from 'genkit';

const ExtractJobOfferInputSchema = z.object({
  sourceType: z.enum(['paste', 'url']),
  content: z.string(),
});

const ExtractJobOfferOutputSchema = z.object({
  companyName: z.string().default(''),
  jobTitle: z.string().default(''),
  city: z.string().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  payPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  contractType: z.enum(['cdi', 'cdd', 'freelance', 'internship', 'temporary', 'other']).nullable().optional(),
  workModel: z.enum(['onsite', 'hybrid', 'remote']).nullable().optional(),
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'manager', 'executive']).nullable().optional(),
  yearsExperienceRequired: z.number().nullable().optional(),
  benefits: z.array(z.string()).default([]),
  sourceSummary: z.string().default(''),
});

export type ExtractJobOfferInput = z.infer<typeof ExtractJobOfferInputSchema>;
export type ExtractJobOfferOutput = z.infer<typeof ExtractJobOfferOutputSchema>;

function buildExtractJobOfferPrompt(input: ExtractJobOfferInput) {
  return `You extract structured data from a job offer.

Return only structured output based on the provided schema.
Rules:
- Never invent salary if it is not present.
- Prefer null or empty strings over guessing.
- If a range exists, put low value in salaryMin and high value in salaryMax.
- Normalize work model to onsite, hybrid, or remote.
- Normalize contract type to cdi, cdd, freelance, internship, temporary, or other.
- Normalize seniority to junior, mid, senior, lead, manager, or executive.
- Keep sourceSummary short and factual.
- Benefits should be a short list, deduplicated.

Source type: ${input.sourceType}
Content:
${input.content}`;
}

export async function extractJobOfferWithModel(
  input: ExtractJobOfferInput,
  model: ReturnType<typeof modelRef>
): Promise<ExtractJobOfferOutput> {
  const { output } = await ai.generate({
    model,
    prompt: buildExtractJobOfferPrompt(input),
    output: { schema: ExtractJobOfferOutputSchema },
  });

  if (!output) {
    throw new Error('AI extraction returned no structured output');
  }

  return output;
}

export async function extractJobOffer(input: ExtractJobOfferInput): Promise<ExtractJobOfferOutput> {
  const { output } = await ai.generate({
    prompt: buildExtractJobOfferPrompt(input),
    output: { schema: ExtractJobOfferOutputSchema },
  });

  if (!output) {
    throw new Error('AI extraction returned no structured output');
  }

  return output;
}
