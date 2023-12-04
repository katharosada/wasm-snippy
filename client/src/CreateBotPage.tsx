import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CreateBotModal from './CreateBotModal'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React, { FormEvent, useCallback, useEffect } from 'react'
import UploadWasmModal from './UploadWasmModal'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  Link,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { Editor, SupportedLanguage } from './Editor'

const defaultPython = `print('Hello, I am a bot.')

# Using the input JSON
import json
inp = json.loads(input())
print(inp)

# Generating random numbers
import random
num = random.randint(0, 2)
print('Random num: ', num)

# Chosen play must be the last line of output:
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

  const [uploadOpen, setUploadOpen] = React.useState(false)
  const handleUploadOpen = () => setUploadOpen(true)
  const handleUploadClose = () => setUploadOpen(false)

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

    // get the round num from the form data
    const formData = new FormData(event.currentTarget)
    const roundNum = parseInt(formData.get('test-round') as string)

    // Generate stdin json for the round
    const stdin = JSON.stringify({
      botname: 'My Bot',
      round: roundNum,
      opponent: 'Test Opponent Bot',
      history: ['Scissors', 'Rock'].slice(0, roundNum),
    })

    fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botcode: content, run_type: runType, stdin: stdin }),
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
    <Box pb={2} maxWidth={'900px'} margin={'auto'}>
      <CreateBotModal open={open} handleClose={handleClose} content={content} />
      <UploadWasmModal open={uploadOpen} handleClose={handleUploadClose} />
      <Box py={2}>
        <Typography variant="h3" component={'h2'} sx={{ py: 1, fontSize: '18pt' }}>
          Create a Rock-Paper-Scissors bot
        </Typography>
        <Typography py={1}>
          {`You've probably played `}
          <Link href="https://en.wikipedia.org/wiki/Rock_paper_scissors" target="_blank">
            Rock, Paper, Scissors
          </Link>{' '}
          or a similar game before. Can you write a program to play it?
        </Typography>

        <Typography py={1}>
          {`The tournament works by elimination, through a series of battles between pairs of bots. For each battle, both
          bots will be executed once to return their `}
          <strong>{`play ("rock", "paper" or "scissors")`}</strong>.
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
          {`The last line must be one of "rock", "paper" or
          "scissors" with nothing else on the same line. The program may write other information to stdout or stderr, but
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
      <Typography variant="h3" component={'h2'} sx={{ py: 1, fontSize: '18pt' }}>
        Upload a WebAssembly bot
      </Typography>
      <Typography py={1}>
        {`Use any any programming language, so long as you can compile it to a single .wasm file (WebAssembly with WASI bindings). See the `}
        <a href="https://github.com/katharosada/wasm-snippy/tree/main/sample-bots">example bots with instructions</a>.
      </Typography>
      <Button variant="contained" color="secondary" onClick={handleUploadOpen}>
        Enter with a .wasm file
      </Button>
      <Typography variant="h3" sx={{ pt: 2, pb: 1, fontSize: '14pt', fontWeight: 400 }}>
        {`Or submit a Python script instead`}
      </Typography>
      <Typography py={1}>{`Python scripts will be executed using CPython 3.11 compiled to WebAssembly.`}</Typography>
      <Editor language={SupportedLanguage.PYTHON} initialContent={startingCode} onEdit={onEdit} />
      <Box py={2}>
        <form onSubmit={onSubmit}>
          <Box py={1}>
            <FormControl size="small">
              <Select defaultValue={0} id="test-round" name="test-round">
                <MenuItem value="0">Round 0</MenuItem>
                <MenuItem value="1">Round 1</MenuItem>
                <MenuItem value="2">Round 2</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" type="submit" disabled={testing}>
              &nbsp;Test&nbsp;
            </Button>
            &nbsp;&nbsp;
            <Button onClick={handleOpen} variant="contained" color="secondary">
              Enter the Tournament
            </Button>
          </Box>
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
