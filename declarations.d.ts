declare module 'node-clipboardy' {
    export function write(text: string): Promise<void>
    export function read(): Promise<string | undefined>
    export function writeSync(text: string): void
    export function readSync(): string | void
}
