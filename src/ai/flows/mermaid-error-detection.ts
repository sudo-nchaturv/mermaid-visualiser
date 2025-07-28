'use server';

/**
 * @fileOverview Provides AI-powered error detection for Mermaid code.
 *
 * - detectMermaidErrors - Function to analyze Mermaid code and identify syntax errors.
 * - DetectMermaidErrorsInput - Input type for the detectMermaidErrors function.
 * - DetectMermaidErrorsOutput - Output type for the detectMermaidErrors function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectMermaidErrorsInputSchema = z.object({
  code: z.string().describe('The Mermaid code to analyze.'),
});
export type DetectMermaidErrorsInput = z.infer<typeof DetectMermaidErrorsInputSchema>;

const DetectMermaidErrorsOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the Mermaid code is valid or not.'),
  errors: z.array(z.string()).describe('A list of syntax errors found in the code.'),
  errorMessage: z.string().describe('A consolidated error message, or a success message if no errors are found.'),
});
export type DetectMermaidErrorsOutput = z.infer<typeof DetectMermaidErrorsOutputSchema>;

export async function detectMermaidErrors(input: DetectMermaidErrorsInput): Promise<DetectMermaidErrorsOutput> {
  return detectMermaidErrorsFlow(input);
}

const detectMermaidErrorsPrompt = ai.definePrompt({
  name: 'detectMermaidErrorsPrompt',
  input: {schema: DetectMermaidErrorsInputSchema},
  output: {schema: DetectMermaidErrorsOutputSchema},
  prompt: `You are an AI expert in Mermaid syntax.

  Analyze the following Mermaid code for syntax errors. Return a JSON object with the following format:
  {
    "isValid": true/false, // true if the code is valid, false otherwise
    "errors": ["error message 1", "error message 2", ...], // a list of error messages, empty if isValid is true
    "errorMessage": "A consolidated error message, or a success message if no errors are found." // A single string containing all error messages, or a success message if no errors were found.
  }

  Mermaid code to analyze:
  \`\`\`mermaid
  {{{code}}}
  \`\`\`

  Ensure the JSON response is valid and parsable.
  `,
});

const detectMermaidErrorsFlow = ai.defineFlow(
  {
    name: 'detectMermaidErrorsFlow',
    inputSchema: DetectMermaidErrorsInputSchema,
    outputSchema: DetectMermaidErrorsOutputSchema,
  },
  async input => {
    const {output} = await detectMermaidErrorsPrompt(input);
    if (!output) {
      return {
        isValid: false,
        errors: ['Failed to generate output from the prompt.'],
        errorMessage: 'Failed to generate output from the prompt.',
      };
    }
    return output;
  }
);
