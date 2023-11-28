import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CreateBotModal from './CreateBotModal'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React, { FormEvent, useCallback, useEffect } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Link, Typography } from '@mui/material'
import { Editor, SupportedLanguage } from './Editor'

const defaultPython =
  `` +
  `print('Hello, I always choose rock.')
print('rock')
`

enum BotPlay {
  Scissors = 'Scissors',
  Paper = 'Paper',
  Rock = 'Rock',
  Invalid = 'Invalid',
}

interface TestResults {
  duration: number
  invalid_reason?: string | null
  result: BotPlay
  stderr: string
  stdin: string
  stdout: string
}

const getEmoji = (play?: BotPlay): string => {
  switch (play) {
    case BotPlay.Scissors:
      return '✂️'
    case BotPlay.Paper:
      return '📄'
    case BotPlay.Rock:
      return '🗿'
    default:
      return ''
  }
}

const startingCode = localStorage.getItem('code') || defaultPython

function CreateBotPage() {
  const [content, setContent] = React.useState(startingCode)
  const [testing, setTesting] = React.useState(false)
  const [testResults, setTestResults] = React.useState(null as TestResults | null)
  const [open, setOpen] = React.useState(false)
  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  useEffect(() => {
    const code = localStorage.getItem('code')
    if (code) {
      setContent(code)
    }
  }, [])

  const onEdit = useCallback((content: string) => {
    console.log('edited')
    localStorage.setItem('code', content)
    setContent(content)
  }, [])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const runType = 'Python'
    setTesting(true)
    setTestResults(null)
    fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botcode: content, run_type: runType }),
    })
      .then((response) => {
        setTesting(false)
        if (response.ok) {
          console.log(response)
          return response.json()
        }
        throw new Error(`Error! Request returned status: ${response.status}`)
      })
      .then((json) => {
        console.log(json)
        setTestResults(json)
      })
      .catch((error) => {
        setTestResults({
          duration: 0,
          invalid_reason: error.message,
          result: BotPlay.Invalid,
          stderr: '',
          stdin: '',
          stdout: '',
        })
      })
  }

  return (
    <Box pb={2}>
      <CreateBotModal open={open} handleClose={handleClose} content={content} />
      <Box py={2}>
        <Typography variant="h3" component={'h2'} sx={{ py: 1, fontSize: '18pt' }}>
          Create a Scissors-Paper-Rock bot
        </Typography>
        <Typography py={1}>
          {`You've probably played `}
          <Link href="https://en.wikipedia.org/wiki/Rock_paper_scissors" target="_blank">
            Scissors, Paper, Rock
          </Link>{' '}
          or a similar game before. Can you write a program to play it?
        </Typography>

        <Typography py={1}>
          {`The tournament works by elimination, through a series of battles between pairs of bots. For each battle, both
          bots will be executed once to return their `}
          <strong>{`play ("scissors", "paper" or "rock")`}</strong>.
          {`A winning play (e.g. "rock" beats "scissors") will result in the winning bot advancing, and the loser being eliminated.`}
        </Typography>
        <Typography py={1}>
          {`If both bots return the same play, the battle is repeated up to 5 times until there is a winner. If both bots
          return the identical plays for all 5 rounds then a winner is chosen randomly.`}
        </Typography>

        <Typography variant="h3" sx={{ pt: 2, pb: 1, fontSize: '14pt', fontWeight: 400 }}>
          {`Output "rock", "paper" or "scissors"`}
        </Typography>
        <Typography pt={1} pb={2}>
          {`A bot program must output a valid play as the `}
          <strong>last line of Standard Output (stdout)</strong>.
          {`The last line must be one of "scissors", "paper" or
          "rock" with nothing else on the same line. The program may write other information to stdout or stderr, but
          everything except the last line of stdout will be ignored.`}
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
            <Typography sx={{ fontSize: '12pt', fontWeight: 400 }}>Optional JSON input</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography pt={1}>
              The program will be provided a JSON string to the Standard Input (stdin). This input contains information
              which may help calculate more strategic plays. This JSON will always be one line (no newlines) and will be
              structured as follows:
            </Typography>
            <pre>
              {`{
  "botname": "My Bot",     // This is your own bot's name
  "round": 2,              // Round number for this battle, starting at 0. E.g. 2 for the third round.
  "opponent": "RandomBot", // Opponent's name
  "history": [             // The plays previously made by the opponent during this battle.
    "Scissors",            // Note the capitalisation.
    "Rock"
  ]
}`}
            </pre>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Editor language={SupportedLanguage.PYTHON} initialContent={startingCode} onEdit={onEdit} />
      <Box py={2}>
        <form onSubmit={onSubmit}>
          <div>
            <Button variant="contained" type="submit" disabled={testing}>
              &nbsp;Test&nbsp;
            </Button>
            &nbsp;
            <Button onClick={handleOpen} variant="contained" color="secondary">
              Enter the Tournament
            </Button>
          </div>
        </form>
      </Box>
      <Box>
        <Typography>
          Play:{' '}
          {getEmoji(testResults?.result) +
            (testResults?.result || '') +
            (testResults?.invalid_reason ? ` (${testResults.invalid_reason})` : '')}
        </Typography>
        <Typography>Stdout</Typography>
        <Box bgcolor={'#DDD'} sx={{ minHeight: 50, borderRadius: '5px', mb: 3, px: 2, py: 1 }}>
          <pre>{testResults?.stdout}</pre>
        </Box>
        <Typography>Stderr</Typography>
        <Box bgcolor={'#DDD'} sx={{ minHeight: 50, borderRadius: '5px', mb: 3, px: 2, py: 1 }}>
          <pre>{testResults?.stderr}</pre>
        </Box>
      </Box>
    </Box>
  )
}

export default CreateBotPage
