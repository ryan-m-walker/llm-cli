import Anthropic from '@anthropic-ai/sdk'

import { ChatOptions, LLMClient, Message } from "./index.js";

export class AnthropicClient implements LLMClient {
    private client: Anthropic

    constructor(apiKey: string) {
        this.client = new Anthropic({
            apiKey,
        })
    }

    async *chat(options: ChatOptions) {
        const prompt = this.messagesToAnthropicPrompt(options.messages)

        const stream = await this.client.completions.create({
            prompt,
            model: options.model,
            stream: true,
            max_tokens_to_sample: 300,
        }, {
            signal: options.signal
        })

        for await (const completion of stream) {
            yield completion.completion
        }
    }
    
    private messagesToAnthropicPrompt(messages: Message[]) {
        return messages
            .map((message) => `${this.roleToAnthropicRole(message.role)} ${message.content}`)
            .concat([Anthropic.AI_PROMPT])
            .join('')
    }

    private roleToAnthropicRole(role: Message['role']) {
        switch (role) {
            case 'user':
            case 'system':
                return Anthropic.HUMAN_PROMPT
            case 'assistant':
                return Anthropic.AI_PROMPT
        }
    }
}
