import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY no está definida en .env')
}

const globalForOpenAI = globalThis as unknown as { openai: OpenAI }

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

globalForOpenAI.openai = openai
