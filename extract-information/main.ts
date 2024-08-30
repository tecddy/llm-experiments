import {
  Settings,
  Ollama,
  OllamaEmbedding,
  VectorStoreIndex,
  type QueryEngine,
  SimpleDirectoryReader,
} from 'llamaindex'
import { join } from 'node:path'
import { interval, intervalToDuration, formatDuration } from 'date-fns'
import z from 'zod'

Settings.llm = new Ollama({
  model: 'llama3.1',
})

Settings.embedModel = new OllamaEmbedding({
  model: 'llama3.1',
})

const DATA_PATH = join(__dirname, 'data')

async function main() {
  const startAt = new Date()

  console.log('parsing...')

  const documents = await new SimpleDirectoryReader().loadData(DATA_PATH)

  if (documents.length === 0) {
    throw new Error(`No document found. ${DATA_PATH}`)
  }

  console.log('indexing...')
  const index = await VectorStoreIndex.fromDocuments(documents)

  const queryEngine = index.asQueryEngine()

  console.log('querying...')

  const professionalExperiences =
    await extractCandidateProfessionalExperiences(queryEngine)

  const fullName = await extractCandidateFullName(queryEngine)

  console.log('======================')
  console.log(
    JSON.stringify(
      {
        professionalExperiences,
        fullName,
      },
      null,
      2,
    ),
  )
  console.log('======================')

  console.log(
    'processing duration: ',
    formatDuration(intervalToDuration(interval(startAt, new Date()))),
  )
}

main().catch((e: Error) => {
  console.error(e, e.stack)
})

const zCandidateProfessionalExperiences = z.array(
  z.object({
    jobTitle: z.string(),
    period: z.string(),
    company: z.string(),
  }),
)

export async function extractCandidateProfessionalExperiences(
  queryEngine: QueryEngine,
): Promise<z.infer<typeof zCandidateProfessionalExperiences> | null> {
  const query = `
      List the professional experiences of the candidate.
      Each professional experience should have a job title, a period of time, and a company.
      Return as a JSON array of object, NOT nested.
      DO NOT use Markdown notation.
      Return ONLY JSON.
      Use \`jobTitle\` as key for job title.
      Use \`period\` as key for period of time.
      Use \`company\` as key for company.
      Do not justify your answer.
      If you don't know the answer, say that you don't know.
      Please always use provided context to answer.
      Do not rely on prior knowledge.
    `

  const response = await queryEngine.query({ query })
  const responseString = response.toString()

  try {
    return zCandidateProfessionalExperiences.parse(JSON.parse(responseString))
  } catch (e: any) {
    console.info(
      `unexpected response from the model: ${e.message}:\n${responseString}`,
    )
    return null
  }
}

const zCandidateFullName = z.object({
  firstName: z.string(),
  lastName: z.string(),
})

async function extractCandidateFullName(
  queryEngine: QueryEngine,
): Promise<string | null> {
  const response = await queryEngine.query({
    query: `
      What is the first name and last name of the candidate?
      Do not take the value from email.
      Answer this in JSON, with firstName and lastName as keys.
      DO NOT use Markdown notation.
      Return ONLY JSON.
      Do not justify your answer.
      If you don't know the answer, return null.
      If it is not specified, return null.
      If it is not provided, return null.
      Please always use provided context to answer.
      Do not rely on prior knowledge.
    `,
  })
  const responseString = response.toString()

  try {
    const data = zCandidateFullName.parse(JSON.parse(responseString))

    return capitalizeWords(`${data.firstName} ${data.lastName}`)
  } catch (e: any) {
    console.info(
      `unexpected response from the model: ${e.message}:\n${responseString}`,
    )
    return null
  }
}

function capitalizeWords(val: string) {
  return val
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => capitalizeWord(word))
    .join(' ')
}

function capitalizeWord(val: string) {
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
}
