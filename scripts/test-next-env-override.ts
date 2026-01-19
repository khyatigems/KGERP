import { loadEnvConfig } from '@next/env'

process.env.DATABASE_URL = "BAD_VALUE"
const projectDir = process.cwd()
const { combinedEnv } = loadEnvConfig(projectDir)

console.log("Process Env:", process.env.DATABASE_URL)
console.log("Combined Env:", combinedEnv.DATABASE_URL)
