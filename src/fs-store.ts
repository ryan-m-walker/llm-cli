import fs from 'node:fs'

type StoreOptions<T extends Record<string, unknown>> = {
    filepath: string
    defaults: T
}

export class Store<T extends Record<string, unknown>> {
    private filepath: string
    private defaults: T
    private _data: T

    get data() {
        return Object.freeze(this._data)
    }

    constructor(options: StoreOptions<T>) {
        this.filepath = options.filepath
        this.defaults = options.defaults

        if (fs.existsSync(this.filepath)) {
            const json = JSON.parse(fs.readFileSync(this.filepath, 'utf8'))
            this._data = json
        } else {
            this._data = options.defaults
        }
    }

    get<K extends keyof T>(key: K): T[K] {
        return this._data[key]
    }

    set<K extends keyof T>(key: K, value: T[K]) {
        this._data[key] = value
        fs.writeFileSync(this.filepath, JSON.stringify(this._data), 'utf8')
    }

    reset() {
        this._data = this.defaults
        fs.writeFileSync(this.filepath, JSON.stringify(this._data), 'utf8')
    }

    values() {
        return Object.values(this._data)
    }

    keys() {
        return Object.keys(this._data)
    }
}

type ArrayStoreOptions = {
    filepath: string
}

export class ArrayStore<T> {
    private filepath: string
    private _data: T[] = []

    get data(): Array<T> {
        return [...this._data]
    }

    constructor(options: ArrayStoreOptions) {
        this.filepath = options.filepath

        if (fs.existsSync(this.filepath)) {
            const json = JSON.parse(fs.readFileSync(this.filepath, 'utf8'))
            this._data = json
        } 
    }

    push(value: T) {
        this._data.push(value)
        fs.writeFileSync(this.filepath, JSON.stringify(this._data), 'utf8')
    }

    at(index: number): T | undefined {
        return this._data.at(index)
    }
}

