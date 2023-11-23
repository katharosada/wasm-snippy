import './App.css'
import Box from '@mui/material/Box'
import CreateBotPage from './CreateBotPage'
import LiveTournamentPage from './LiveTournamentPage'
import React, { useState } from 'react'
import ResponsiveAppBar from './ResponsiveAppBar'

const pages = ['Create', 'Tournament']

function App() {
  const [currentPage, setCurrentPage] = useState('Create')

  const setPage = (page: string) => {
    console.log(page)
    setCurrentPage(page)
  }

  return (
    <>
      <ResponsiveAppBar pages={pages} setPage={setPage} />
      <Box sx={{ px: 3, maxWidth: 900, margin: '0 auto' }}>
        {currentPage === 'Create' ? <CreateBotPage /> : null}
        {currentPage === 'Tournament' ? <LiveTournamentPage /> : null}
      </Box>
    </>
  )
}

export default App
