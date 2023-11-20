import fs from 'fs';
import { runRunnoWasiPython } from './runno';
import { WASI } from 'wasi';

export enum Option {
    scissors = 'scissors',  
    paper = 'paper',
    rock = 'rock',
    invalid = 'invalid'
}

export enum BotRunType {
    BUILTIN_RANDOM = 1,
    BUILTIN_ROCK = 2,
    BUILTIN_PAPER = 3,
    BUILTIN_SNIPPY = 4,
    PYTHON = 5,
}

export interface BotInfo {
    id: number,
    name: string,
    run_type: BotRunType,
    script_contents: string,
}

async function runNodeWasiPython(bot: BotInfo): Promise<Option> {
    fs.rmSync('./tmp', { recursive: true, force: true });
    fs.mkdirSync('./tmp');
    fs.writeFileSync('./tmp/stdin', '');
    try {
        fs.writeFileSync('./tmp/main.py', bot.script_contents);
        const wasi = new WASI({
            // @ts-ignore
            version: 'preview1',
            args: ['python', '/main.py'],
            env: {},
            preopens: {
                '/': './tmp',
            },
            stdin: fs.openSync('./tmp/stdin', 'r'),
            stdout: fs.openSync('./tmp/stdout', 'w'),
            stderr: fs.openSync('./tmp/stderr', 'w'),
        });

        const wasmBuffer = fs.readFileSync('./wasm/python-3.11.4.wasm');
        const wasm = await WebAssembly.compile(wasmBuffer);
        // @ts-ignore
        const instance = await WebAssembly.instantiate(wasm, wasi.getImportObject());
        wasi.start(instance);
        const capturedStdout: string[] = fs.readFileSync('./tmp/stdout', 'utf8').split('\n');

        let lastLine = '';
        let secondLastLine = '';
        if (capturedStdout.length !== 0) {
            lastLine = capturedStdout[capturedStdout.length - 1].trim();
        }
        if (capturedStdout.length > 1) {
            secondLastLine = capturedStdout[capturedStdout.length - 2].trim();
        }
        const num = lastLine ? parseInt(lastLine) : parseInt(secondLastLine);
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
    } catch (e) {
        console.log(e);
        return Option.invalid;
    } finally {
        // Clean up the temp folder.
        fs.rmSync('./tmp', { recursive: true, force: true });
    }
}

export async function runBot(bot: BotInfo): Promise<Option> {
    try {
        switch(bot.run_type) {
            case BotRunType.BUILTIN_RANDOM:
            case BotRunType.BUILTIN_ROCK:
            case BotRunType.BUILTIN_PAPER:
            case BotRunType.BUILTIN_SNIPPY:
                return runBuiltinBot(bot);
            case BotRunType.PYTHON:
                return runRunnoWasiPython(bot);
                // return runNodeWasiPython(bot);
            default:
                return Option.invalid;
        }
    } catch (e) {
        console.log(e);
        return Option.invalid;
    }
}

export async function runBuiltinBot(bot: BotInfo): Promise<Option> {
    let wasmBuffer;
    switch(bot.run_type) {
        case BotRunType.BUILTIN_RANDOM:
            wasmBuffer = fs.readFileSync('../sample-bots/random-bot/pkg/random_bot_bg.wasm');
            break;
        case BotRunType.BUILTIN_ROCK:
            wasmBuffer = fs.readFileSync('../sample-bots/rock-bot/pkg/rock_bot_bg.wasm');
            break;
        case BotRunType.BUILTIN_PAPER:
            wasmBuffer = fs.readFileSync('../sample-bots/paper-bot/pkg/paper_bot_bg.wasm');
            break;
        case BotRunType.BUILTIN_SNIPPY:
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
