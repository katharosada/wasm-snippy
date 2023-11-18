import CircularProgress from '@mui/material/CircularProgress'
import { SingleEliminationBracket } from '@g-loot/react-tournament-brackets'

import './Tournament.css'

export interface Party {
  id: number | string
  name?: string
  isWinner?: boolean
  resultText?: string | null
}

export interface Match {
  id: number | string
  nextMatchId: number | string | null
  startTime: string
  state: string
  participants: Party[]
}

export const MatchParticipant = (props: { party: Party; inProgress: boolean }) => {
  const { party } = props
  const resultText = Array.isArray(party.resultText) ? party.resultText : []
  return (
    <div className={'matchparticipant' + (party.isWinner ? ' winner' : '')}>
      <div>{party.name}</div>
      <div style={{ display: 'flex' }}>
        {resultText.map((result, i) => {
          return (
            <div key={i} style={{ minWidth: '20px' }}>
              {result}
            </div>
          )
        })}
        {props.inProgress ? <CircularProgress size={20} /> : null}
      </div>
    </div>
  )
}

export const Match = (props: { match: Match; topParty: Party; bottomParty: Party }) => {
  const { match, topParty, bottomParty } = props
  return (
    <div className="matchblock">
      <div className="matchblockinner">
        <MatchParticipant party={topParty} inProgress={match.state === 'IN_PROGRESS'} />
        {bottomParty.name ? <MatchParticipant party={bottomParty} inProgress={match.state === 'IN_PROGRESS'} /> : null}
      </div>
    </div>
  )
}

export const Tournament = (props: { matches: Match[] }) => {
  if (!props.matches) {
    return <div>No tournament running.</div>
  }

  return <SingleEliminationBracket matches={props.matches} matchComponent={Match} />
}
