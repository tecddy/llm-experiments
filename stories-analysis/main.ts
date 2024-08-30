import { interval, intervalToDuration, formatDuration } from 'date-fns'

const STORIES = [
  `* As a user, I should be able to create a account with my gmail.`,
  `* As a user, I should be able to create a account with my phone number.`,
  `* As a user, I want an option to stay logged in, so that I don’t have to enter my credentials every time.`,
  `* As a user, I want to be able to reset my password if I forget it, so that I can regain access to my account.`,
  `* As a user, I want to see an error message if I enter incorrect login details, so that I know when my login attempt has failed.`,
]

async function main() {
  const startAt = new Date()

  console.log('## User Stories')

  STORIES.forEach((s) => {
    console.log(s)
  })

  const query = 'Find conflicting user stories.'

  console.log('\n\n>>> ', query)

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      stream: false,
      model: 'llama3.1',
      prompt: `
## User Stories

${STORIES.map((s) => `*  ${s}`).join('\n')}

-----------
${query}
Justify your answer, and give the conflicting user stories.
If you don't know the answer, say that you don't know.
Please always use provided documents to answer.
Do not rely on prior knowledge.
      `,
    }),
  })

  if (!response.ok) {
    throw new Error(`fetch fail: ${response.status}`)
  }

  const content = await response.json()

  console.log('\n\n===================')
  console.log(content.response)
  console.log('===================')

  console.log(
    'processing duration: ',
    formatDuration(intervalToDuration(interval(startAt, new Date()))),
  )
}

main().catch((e: Error) => {
  console.error(e, e.stack)
})
