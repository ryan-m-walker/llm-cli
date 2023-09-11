import path from "node:path"
import os from 'node:os'

export const CONFIG_DIR_PATH = path.join(os.homedir(), '.llm-cli')
export const CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, 'config.json')
export const CONVO_HISTORY_PATH = path.join(CONFIG_DIR_PATH, 'history')
export const PRESETS_PATH = path.join(CONFIG_DIR_PATH, 'presets')

