import { interval, intervalToDuration, formatDuration } from 'date-fns'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import csv from 'csv-parser'

async function main() {
  const startAt = new Date()

  const statements: string[] = []

  const calibrationEmbeddings = await computeVectorEmbeddings('calibration')

  const vectorLength = calibrationEmbeddings.length

  const negativeAcc = new Float64Array(vectorLength)
  const positiveAcc = new Float64Array(vectorLength)
  const neutralAcc = new Float64Array(vectorLength)

  const stream = createReadStream(join('data', 'test.csv')).pipe(csv())

  for await (const record of stream) {
    if (!('sentiment' in record)) {
      continue
    }
    if (typeof record.sentiment !== 'string') {
      continue
    }

    const embedding = await computeVectorEmbeddings(record.text)

    switch (record.sentiment) {
      case 'negative':
        // negativeAcc(vec)
        break
      case 'neutral':
        // neutralAcc(vec)
        break
      case 'positive':
        // positiveAcc(vec)
        break
    }
  }

  process.exit()

  let missCounter = 0

  for (const statement of statements) {
    // @ts-expect-error
    const sentiment = await evaluateSentiment(statement.text)

    // @ts-expect-error
    if (sentiment !== statement.sentiment) {
      missCounter++

      // @ts-expect-error
      console.log(
        statement.textID,
        `expected: ${statement.sentiment}, given: ${sentiment} --- error rate: ${(missCounter / statements.length) * 100}`,
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

// async function evaluateSentiment(text: string) {
//   const response = await fetch('http://localhost:11434/api/generate', {
//     method: 'POST',
//     body: JSON.stringify({
//       "stream": false,
//       "model": "llama3.1",
//       "prompt": `
//         ----------------------${text}----------------------
//         How most people will consider the previous sentence between \`----------------------\`?
//         Do not justify your answer.
//         If you don't know the answer, return \`unknown\`.
//         Your response MUST ONLY be one of the following \`positive\`, \`neutral\`, \`negative\` or \`unknown\`.
//         No punctuation.
//       `
//     })
//   })

//   if (!response.ok) {
//     throw new Error(`fetch fail: ${response.status}`)
//   }

//   const content = await response.json()

//   return content.response.toLowerCase()
// }

async function computeVectorEmbeddings(prompt: string) {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      stream: false,
      model: 'nomic-embed-text',
      prompt,
    }),
  })

  if (!response.ok) {
    throw new Error(`fetch fail: ${response.status}`)
  }

  const content = await response.json()

  return new Float64Array(content.embedding)
}
