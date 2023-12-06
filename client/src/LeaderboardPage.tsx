import React, { useEffect, useState } from 'react'
import { ApiBotWinCount, ApiLeaderboard } from './api'
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

async function fetchLeaderboard(): Promise<ApiLeaderboard> {
  // use fetch to get json data from //api/bots
  const response = await fetch('/api/leaderboard')
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const json = await response.json()
  return json
}

function LeaderboardPage() {
  const [botList, setBotList] = useState([] as ApiBotWinCount[])

  useEffect(() => {
    // fetch bots and put list in state
    fetchLeaderboard().then((leaderboard) => setBotList(leaderboard.leaders_1day))
  }, [])

  if (botList.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <Box pb={2} maxWidth={'900px'} margin={'auto'}>
      <Box py={2}>
        <Typography variant="h3" component={'h2'} sx={{ py: 1, fontSize: '18pt' }}>
          Leaderboard
        </Typography>
        <Typography py={1}>
          {botList.map((bot) => {
            return (
              <div key={bot.bot_name}>
                {bot.bot_name} - {bot.wins}
              </div>
            )
          })}
        </Typography>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 200 }} aria-label="simple table">
            <TableHead>
              <TableRow sx={{ fontWeight: 'bold' }}>
                <TableCell>Bot name</TableCell>
                <TableCell align="right">Wins</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {botList.map((bot) => {
                return (
                  <TableRow key={bot.bot_name}>
                    <TableCell>{bot.bot_name}</TableCell>
                    <TableCell align="right">{bot.wins}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

export default LeaderboardPage
