import fs from 'node:fs'

import { z } from 'zod'

import { CONFIG_DIR_PATH, CONFIG_FILE_PATH, CONVO_HISTORY_PATH } from './const.js'
import { Store } from './fs-store.js'

// | 'gpt-4'
// | 'gpt-4-0314'
// | 'gpt-4-0613'
// | 'gpt-4-32k'
// | 'gpt-4-32k-0314'
// | 'gpt-4-32k-0613'
// | 'gpt-3.5-turbo'
// | 'gpt-3.5-turbo-16k'
// | 'gpt-3.5-turbo-0301'
// | 'gpt-3.5-turbo-0613'
// | 'gpt-3.5-turbo-16k-0613';

const MODEL = {
    GPT4: 'gpt-4',
    GPTTurbo: 'gpt-3.5-turbo',
}

const configSchema = z.object({
    model: z.string(),
    temperature: z.number().gte(0).lte(1),
    apiKey: z.string().nullable()
})

export type Config = z.infer<typeof configSchema>

const configDefaults = {
    model: MODEL.GPT4,
    temperature: 0,
    apiKey: null,
} satisfies Config


if (!fs.existsSync(CONFIG_DIR_PATH)) {
    fs.mkdirSync(CONFIG_DIR_PATH)
}

if (!fs.existsSync(CONFIG_FILE_PATH)) {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configDefaults, null, 4))
}

if (!fs.existsSync(CONVO_HISTORY_PATH)) {
    fs.mkdirSync(CONVO_HISTORY_PATH)
}

export const config = new Store<Config>({
    filepath: CONFIG_FILE_PATH,
    defaults: configDefaults,
})

