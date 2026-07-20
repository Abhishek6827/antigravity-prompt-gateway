import OpenAI from "openai";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { promptResponseSchema } from "@/lib/prompt-schema";

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { messages } = await request.json();

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "At least one message is required." },
                { status: 400 }
            );
        }

        const completion = await client.chat.completions.create({
            model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages,
            ],
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
            throw new Error("Empty response from AI provider.");
        }

        const parsed = promptResponseSchema.parse(JSON.parse(content));

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Prompt refinement error:", error);

        return NextResponse.json(
            { error: "Could not refine the prompt. Please try again." },
            { status: 500 }
        );
    }
}