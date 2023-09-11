export function serialize(input: unknown) {
    console.log()
    return JSON.stringify(input, (_key, value) => {
        if (value === undefined) return
        return value
    }, 4)
}
