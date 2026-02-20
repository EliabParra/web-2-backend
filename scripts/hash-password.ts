import bcrypt from 'bcryptjs'

function usage() {
    console.log('Usage: pnpm run hashpw -- <plainPassword> [saltRounds]')
    console.log('Example: pnpm run hashpw -- "MyPassword123" 10')
}

let args = process.argv.slice(2)
if (args[0] === '--') {
    args = args.slice(1)
}

const plainPassword = args[0]
const saltRoundsRaw = args[1]

if (!plainPassword) {
    usage()
    process.exit(1)
}

const saltRounds = saltRoundsRaw ? Number(saltRoundsRaw) : 10
if (!Number.isFinite(saltRounds) || saltRounds < 4 || saltRounds > 15) {
    console.error('saltRounds must be a number between 4 and 15')
    process.exit(1)
}

const hash = await bcrypt.hash(plainPassword, saltRounds)
console.log(hash)
