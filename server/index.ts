import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';

import {Server} from 'socket.io';
import pg from 'pg-promise';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

const pgp = pg({});
const db = pgp(process.env.DATABASE_URL || '');


app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

enum Option {
    scissors = 'scissors',  
    paper = 'paper',
    rock = 'rock',
    invalid = 'invalid'
}

const convertToEmoji = (choices: Option[]): string[] => {
    const emojiList = choices.map(choice => {
        switch (choice) {
            case Option.scissors:
                return '✂️';
            case Option.paper:
                return '📄';
            case Option.rock:
                return '🗿';
            default:
                return 'invalid';
        }
    });
    return emojiList;
}

type MatchOutcome = 'bot1' | 'bot2' | 'draw';
interface MatchResults {
    bot1: Option;
    bot1Name: string;
    bot2: Option;
    bot2Name: string;
    outcome: MatchOutcome;
}

interface MultiMatchResults {
    bot1: Option[];
    bot1Name: string;
    bot2: Option[];
    bot2Name: string;
    outcome: MatchOutcome;
}

async function runBot(bot: BotSpec): Promise<Option> {
    let wasmBuffer;
    switch(bot.run_type) {
        case 1:
            wasmBuffer = fs.readFileSync('../sample-bots/random-bot/pkg/random_bot_bg.wasm');
            break;
        case 2:
            wasmBuffer = fs.readFileSync('../sample-bots/rock-bot/pkg/rock_bot_bg.wasm');
            break;
        case 3:
            wasmBuffer = fs.readFileSync('../sample-bots/paper-bot/pkg/paper_bot_bg.wasm');
            break;
        case 4:
            wasmBuffer = fs.readFileSync('../sample-bots/snippy-bot/pkg/snippy_bot_bg.wasm');
            break;
        default:
            return Option.invalid;
    }
    const rando = Math.floor(Math.random() * 100);
    const num = await WebAssembly.instantiate(wasmBuffer).then(wasmModule => {
        const { select_move } = wasmModule.instance.exports as { select_move: (randomNum: number) => number };
        const result = select_move(rando);
        return result;
    });
    switch (num) {
        case 0:
            return Option.scissors;
        case 1:
            return Option.paper;
        case 2:
            return Option.rock;
        default:
            return Option.invalid;
    }
}

interface BotSpec {
    id: number,
    name: string,
    run_type: number,
    isWinner?: boolean,
    resultText?: string[],
}

async function runMatch(bot1: BotSpec, bot2: BotSpec): Promise<MatchResults> {
    const [bot1Choice, bot2Choice] = await Promise.all([runBot(bot1), runBot(bot2)])
    let outcome: MatchOutcome = 'bot2'
    if (bot1Choice === bot2Choice) {
        outcome = 'draw'
    } else if (bot2Choice == Option.invalid) {
        outcome = 'bot1'
    }  else if (bot1Choice === Option.scissors && bot2Choice === Option.paper || bot1Choice === Option.paper && bot2Choice === Option.rock || bot1Choice === Option.rock && bot2Choice === Option.scissors) {
        outcome =  'bot1'
    }
    return {
        bot1: bot1Choice,
        bot1Name: bot1.name,
        bot2: bot2Choice,
        bot2Name: bot2.name,
        outcome: outcome,
    }
}

const runNMatches = async (match: Match, n: number = 5): Promise<MultiMatchResults> => {
    match.state = 'IN_PROGRESS';
    io.to('tournament').emit('match', match);
    const bot1 = match.participants[0]
    const bot2 = match.participants[1]

    const bot1Choices = []
    const bot2Choices = []
    for (let i = 0; i < n; i++) {
        const result = await runMatch(bot1, bot2);
        // Artificially slow for dramatic purposes.
        await new Promise(r => setTimeout(r, 800));
        bot1Choices.push(result.bot1);
        bot2Choices.push(result.bot2);
        match.participants[0].resultText = convertToEmoji(bot1Choices);
        match.participants[1].resultText = convertToEmoji(bot2Choices);
        if (result.outcome !== 'draw') {
            return {
                bot1: bot1Choices,
                bot1Name: bot1.name,
                bot2: bot2Choices,
                bot2Name: bot2.name,
                outcome: result.outcome,
            }
        }
        if (i !== n - 1) {
            io.to('tournament').emit('match', match);
        }
    }

    return {
        bot1: bot1Choices,
        bot1Name: bot1.name,
        bot2: bot2Choices,
        bot2Name: bot2.name,
        outcome: 'draw'
    }
}

