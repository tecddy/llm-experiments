import {
  Settings,
  Ollama,
  OllamaEmbedding,
  SummaryIndex,
  SummaryRetrieverMode,
  SimpleDirectoryReader,
} from 'llamaindex'
import { interval, intervalToDuration, formatDuration } from 'date-fns'
import { join } from 'node:path'

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

  const query = 'Highlight termination details.'

  console.log('>>> ', query)

  console.log('querying...')
  const response = await queryEngine.query({
    query: [
      query,
      '',
      'ALWAYS use the given context.',
      'DO NO use previous knowledge.',
    ].join('\n'),
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
