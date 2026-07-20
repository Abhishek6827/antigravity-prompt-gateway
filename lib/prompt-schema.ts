import { z } from "zod";

export const promptResponseSchema = z.object({
    status: z.enum(["needs_clarification", "ready"]),
    extractedIntent: z.string(),
    questions: z.array(z.string()).max(3),
    finalPrompt: z.string(),
    assumptions: z.array(z.string()),
    verificationChecklist: z.array(z.string()),
});

export type PromptResponse = z.infer<typeof promptResponseSchema>;

export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};