import './App.css'
import { ApiTournament } from './api'
import { Box, Typography } from '@mui/material'
import { Match, Tournament } from './Tournament'
import { useCallback, useState } from 'react'

const stateConverter = {
  NotStarted: '',
  InProgress: 'IN_PROGRESS',
  Bye: 'WALK_OVER',
  Finished: 'DONE',
}

function convertMatches(tournament: ApiTournament): Match[] {
  const matches = tournament.matches.map((apiMatch) => {
    const participants = apiMatch.participants.map((participant) => {
      return {
        id: participant.name,
        name: participant.name,
        isWinner: false,
        resultText: null,
      }
    })

    return {
      id: apiMatch.id,
      nextMatchId: apiMatch.next_match_id,
      startTime: '',
      state: stateConverter[apiMatch.state],
      participants: participants,
    }
  })

  return matches
}

function LiveTournamentPage() {
  const [matches, setMatches] = useState(null as any)

  const runMatches = useCallback(() => {
    fetch('/api/tournament', { method: 'POST' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((json) => {
        setMatches(convertMatches(json))
      })
  }, [])

  return (
    <Box pb={2}>
      <Box py={2}>
        <Typography variant="h3" component={'h2'} sx={{ py: 1, fontSize: '18pt' }}>
          Tournament
        </Typography>
      </Box>
      <button onClick={runMatches}>Run matches</button>
      <Tournament matches={matches} />
    </Box>
  )
}

export default LiveTournamentPage
