import OpenAI from "openai";
import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { promptResponseSchema } from "@/lib/prompt-schema";

const openRouterClient = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY || "dummy",
});

function hasImage(messages: any[]): boolean {
    return messages.some(msg => 
        Array.isArray(msg.content) && 
        msg.content.some((item: any) => item.type === "image_url")
    );
}

export async function POST(request: Request) {
    try {
        const { messages } = await request.json();

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "At least one message is required." },
                { status: 400 }
            );
        }

        const isVisionReq = hasImage(messages);
        let content = "";

        if (isVisionReq) {
            const visionInstruction = "\n\nCRITICAL VISION INSTRUCTION: The user has attached an image/screenshot. Carefully analyze the image. You MUST set status to 'ready' (do NOT ask clarification questions) unless the image is completely unreadable. In finalPrompt, write a detailed, implementation-ready prompt that explicitly describes all visual elements, UI components, error messages, layout bugs, or text shown in the screenshot so Antigravity has 100% of the visual context in text format.";
            const modifiedSystemPrompt = SYSTEM_PROMPT + visionInstruction + "\n\nIMPORTANT: You must return ONLY a valid JSON object matching the requested schema. No markdown wrapping, no extra text.";
            
            // Use OpenRouter with openrouter/free for vision requests as it properly parses base64 images
            const completion = await openRouterClient.chat.completions.create({
                model: process.env.OPENROUTER_VISION_MODEL || "openrouter/free",
                temperature: 0.2,
                max_tokens: 2048,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: modifiedSystemPrompt },
                    ...messages,
                ],
            });
            content = completion.choices[0]?.message?.content || "";
        } else {
            const completion = await openRouterClient.chat.completions.create({
                model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
                temperature: 0.2,
                max_tokens: 2048,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...messages,
                ],
            });
            content = completion.choices[0]?.message?.content || "";
        }

        if (!content) {
            throw new Error("Empty response from AI provider.");
        }

        // Clean up markdown block if the model ignores JSON mode
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
            cleanContent = cleanContent.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (cleanContent.startsWith("```")) {
            cleanContent = cleanContent.replace(/^```/, "").replace(/```$/, "").trim();
        }

        const parsed = promptResponseSchema.parse(JSON.parse(cleanContent));

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Prompt refinement error:", error);

        return NextResponse.json(
            { error: "Could not refine the prompt. Please try again." },
            { status: 500 }
        );
    }
}