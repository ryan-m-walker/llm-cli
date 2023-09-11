import { Command, InvalidArgumentError } from 'commander'
import OpenAI from 'openai'

import { pushMessage } from '../convo'

export function registerPromptCommand(program: Command) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_KEY ?? ''
    })

    program.command('prompt')
        .description('Send a prompt to ChatGPT')
        .option('-t, --temp <number>', 'The model temperature')
        .option('-m, --model <model>')
        .argument('<prompt...>', 'The user message to send to ChatGPT')
        .action(async (input: string[], options) => {
            const prompt = input.join(' ')

            pushMessage({
                role: 'user',
                content: prompt
            })

            const temp = parseTemp(options.temp)

            const stream = await openai.chat.completions.create({
                model: options.model ?? 'gpt-4',
                temperature: temp,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
            });

            let content = ''

            for await (const part of stream) {
                const text = part.choices[0]?.delta?.content || ''
                content += text
                process.stdout.write(text);
            }

            process.stdout.write('\n')

            pushMessage({
                role: 'assistant',
                content,
            })
        })
}

function parseTemp(value?: string) {
    if (!value) return 0

    const parsed = Number(value)

    if (isNaN(parsed)) {
        throw new InvalidArgumentError('Temp must be a number')
    }

    if (parsed < 0 || parsed > 1) {
        throw new InvalidArgumentError('Temp must be a value between 0 and 1.');
    }

    return parsed
}
