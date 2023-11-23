export interface ApiTournament {
  matches: ApiMatch[]
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
