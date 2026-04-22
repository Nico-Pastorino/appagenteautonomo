import OpenAI from 'openai'

if (!process.env.CEREBRAS_API_KEY) {
  throw new Error('CEREBRAS_API_KEY no está definida en .env')
}

const globalForOpenAI = globalThis as unknown as { openai: OpenAI }

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1',
  })

globalForOpenAI.openai = openai
