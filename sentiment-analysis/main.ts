import { interval, intervalToDuration, formatDuration } from 'date-fns'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { finished } from 'node:stream/promises'
import csv from 'csv-parser'

async function main() {
  const startAt = new Date()

  const statements: string[] = []

  const stream = createReadStream(join('data', 'test-100.csv'))
    .pipe(csv())
    .on('data', (data) => {
      if (!('textID' in data)) {
        return
      }
      if (typeof data.textID !== 'string') {
        return
      }
      if (data.textID.length === 0) {
        return
      }

      statements.push(data)
    })

  await finished(stream)

  let missCounter = 0

  for (const statement of statements) {
    // @ts-expect-error
    const sentiment = await evaluateSentiment(statement.text)

    // @ts-expect-error
    if (sentiment !== statement.sentiment) {
      missCounter++

      console.log(
        // @ts-expect-error
        statement.textID,
        // @ts-expect-error
        `expected: ${statement.sentiment}, given: ${sentiment} --- error rate: ${(missCounter / statements.length) * 100}%`,
      )
    }
  }

  console.log(`error rate: ${(missCounter / statements.length) * 100}`)

  console.log(
    'processing duration: ',
    formatDuration(intervalToDuration(interval(startAt, new Date()))),
  )
}

main().catch((e: Error) => {
  console.error(e, e.stack)
})

async function evaluateSentiment(text: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      stream: false,
      model: 'llama3.1',
      prompt: `
        ----------------------${text}----------------------
        What sentiment \`positive\`, \`neutral\` or \`negative\` is the most accurate for the text between \`----------------------\`?
        Do not justify your answer.
        If you don't know the answer, return \`unknown\`.
        Your response MUST ONLY be one of the following \`positive\`, \`neutral\`, \`negative\` or \`unknown\`.
        No punctuation.
      `,
    }),
  })

  if (!response.ok) {
    throw new Error(`fetch fail: ${response.status}`)
  }

  const content = await response.json()

  return content.response.toLowerCase()
}
