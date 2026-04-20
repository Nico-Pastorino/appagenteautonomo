import OpenAI from 'openai'

const globalForOpenAI = globalThis as unknown as { openai: OpenAI }

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

if (process.env.NODE_ENV !== 'production') globalForOpenAI.openai = openai
