import OpenAI from 'openai'

const globalForOpenAI = globalThis as unknown as { openai: OpenAI }

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  })

globalForOpenAI.openai = openai
