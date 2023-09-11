import boxen from 'boxen'
import pc from 'picocolors'

export enum ErrorType {
    AuthenticationError = 'AuthenticationError',
    InputError = 'InputError',
}

export function renderError(
    type: ErrorType,
    input: string | string[]
) {
    const message = Array.isArray(input)
        ? input.map(x => pc.red(x)).join('\n')
        : pc.red(input)

    console.error()
    console.error(
        boxen([
            pc.red(pc.bold(type)),
            message
        ].join('\n'), {
            borderColor: 'red',
            borderStyle: 'round',
            padding: 1
        })
    )
    console.error()
}

export function renderMessage(input: string | string[]) {
    const message = Array.isArray(input)
        ? input.join('\n')
        : input

    console.log()
    console.log(
        boxen(message, {
            borderColor: 'gray',
            borderStyle: 'round',
            padding: 1
        })
    )
    console.log()
}
