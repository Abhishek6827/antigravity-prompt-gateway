import OpenAI from "openai";
import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { promptResponseSchema } from "@/lib/prompt-schema";

const openRouterClient = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "dummy",
});

const cerebrasClient = new OpenAI({
    baseURL: "https://api.cerebras.ai/v1",
    apiKey: process.env.CEREBRAS_API_KEY || "dummy",
});

const nvidiaClient = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY || "dummy",
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

function parseAndValidate(content: string) {
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```/, "").replace(/```$/, "").trim();
    }
    return promptResponseSchema.parse(JSON.parse(cleanContent));
}

// Vision Models Fallback Chain
async function callVisionModelsWithFallback(messages: any[], modifiedSystemPrompt: string) {
    const errors: string[] = [];

    // 1. OpenRouter (Qwen 2.5 VL)
    try {
        console.log("[Vision] Trying OpenRouter (qwen/qwen-2.5-vl-72b-instruct:free)...");
        const completion = await openRouterClient.chat.completions.create({
            model: "qwen/qwen-2.5-vl-72b-instruct:free",
            temperature: 0.2,
            max_tokens: 2048,
            messages: [
                { role: "system", content: modifiedSystemPrompt },
                ...messages,
            ],
        });
        const content = completion.choices[0]?.message?.content || "";
        if (content) return parseAndValidate(content);
    } catch (e: any) {
        errors.push(`OpenRouter (Qwen): ${e.message}`);
    }

    // 2. Groq Vision (llama-3.2-11b-vision-preview)
    try {
        console.log("[Vision] Trying Groq (llama-3.2-11b-vision-preview)...");
        const completion = await groqClient.chat.completions.create({
            model: "llama-3.2-11b-vision-preview",
            temperature: 0.2,
            max_tokens: 2048,
            messages: [
                { role: "system", content: modifiedSystemPrompt },
                ...messages,
            ],
        });
        const msg = completion.choices[0]?.message as any;
        const content = msg?.content || "";
        if (content) return parseAndValidate(content);
    } catch (e: any) {
        errors.push(`Groq (Vision): ${e.message}`);
    }

    throw new Error(`Vision models failed:\n${errors.join('\n')}`);
}

// Text Models Fallback Chain
async function callTextModelsWithFallback(messages: any[]) {
    const errors: string[] = [];
    const textPrompt = SYSTEM_PROMPT;

    // 1. Nvidia (nvidia/nemotron-3-ultra-550b-a55b)
    try {
        console.log("[Text] Trying Nvidia (nvidia/nemotron-3-ultra-550b-a55b)...");
        const completion = await nvidiaClient.chat.completions.create({
            model: "nvidia/nemotron-3-ultra-550b-a55b",
            temperature: 0.2,
            max_tokens: 2048,
            messages: [
                { role: "system", content: textPrompt },
                ...messages,
            ],
        });
        const content = completion.choices[0]?.message?.content || "";
        if (content) return parseAndValidate(content);
    } catch (e: any) {
        errors.push(`Nvidia (nemotron-3-ultra): ${e.message}`);
    }

    // 2. Groq (llama-3.3-70b-versatile)
    try {
        console.log("[Text] Trying Groq (llama-3.3-70b-versatile)...");
        const completion = await groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 2048,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: textPrompt },
                ...messages,
            ],
        });
        const msg = completion.choices[0]?.message as any;
        const content = msg?.content || "";
        if (content) return parseAndValidate(content);
    } catch (e: any) {
        errors.push(`Groq (llama-3.3-70b-versatile): ${e.message}`);
    }

    // 3. Cerebras (gpt-oss-120b)
    try {
        console.log("[Text] Trying Cerebras (gpt-oss-120b)...");
        const completion = await cerebrasClient.chat.completions.create({
            model: "gpt-oss-120b",
            temperature: 0.2,
            max_tokens: 2048,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: textPrompt },
                ...messages,
            ],
        });
        const content = completion.choices[0]?.message?.content || "";
        if (content) return parseAndValidate(content);
    } catch (e: any) {
        errors.push(`Cerebras (gpt-oss-120b): ${e.message}`);
    }

    // 4. OpenRouter (openrouter/free)
    try {
        console.log("[Text] Trying OpenRouter (openrouter/free)...");
        const completion = await openRouterClient.chat.completions.create({
            model: "openrouter/free",
            temperature: 0.2,
            max_tokens: 2048,
            messages: [
                { role: "system", content: textPrompt },
                ...messages,
            ],
        });
        const content = completion.choices[0]?.message?.content || "";
        if (content) return parseAndValidate(content);
    } catch (e: any) {
        errors.push(`OpenRouter (openrouter/free): ${e.message}`);
    }

    throw new Error(`Text models failed:\n${errors.join('\n')}`);
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
        let parsed;

        if (isVisionReq) {
            const visionInstruction = "\n\nCRITICAL VISION INSTRUCTION: The user has attached an image/screenshot. Carefully analyze the image. You MUST set status to 'ready' (do NOT ask clarification questions) unless the image is completely unreadable. In finalPrompt, write a detailed, implementation-ready prompt that explicitly describes all visual elements, UI components, error messages, layout bugs, or text shown in the screenshot so Antigravity has 100% of the visual context in text format.";
            const modifiedSystemPrompt = SYSTEM_PROMPT + visionInstruction + "\n\nIMPORTANT: You must return ONLY a valid JSON object matching the requested schema. No markdown wrapping, no extra text.";
            
            parsed = await callVisionModelsWithFallback(messages, modifiedSystemPrompt);
        } else {
            parsed = await callTextModelsWithFallback(messages);
        }

        if (!parsed) {
            throw new Error("Empty response from AI provider fallback chain.");
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Prompt refinement error:", error);
        
        let errorMessage = "Could not refine the prompt. Please try again.";
        if (error instanceof Error) {
            console.error(error.message);
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}