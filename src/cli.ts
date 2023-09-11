#!/usr/bin/env node

import 'dotenv/config'

import readline from 'node:readline'
import fs from 'node:fs/promises'
import path from 'node:path'

import { Command } from 'commander'
import OpenAI, { AuthenticationError } from 'openai'
import pc from 'picocolors'
import boxen from 'boxen'
import { z } from 'zod'
import clipboard from 'node-clipboardy'
// import * as dateFns from 'date-fns'
import inquirer from 'inquirer'

import { Config } from './config.js'
import { ErrorType, renderError, renderMessage } from './ui.js'
import { CONFIG_DIR_PATH, CONVO_HISTORY_PATH, PRESETS_PATH } from './const.js'
import { ArrayStore } from './fs-store.js'
import { getAllPresetNames, getAllPresets, getPreset, upsertPreset, presetForm, getActivePreset } from './presets.js'
import { serialize } from './utils.js'

const messageSchema = z.object({
    role: z.union([
        z.literal('user'),
        z.literal('assistant'),
        z.literal('system')
    ]),
    content: z.string()
})

type Message = z.TypeOf<typeof messageSchema>

async function main() {
    const program = new Command()

    const presetCommand = program
        .command('preset')

    presetCommand.command('new')
        .action(async () => {
            const preset = await presetForm()

            await fs.writeFile(
                path.join(PRESETS_PATH, preset.id + '.json'),
                serialize(preset),
                'utf8'
            )

            console.log()
            console.log(`Preset "${preset.name}" created.`)
            console.log()
        })

    presetCommand
        .command('list')
        .action(async () => {
            const allPresets = await getAllPresets()

            for (const p of allPresets) {
                console.log(pc.bold(p.name + ':'))

                if (p.description) {
                    console.log(pc.dim(p.description))
                }

                console.log('Provider: ' + p.provider)
                console.log('Model: ' + p.model)
                console.log('Temperature: ' + p.temperature)
                console.log()
            }
        })

    presetCommand
        .command('edit [preset]')
        .action(async (preset) => {
            const allPresetNames = await getAllPresetNames()

            if (!preset) {
                const presetResponse = await inquirer.prompt({
                    type: 'list',
                    name: 'preset',
                    choices: allPresetNames,
                })

                preset = presetResponse.preset
            }

            if (!allPresetNames.includes(preset)) {
                renderError(ErrorType.InputError, [
                    `Preset "${preset}" does not exist.`,
                    'Use `llm preset new` to create a new preset.'
                ])
                process.exit(1)
            }

            const updated = await presetForm({
                defaults: await getPreset(preset)
            })

            await upsertPreset(updated)
        })

    presetCommand
        .command('use [preset]')
        .action(async (preset) => {
            const allPresetNames = await getAllPresetNames()

            if (!preset) {
                const presetResponse = await inquirer.prompt({
                    name: 'preset',
                    type: 'list',
                    choices: allPresetNames,
                    message: 'Choose a preset',
                })

                console.log({ presetResponse })
                return
            }

            if (!allPresetNames.includes(preset.trim())) {
                renderError(ErrorType.InputError, [
                    `Preset "${preset}" does not exist.`,
                    'Use `llm preset new` to create a new preset.'
                ])
                process.exit(1)
            }
        })
        

    const historyCommand = program
        .command('history')
        .description('View and manage previous conversations history')

    historyCommand
        .command('view')
        .description('View past conversation history')
        .action(async () => {
            const allMessages = await getAllMessages()            

            if (!allMessages || allMessages.length === 0) {
                console.log(pc.dim('(No conversation history)'))
                console.log()
                return
            }

            // renderMessage(allMessages.map(({ messages, date }, i) => `${i + 1}: ${pc.dim(date)} "${messages.at(0).content}"`))
        })

    historyCommand
        .command('clear')
        .description('Clear all previous history')
        .action(async () => {
            // TODO: confirmation
            const files = await fs.readdir(path.join(CONFIG_DIR_PATH))

            for (const file of files) {
                if (file.trim() === 'config.json') continue
                await fs.unlink(path.join(CONFIG_DIR_PATH, file))
            }
        })

    program.command('chat')
        .description('Start a new conversation with ChatGPT')
        .option('-k, --apiKey <string>', "Set your OpenAI API key")
        .option('-t, --temperature <number>', "Set the default model temperature")
        .action(async (_, options: Partial<Config>) => {
            async function startConversation() {                    
                const conversationId = new Date().toISOString()            

                const conversation = new ArrayStore<Message>({
                    filepath: path.join(CONVO_HISTORY_PATH, conversationId + '.json')
                })

                const preset = await getActivePreset()

                const mergedConfig = {
                    ...preset,
                    ...options
                }

                if (!mergedConfig.apiKey) {
                    renderError(ErrorType.AuthenticationError, [
                        'Your OpenAI API key has not been set.',
                        'Use `gpt config set --apiKey=<YOUR API KEY>` to set it.'
                    ])

                    process.exit()
                }

                const openai = new OpenAI({
                    apiKey: mergedConfig.apiKey
                })

                readline.emitKeypressEvents(process.stdin)
                process.stdin.setRawMode(true)

                let isStreaming = false
                let controller = new AbortController()

                process.stdin.on('keypress', (_str, key) => {
                    if (key.sequence === '\u001b' && isStreaming) {
                        console.log(pc.dim('\n\n(Escape key pressed: Cancelling current completion)'))
                        controller.abort()
                        controller = new AbortController()
                        isStreaming = false
                    }
                })

                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                })

                console.log(boxen([
                    pc.bold('New chat conversation started'),
                    '',
                    pc.bold('Model: ') + mergedConfig.model,
                    pc.bold('Temperature: ') + mergedConfig.temperature,
                    '',
                    pc.dim(':quit to exit out of chat conversation'),
                    pc.dim(':help to see more options')
                ].join('\n'), {
                    padding: 1,
                    borderStyle: 'round',
                    borderColor: 'gray'
                }))

                function chat() { 
                    rl.question(pc.dim('[User]: '), async (input) => {                
                        if (input.trim() === ':quit' || input.trim() === ':q') {
                            rl.close()
                            process.exit(0)
                        }

                        if (input.trim() === ':new' || input.trim() === ':n') {
                            rl.close()
                            return startConversation()
                        }

                        if (input.trim() === ':help' || input.trim() === ':h') {
                            const dimmedDash = pc.dim('-')
                            renderMessage([
                                pc.bold('Converation Help:'),
                                '',
                                pc.bold('Model: ') + mergedConfig.model,
                                pc.bold('Temperature: ') + mergedConfig.temperature,
                                '',
                                `:quit, :q ${dimmedDash} Exit out of current convesation`,
                                `:new,  :n ${dimmedDash} Start a new convesation`,
                                `:copy, :c ${dimmedDash} Copy previous assistant message to clipboard`,
                                `:help, :h ${dimmedDash} View options`,
                            ])

                            return chat()
                        }

                        if (input.trim() === ':copy' || input.trim() === ':c') {
                            const message = conversation.at(-1)

                            if (message && message.role === 'assistant' && message.content) {
                                clipboard.writeSync(message.content)
                                console.log()
                                console.log(pc.dim('(Previous assitant message copied to clipboard)'))
                                console.log()
                            } else {
                                console.log()
                                console.log(pc.dim('(No previous assistant message)'))
                                console.log()
                            }

                            return chat()
                        }

                        if (input.startsWith(':')) {
                            console.log()
                            console.log(pc.dim('(Unknown command. Use :help to see available commands)'))
                            console.log()

                            return chat()
                        }

                        conversation.push({
                            role: 'user',
                            content: input
                        })

                        const stream = await openai.chat.completions.create({
                            model: mergedConfig.model ?? 'gpt-4',
                            temperature: mergedConfig.temperature ?? 0,
                            messages: JSON.parse(JSON.stringify(conversation.data)), // TODO
                            stream: true,
                        }, {
                            signal: controller.signal
                        }).catch((error) => {
                            if (error instanceof AuthenticationError) {
                                renderError(ErrorType.AuthenticationError, [
                                    'Are you sure your OpenAI token is correct?',
                                    'Set it using `gpt config set --apiKey=<YOUR API KEY>`',
                                ])
                                process.exit(0)
                            }

                            throw error
                        })

                        isStreaming = true
                        let content = ''
                        process.stdout.write(pc.dim('[Assistant]: '))

                        for await (const part of stream) {
                            const text = part.choices[0]?.delta?.content || ''
                            content += text
                            process.stdout.write(text);
                        }

                        isStreaming = false
                        conversation.push({
                            role: 'assistant',
                            content,
                        })

                        process.stdout.write('\n')

                        chat()
                    })
                }

                chat()
            } 

            await startConversation()
        })

    await program.parseAsync()
}

async function getAllMessages() {
    const files = await fs.readdir(CONVO_HISTORY_PATH)

    const allMessages: { date: Date, messages: Message[] }[] = []

    for (const file of files) {
        if (file.endsWith('.json') && file !== 'config.json') {
            const json = JSON.parse(await fs.readFile(path.join(CONVO_HISTORY_PATH, file), 'utf8'))
            const parsed = messageSchema.array().safeParse(json)

            if (!parsed.success) {
                renderMessage('Corrupted file detected: ' + file)
                continue
            }

            // allMessages.push({
            //     date: dateFns.format(dateFns.parseISO(file.replace('.json', '')), 'MM/dd hh:mm') as Date,
            //     messages: parsed.data
            // })
         }
    }

    return allMessages
}

function parseTemperature(temp: unknown) {
    const number = Number(temp)

    if (isNaN(number)) {
        throw new Error('Temperature must be a number')
    }

    const parsed = z.number().gte(0).lte(1).safeParse(number)

    if (!parsed.success) {
        throw new Error('Temperature must be a number betweent 0 and 1')
    }

    return parsed.data
}

main()

