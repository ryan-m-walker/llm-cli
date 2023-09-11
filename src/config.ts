import fs from 'node:fs'

import { z } from 'zod'

import { CONFIG_DIR_PATH, CONFIG_FILE_PATH, CONVO_HISTORY_PATH, PRESETS_PATH } from './const.js'
import { Store } from './fs-store.js'
import { serialize } from './utils.js'

export enum LLMProvider {
    OpenAI = 'OpenAI',
    Anthropic = 'Anthropic',
}

export const OPENAI_MODELS = {
    'gpt-4': 'gpt-4',
    'gpt-4-0314': 'gpt-4-0314',
    'gpt-4-0613': 'gpt-4-0613',
    'gpt-4-32k': 'gpt-4-32k',
    'gpt-4-32k-0314':'gpt-4-32k-0314',
    'gpt-4-32k-0613': 'gpt-4-32k-0613',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-0301': 'gpt-3.5-turbo-0301',
    'gpt-3.5-turbo-0613': 'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo-16k-0613': 'gpt-3.5-turbo-16k-0613',
} as const

export const ANTHROPIC_MODELS = {
    'claude-2': 'claude-2',
    'claude-instant-1.2': 'claude-instant-1.2',
    'claude-instant-v1': 'claude-instant-v1',
    'claude-instant-v1-100k': 'claude-instant-v1-100k',
    'claude-v1': 'claude-v1',
    'claude-v1-100k': 'claude-v1-100k',
}

export const PROVIDER_MODELS = {
    [LLMProvider.OpenAI]: Object.values(OPENAI_MODELS),
    [LLMProvider.Anthropic]: Object.values(ANTHROPIC_MODELS),
}

const configSchema = z.object({
    model: z.string(),
    temperature: z.number().gte(0).lte(1),
    apiKey: z.string().nullable()
})

export type Config = z.infer<typeof configSchema>

const configDefaults = {
    model: OPENAI_MODELS['gpt-3.5-turbo'],
    temperature: 0,
    apiKey: null,
} satisfies Config


if (!fs.existsSync(CONFIG_DIR_PATH)) {
    fs.mkdirSync(CONFIG_DIR_PATH)
}

if (!fs.existsSync(CONFIG_FILE_PATH)) {
    fs.writeFileSync(CONFIG_FILE_PATH, serialize(configDefaults))
}

if (!fs.existsSync(CONVO_HISTORY_PATH)) {
    fs.mkdirSync(CONVO_HISTORY_PATH)
}

if (!fs.existsSync(PRESETS_PATH)) {
    fs.mkdirSync(PRESETS_PATH)
}

export const config = new Store<Config>({
    filepath: CONFIG_FILE_PATH,
    defaults: configDefaults,
})

