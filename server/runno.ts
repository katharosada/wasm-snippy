import { WASI } from '@runno/wasi';
import fs from 'fs';
import { BotInfo, Option } from "./run_bots";


export async function runRunnoWasiPython(bot: BotInfo): Promise<Option> {
    const wasmBuffer = fs.readFileSync('./wasm/python-3.11.4.wasm');

    const capturedStdout: string[] = []
    const capturedStderr: string[] = []
    const wasi = new WASI({
        args: ["python.wasm", "main.py"],
        env: { },
        stdout: (out) => {
            out.split('\n').forEach((line) => {                
                capturedStdout.push(line)
            })
        },
        stderr: (err) => {
            capturedStderr.push(err)
        },
        fs: {
            "/main.py": {
              path: "/main.py",
              timestamps: {
                access: new Date(),
                change: new Date(),
                modification: new Date(),
              },
              mode: "string",
              content: bot.script_contents,
            },
          },
    });
    const wasm = await WebAssembly.instantiate(wasmBuffer, wasi.getImportObject());
    const result = wasi.start(wasm);

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
}
