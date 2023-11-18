import './App.css';
import React, { useState } from 'react';
import DrawerAppBar from './DrawerAppBar';
import { Route, Routes } from 'react-router-dom';
import LiveTournamentPage from './LiveTournamentPage';
import CreateBotPage from './CreateBotPage';
import LeaderboardPage from './LeaderboardPage';

function App() {
  const [title, setTitle] = useState('')

  return (
      <Routes>
        <Route path="/" element={<DrawerAppBar title={title}/>}>
          <Route index element={<LiveTournamentPage setTitle={setTitle} />} />
          <Route path='/create' element={<CreateBotPage setTitle={setTitle}  />} />
          <Route path='/leaderboard' element={<LeaderboardPage setTitle={setTitle}  />} />
        </Route>
      </Routes>
  );
}

export default App;