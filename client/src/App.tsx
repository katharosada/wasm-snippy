import './App.css'
import CreateBotPage from './CreateBotPage'
import DrawerAppBar from './DrawerAppBar'
import LeaderboardPage from './LeaderboardPage'
import LiveTournamentPage from './LiveTournamentPage'
import React, { useState } from 'react'
import { Route, Routes } from 'react-router-dom'

function App() {
  const [title, setTitle] = useState('')

  return (
    <Routes>
      <Route path="/" element={<DrawerAppBar title={title} />}>
        <Route index element={<LiveTournamentPage setTitle={setTitle} />} />
        <Route path="/create" element={<CreateBotPage setTitle={setTitle} />} />
        <Route path="/leaderboard" element={<LeaderboardPage setTitle={setTitle} />} />
      </Route>
    </Routes>
  )
}

export default App
