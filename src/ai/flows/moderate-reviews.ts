// src/ai/flows/moderate-reviews.ts
'use server';

/**
 * @fileOverview AI-powered tool to automatically detect and filter spam or fake reviews.
 *
 * - moderateReview - A function that moderates a review.
 * - ModerateReviewInput - The input type for the moderateReview function.
 * - ModerateReviewOutput - The return type for the moderateReview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateReviewInputSchema = z.object({
  reviewText: z.string().describe('The text content of the review to be moderated.'),
});
export type ModerateReviewInput = z.infer<typeof ModerateReviewInputSchema>;

const ModerateReviewOutputSchema = z.object({
  isSpam: z.boolean().describe('Whether the review is likely to be spam or fake.'),
  reason: z.string().optional().describe('The reason why the review is considered spam, if applicable.'),
});
export type ModerateReviewOutput = z.infer<typeof ModerateReviewOutputSchema>;

export async function moderateReview(input: ModerateReviewInput): Promise<ModerateReviewOutput> {
  return moderateReviewFlow(input);
}

const moderateReviewPrompt = ai.definePrompt({
  name: 'moderateReviewPrompt',
  input: {schema: ModerateReviewInputSchema},
  output: {schema: ModerateReviewOutputSchema},
  prompt: `You are an AI review moderation tool.
  Your task is to determine whether the provided review is spam or fake.
  Respond with a boolean value for isSpam. If isSpam is true, provide a reason.

  Review Text: {{{reviewText}}}
  `,
});

const moderateReviewFlow = ai.defineFlow(
  {
    name: 'moderateReviewFlow',
    inputSchema: ModerateReviewInputSchema,
    outputSchema: ModerateReviewOutputSchema,
  },
  async input => {
    const {output} = await moderateReviewPrompt(input);
    return output!;
  }
);
