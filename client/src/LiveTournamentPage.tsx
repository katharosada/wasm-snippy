import './App.css'
import { Match, Tournament } from './Tournament'
import { useCallback, useEffect, useState } from 'react'

import { io } from 'socket.io-client'

function LiveTournamentPage() {
  const [matches, setMatches] = useState(null as any)

  useEffect(() => {
    const socket = io()

    socket.on('connect', () => {
      console.log('connected')
    })

    socket.on('tournament', (data) => {
      setMatches(data)
    })

    socket.on('match', (match) => {
      setMatches((matches: Match[]) => {
        if (!matches) {
          return null
        }
        const newMatches = matches.map((m) => {
          if (m.id === match.id) {
            return match
          }
          return m
        })
        return newMatches
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const runMatches = useCallback(() => {
    fetch('/api/tournament', { method: 'POST' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((json) => {
        console.log(json)
      })
  }, [])

  return (
    <div>
      <h1>Tournament</h1>
      <button onClick={runMatches}>Run matches</button>
      <Tournament matches={matches} />
    </div>
  )
}

export default LiveTournamentPage