function shuffleArray(array: any[]): any[] {
    // Give each element a random number, then sort by that number.
    const pairs: [number, any][] = array.map((element) => {
        return [Math.random(), element];
    })
    pairs.sort((a, b) => {
        return a[0] - b[0];
    });
    return pairs.map(pair => pair[1]);
}

interface Match {
    id: string,
    tournamentRoundText: string,
    nextMatchId: string | null,
    participants: BotSpec[],
    state: '' | 'DONE' | 'WALK_OVER' | 'IN_PROGRESS',
}

const generateMatchID = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const generateMatches = (botsRaw: BotSpec[]): Match[] => {
    const bots1 = shuffleArray(botsRaw) as BotSpec[];
    const bots = bots1.map((bot) => ({...bot}));

    // const rounds = generateTournamentRounds(bots.length);
    
    const poweroftwo = Math.pow(2, Math.ceil(Math.log(bots.length) / Math.log(2)));
    const byes = poweroftwo - bots.length;
    const matches: Match[] = []

    const matchBots = bots.slice(0, bots.length - byes);
    const byeBots = bots.slice(bots.length - byes);

    for (let i = 0; i < matchBots.length; i += 2) {
        const match: Match = {
            id: generateMatchID(),
            tournamentRoundText: '1',
            nextMatchId: null,
            participants: [matchBots[i], matchBots[i + 1]],
            state: '',
        }
        matches.push(match);
    }
    for (const bot of byeBots) {
        const match: Match = {
            id: generateMatchID(),
            tournamentRoundText: '1',
            nextMatchId: null,
            participants: [{...bot, resultText: ['Bye']},],
            state: 'WALK_OVER'
        }
        matches.push(match);
    }

    let lastRoundMatches = matches;
    let round = 2;
    while (lastRoundMatches.length >= 2) {
        const thisRoundMatches: Match[] = [];
        for (let i = 0; i < lastRoundMatches.length - 1; i += 2) {
            const match: Match = {
                id: generateMatchID(),
                tournamentRoundText: 'Round ' + round,
                nextMatchId: null,
                participants: [],
                state: '',
            }
            lastRoundMatches[i].nextMatchId = match.id;
            lastRoundMatches[i + 1].nextMatchId = match.id;
            thisRoundMatches.push(match);
        }
        matches.push(...thisRoundMatches);
        lastRoundMatches = thisRoundMatches;
        round += 1;
    }

    return matches;
};

app.post('/api/tournament', async (req: Request, res: Response) => {
    const botsRaw = await db.query('SELECT id, name, run_type FROM bots') as BotSpec[];
    const matches = generateMatches(botsRaw);
    res.json({success: true});

    io.to('tournament').emit('tournament', matches);

    // Resolve matches
    for (const match of matches) {
        let winner;
        if (match.state === 'WALK_OVER') {
            winner = match.participants[0];
        } else {
            const results = await runNMatches(match);
            if (results.outcome === 'bot1') {
                winner = match.participants[0];
                match.participants[1].isWinner = false;
            } else if (results.outcome === 'bot2') {
                winner = match.participants[1];
                match.participants[0].isWinner = false;
            } else {
                // Pick one randomly
                const randomWinner = Math.floor(Math.random() * 2);
                const loser = randomWinner === 0 ? 1 : 0;
                winner = match.participants[randomWinner];
                match.participants[loser].isWinner = false;
            }
        }
        const nextMatch = matches.find(m => m.id === match.nextMatchId)
        nextMatch?.participants.push({...winner, resultText: [], isWinner: undefined});
        if (match.state !== 'WALK_OVER') {
            winner.isWinner = true;
            match.state = 'DONE';
        } else {
            winner.resultText = ['Bye'];
        }
        io.to('tournament').emit('match', match);
        if (nextMatch) {
            io.to('tournament').emit('match', nextMatch);
        }
    }
});

app.get('/api/bots', async (req: Request, res: Response) => {
    const results = await db.query('SELECT name, run_type FROM bots');
    res.json(results);
});

const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});


const io = new Server(server, {
    // Socket.IO options
});

io.on('connection', socket => {
    socket.join('tournament');

    socket.on('disconnect', reason => {
        console.log(`disconnect ${socket.id} due to ${reason}`);
    });
});
