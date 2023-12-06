import './App.css'
import Box from '@mui/material/Box'
import CreateBotPage from './CreateBotPage'
import LeaderboardPage from './LeaderboardPage'
import LiveTournamentPage from './LiveTournamentPage'
import React, { useState } from 'react'
import ResponsiveAppBar from './ResponsiveAppBar'

const pages = ['Create', 'Tournament', 'Leaderboard']

function App() {
  const [currentPage, setCurrentPage] = useState('Create')

  const setPage = (page: string) => {
    console.log(page)
    setCurrentPage(page)
  }

  return (
    <>
      <ResponsiveAppBar pages={pages} setPage={setPage} />
      <Box sx={{ px: 3, margin: '0 auto' }}>
        {currentPage === 'Create' ? <CreateBotPage /> : null}
        {currentPage === 'Tournament' ? <LiveTournamentPage /> : null}
        {currentPage === 'Leaderboard' ? <LeaderboardPage /> : null}
      </Box>
    </>
  )
}

export default App
