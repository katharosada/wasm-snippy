import React, { useEffect, useState } from 'react'

async function fetchBotList() {
  // use fetch to get json data from //api/bots
  const response = await fetch('/api/bots')
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const json = await response.json()
  return json
}

function LeaderboardPage(props: { setTitle: (title: string) => void }) {
  const { setTitle } = props

  useEffect(() => {
    setTitle('Leaderboard')
  }, [])

  const [botList, setBotList] = useState([] as any[])

  useEffect(() => {
    // fetch bots and put list in state
    fetchBotList().then((list) => setBotList(list))
  }, [])

  if (botList.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Leaderboard</h1>
      {botList.map((bot) => {
        return <div key={bot.name}>{bot.name}</div>
      })}
    </div>
  )
}

export default LeaderboardPage
