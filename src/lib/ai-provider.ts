import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AIGenerateOptions {
    systemPrompt: string;
    userText: string;
    image: { base64: string; mimeType: string };
    temperature?: number;
    jsonSchema?: Record<string, unknown>;
}

export interface AIProvider {
    generate(options: AIGenerateOptions): Promise<string>;
}

const DEFAULT_MODELS: Record<string, string> = {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o',
    claude: 'claude-sonnet-4-20250514',
};

// Convert a plain JSON Schema object to Gemini's Schema format
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
    if (typeof schema !== 'object' || schema === null) return schema;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
        if (key === 'type') {
            const typeMap: Record<string, unknown> = {
                object: Type.OBJECT,
                array: Type.ARRAY,
                string: Type.STRING,
                integer: Type.INTEGER,
                number: Type.NUMBER,
                boolean: Type.BOOLEAN,
            };
            result.type = typeMap[value as string] ?? value;
        } else if (key === 'properties' && typeof value === 'object' && value !== null) {
            const props: Record<string, unknown> = {};
            for (const [pk, pv] of Object.entries(value as Record<string, unknown>)) {
                props[pk] = toGeminiSchema(pv as Record<string, unknown>);
            }
            result.properties = props;
        } else if (key === 'items' && typeof value === 'object' && value !== null) {
            result.items = toGeminiSchema(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result;
}

class GeminiProvider implements AIProvider {
    private ai: GoogleGenAI;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
    }

    async generate(options: AIGenerateOptions): Promise<string> {
        const config: Record<string, unknown> = {
            systemInstruction: options.systemPrompt,
            temperature: options.temperature ?? 0.1,
        };

        if (options.jsonSchema) {
            config.responseMimeType = 'application/json';
            config.responseSchema = toGeminiSchema(options.jsonSchema);
        }

        const response = await this.ai.models.generateContent({
            model: this.model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: options.image.base64, mimeType: options.image.mimeType } },
                        { text: options.userText },
                    ],
                },
            ],
            config,
        });

        return response.text || '';
    }
}

class OpenAIProvider implements AIProvider {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async generate(options: AIGenerateOptions): Promise<string> {
        const imageUrl = `data:${options.image.mimeType};base64,${options.image.base64}`;

        const responseFormat: Record<string, unknown> | undefined = options.jsonSchema
            ? {
                type: 'json_schema',
                json_schema: {
                    name: 'response',
                    strict: false,
                    schema: options.jsonSchema,
                },
            }
            : undefined;

        const response = await this.client.chat.completions.create({
            model: this.model,
            temperature: options.temperature ?? 0.1,
            messages: [
                { role: 'system', content: options.systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: imageUrl } },
                        { type: 'text', text: options.userText },
                    ],
                },
            ],
            ...(responseFormat ? { response_format: responseFormat } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        return response.choices[0]?.message?.content || '';
    }
}

class ClaudeProvider implements AIProvider {
    private client: Anthropic;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }

    async generate(options: AIGenerateOptions): Promise<string> {
        let userText = options.userText;
        if (options.jsonSchema) {
            userText += '\n\nYou MUST respond with ONLY valid JSON matching this schema (no markdown, no extra text):\n' + JSON.stringify(options.jsonSchema, null, 2);
        }

        const mediaType = options.image.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            temperature: options.temperature ?? 0.1,
            system: options.systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: { type: 'base64', media_type: mediaType, data: options.image.base64 },
                        },
                        { type: 'text', text: userText },
                    ],
                },
            ],
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        return textBlock && 'text' in textBlock ? textBlock.text : '';
    }
}

export function getAIProvider(): AIProvider {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || DEFAULT_MODELS[provider] || DEFAULT_MODELS.gemini;

    if (!apiKey) {
        throw new Error('AI_API_KEY environment variable is not set. Please configure it in .env.local');
    }

    switch (provider) {
        case 'gemini':
            return new GeminiProvider(apiKey, model);
        case 'openai':
            return new OpenAIProvider(apiKey, model);
        case 'claude':
            return new ClaudeProvider(apiKey, model);
        default:
            throw new Error(`Unknown AI_PROVIDER "${provider}". Supported: gemini, openai, claude`);
    }
}
