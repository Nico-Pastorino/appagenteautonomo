import { NextResponse } from 'next/server'
import { openai } from '@/lib/ai/openai'

export async function GET() {
  const keyPreview = process.env.OPENAI_API_KEY
    ? `${process.env.OPENAI_API_KEY.slice(0, 12)}...`
    : '(no definida)'

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Respond with the single word: OK' }],
      max_tokens: 5,
    })
    return NextResponse.json({
      status: 'ok',
      model: 'gpt-4o-mini',
      keyPreview,
      response: res.choices[0].message.content,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[health]', message)
    return NextResponse.json({ status: 'error', keyPreview, error: message }, { status: 500 })
  }
}
