import { SingleEliminationBracket } from '@g-loot/react-tournament-brackets';
import CircularProgress from '@mui/material/CircularProgress';

import "./Tournament.css"


export const MatchParticipant = (props) => {
    const {party} = props;
    const resultText = Array.isArray(party.resultText) ? party.resultText : [];
    return <div className={"matchparticipant" + (party.isWinner ? ' winner' : '')}>
        <div>{party.name}</div>
        <div style={{display: 'flex'}}>
            {resultText.map((result) => {
                return <div style={{minWidth: '20px'}}>{result}</div>
            })}
            { props.inProgress ? <CircularProgress size={20}/> : null}
        </div>
    </div>
};

export const Match = (props) => {
    const match = props.match;
    return <div className="matchblock">
        <div className="matchblockinner">
            <MatchParticipant party={props.topParty} inProgress={match.state === 'IN_PROGRESS'}/>
            { props.bottomParty.name ? <MatchParticipant party={props.bottomParty} inProgress={match.state === 'IN_PROGRESS'}/> : null}
        </div>
    </div>
}

export const Tournament = (props) => {

    if (!props.matches) {
        return <div>No tournament running.</div>
    }

    return(
        <SingleEliminationBracket
          matches={props.matches}
          matchComponent={Match}
        />
      );
}