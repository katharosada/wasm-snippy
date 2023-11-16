import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { Tournament } from './Tournament';

import {io} from "socket.io-client";

async function fetchBotList() {
  // use fetch to get json data from //api/bots
  const response = await fetch('/api/bots');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const json = await response.json();
  return json;
}


function App() {
  const [botList, setBotList] = useState([])
  const [matches, setMatches] = useState(null)

  useEffect(() => {
    // fetch bots and put list in state
    fetchBotList().then((list) => setBotList(list))

    const socket = io();

    socket.on('connect', () => {
      console.log('connected')
    });

    socket.on('tournament', (data) => {
      setMatches(data)
    });

    socket.on('match', (match) => {
      setMatches((matches) => {
        const newMatches = matches.map((m) => {
          if (m.id === match.id) {
            return match
          }
          return m
        })
        return newMatches
      })
    });

    return () => {
      socket.disconnect();
    }
  }, [])

  const runMatches = useCallback((event) => {
    fetch('/api/tournament', {method: 'POST'}).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).then((json) => {
      console.log(json)
    });
  })

  if (botList.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div className="App">
      <h2>Bots</h2>
      {
        botList.map((bot) => {
          return <div key={bot.name}>{bot.name}</div>
        })
      }
      <button onClick={runMatches}>Run matches</button>
      <Tournament matches={matches}/>
    </div>
  );
}

export default App;
