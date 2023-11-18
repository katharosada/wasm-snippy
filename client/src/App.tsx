import './App.css';
import React, { useState } from 'react';
import DrawerAppBar from './DrawerAppBar.tsx';
import { Route, Routes } from 'react-router-dom';
import LiveTournamentPage from './LiveTournamentPage.tsx';
import CreateBotPage from './CreateBotPage.tsx';
import LeaderboardPage from './LeaderboardPage.tsx';

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