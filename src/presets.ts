import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

import inquirer from 'inquirer'

import { PRESETS_PATH } from './const.js'
import { LLMProvider, PROVIDER_MODELS, config } from './config.js'
import { ErrorType, renderError } from './ui.js'
import { serialize } from './utils.js'

function makeId() {
    return crypto.randomBytes(8).toString('hex')
}

export type Preset = {
    id: string
    name: string
    provider: LLMProvider
    model: string
    temperate: number
    description?: string
    apiKey: string
}

export async function getAllPresetNames() {
    const allPreset = await getAllPresets()
    return allPreset.map(p => p.name)
}

export async function getAllPresets() {
    const files = await fs.readdir(PRESETS_PATH)

    const presets = await Promise.all(files.map(async (file) => {
        const string = await fs.readFile(path.join(PRESETS_PATH, file), 'utf8')
        const json = JSON.parse(string)
        return json
    }))

    return presets
}

export async function getPreset(name: string): Promise<Preset> {
    const allPreset = await getAllPresets()
    const preset = allPreset.find(p => p.name === name)

    if (!preset) {
        renderError(ErrorType.InputError, `Preset "${name}" does not exist`)
        process.exit(1)
    }

    return preset
}

export async function upsertPreset(preset: Preset) {
    await fs.writeFile(
        path.join(PRESETS_PATH, preset.id + '.json'),
        serialize(preset),
        'utf8'
    )
}

export async function getActivePreset() {
    const activePrest = config.get('activePreset')
    const string = await fs.readFile(path.join(PRESETS_PATH, activePrest + '.json'), 'utf8')
    return JSON.parse(string)
}

type PresetFormOptions = {
    defaults?: Partial<Preset>
}

export async function presetForm(options: PresetFormOptions = {}) {
    const existing = await getAllPresetNames()

    const nameResponse = await inquirer.prompt<{ name: string }>({
        type: 'input',
        name: 'name',
        default: options.defaults?.name,
        message: 'What would you like to name your preset?',
        validate(value) {
            if (!value) return 'Name is required'

            if (value.trim() === options.defaults?.name) return true

            if (existing.includes(value.trim())) {
                return `Preset name "${value.trim()}" already exists.`
            } 

            return true 
        },
    })

    const descriptionResponse = await inquirer.prompt<{ description: string }>({
        type: 'input',
        name: 'description',
        default: options.defaults?.description || undefined,
        message: 'What description would you like to give your preset? (Optional)',
    })

    const providerResponse = await inquirer.prompt<{ provider: string }>({
        type: 'list',
        name: 'provider',
        message: 'Which LLM provider would you like to use?',
        default: options.defaults?.provider,
        choices: Object.values(LLMProvider)
    })

    const apiKeyResponse = await inquirer.prompt({
        type: 'input',
        name: 'apiKey',
        message: `What is your ${providerResponse.provider} API key?`,
        default: options.defaults?.apiKey,
        validate(value) {
            if (!value) return 'API key is required'
            return true
        }
    })

    const models = providerResponse.provider === LLMProvider.OpenAI
        ? PROVIDER_MODELS[LLMProvider.OpenAI]
        : PROVIDER_MODELS[LLMProvider.Anthropic]

    const modelResponse = await inquirer.prompt({
        type: 'list',
        loop: false,
        name: 'model',
        default: options.defaults?.model,
        message: 'Which LLM would you like to use?',
        choices: models
    })

    const temperatureResponse = await inquirer.prompt({
        type: 'number',
        name: 'temperature',
        default: options.defaults?.temperate ?? 0,
        message: 'What model temperate would you like to use?',
    })


    const preset: Preset = {
        id: options.defaults?.id || makeId(),
        ...nameResponse,
        ...providerResponse,
        ...apiKeyResponse,
        ...modelResponse,
        ...temperatureResponse,
        ...descriptionResponse,
    }

    return preset
}
