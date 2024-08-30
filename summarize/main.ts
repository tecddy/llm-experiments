import {
  Settings,
  Ollama,
  OllamaEmbedding,
  SummaryIndex,
  SummaryRetrieverMode,
  SimpleDirectoryReader,
} from 'llamaindex'
import { join } from 'node:path'
import { interval, intervalToDuration, formatDuration } from 'date-fns'

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
  const index = await SummaryIndex.fromDocuments(documents)

  const queryEngine = index.asQueryEngine({
    retriever: index.asRetriever({ mode: SummaryRetrieverMode.LLM }),
  })

  console.log('querying...')
  const response = await queryEngine.query({
    query: `
Summarize the given context.
Return the key points, does not miss anything important.
DO NO use previous knowledge.
`,
  })

  console.log('======================')
  console.log(response.toString())
  console.log('======================')

  console.log(
    'processing duration: ',
    formatDuration(intervalToDuration(interval(startAt, new Date()))),
  )
}

main().catch((e: Error) => {
  console.error(e, e.stack)
})
