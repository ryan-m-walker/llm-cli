import fs from 'node:fs/promises'
import path from 'node:path'

import { PRESETS_PATH } from './const.js'

export async function getAllPresetNames() {
    const files = await fs.readdir(PRESETS_PATH)
    return files.map(f => f.replace('.json', ''))
}

export async function getAllPresets() {
    const files = await fs.readdir(PRESETS_PATH)

    const presets = await Promise.all(files.map(async (file) => {
        const string = await fs.readFile(path.join(PRESETS_PATH, file), 'utf8')
        const json = JSON.parse(string)
        return {
            name: file.replace('.json', ''),
            ...json
        }
    }))

    return presets
}
