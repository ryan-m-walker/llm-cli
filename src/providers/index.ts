import { LLMProvider } from "../config.js";
import { AnthropicClient } from "./anthropic.js";
import { OpenAIClient } from "./openai.js";

export type Message = {
    role: 'system' | 'assistant' | 'user'
    content: string
}

type Completion = string

export type ChatOptions = {
    temperature: number
    messages: Message[]
    model: string
    signal: AbortSignal
}

export interface LLMClient {
    chat(options: ChatOptions): AsyncGenerator<Completion>
}

type GetLLMProviderOptions = {
    provider: LLMProvider
    apiKey: string
}

export function getLLMClient(options: GetLLMProviderOptions): LLMClient {
    switch (options.provider) {
        case LLMProvider.OpenAI:
            return new OpenAIClient(options.apiKey)
        case LLMProvider.Anthropic:
            return new AnthropicClient(options.apiKey)
    }
}
