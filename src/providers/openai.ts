import OpenAI, { AuthenticationError } from "openai";

import { ChatOptions, type LLMClient } from "./index.js";
import { ErrorType, renderError } from "../ui.js";

export class OpenAIClient implements LLMClient {
    private client: OpenAI

    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey,
        })
    }

    async *chat(
        options: ChatOptions
    ) {
        const stream = await this.client.chat.completions.create({
            model: options.model,
            temperature: options.temperature,
            messages: options.messages, 
            stream: true,
        }, {
            signal: options.signal
        }).catch((error: unknown) => {
            if (error instanceof AuthenticationError) {
                renderError(ErrorType.AuthenticationError, [
                    'Are you sure your OpenAI token is correct?',
                    'Set it using `gpt config set --apiKey=<YOUR API KEY>`',
                ])
                process.exit(0)
            }

            throw error
        })


        for await (const part of stream) {
            yield part.choices[0]?.delta?.content || ''  
        }
    }
}
