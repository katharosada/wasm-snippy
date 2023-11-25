export interface ApiTournament {
  starting_matches: ApiMatch[]
  match_updates: ApiMatchOutcome[]
}

export type SPROutcome = 'Scissors' | 'Paper' | 'Rock' | 'Invalid'

export interface ApiParticipantOutcome {
  name: string
  moves: SPROutcome[]
  winner: boolean
}

export interface ApiMatchOutcome {
  match_id: string
  state: 'NotStarted' | 'InProgress' | 'Bye' | 'Finished'
  winner: number
  note?: string
  participants: ApiParticipantOutcome[]
  bot1_moves: SPROutcome[]
  bot2_moves: SPROutcome[]
}

export interface ApiBotDetails {
  run_type: 'Python' | 'Wasi'
  name: string
  code: string
  wasm_path: string
}

export interface ApiMatch {
  id: string
  tournament_round_text: string
  next_match_id: string | null
  participants: ApiBotDetails[]
  state: 'NotStarted' | 'InProgress' | 'Bye' | 'Finished'
}
