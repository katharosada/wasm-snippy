import './App.css'
import Box from '@mui/material/Box'
import CreateBotPage from './CreateBotPage'
import React, { useState } from 'react'
import ResponsiveAppBar from './ResponsiveAppBar'

const pages = ['Create']

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
        <CreateBotPage />
      </Box>
    </>
  )
}

export default App
