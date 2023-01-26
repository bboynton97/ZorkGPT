const launchZork = require("zorkjs");
let intercept = require("intercept-stdout");
const { keyboard } = require('@nut-tree/nut-js');
import {Configuration, OpenAIApi} from "openai";
require('dotenv').config()
const fs = require('fs')
const logger = fs.createWriteStream('gpt-log.txt', {
    flags: 'a' // 'a' means appending (old data will be preserved)
})

keyboard.config.autoDelayMs = 3;

const openai = new OpenAIApi(new Configuration({
    organization: process.env.OPENAI_ORG,
    apiKey: process.env.OPENAI_API_KEY,
}))

const getGptResponse = async (input: string) => {
    const response = await openai.createCompletion({
        // model: 'text-curie-001',
        model: 'text-davinci-003',
        max_tokens: 500,
        // temperature: 0.1,
        prompt: input
    })

    return response.data.choices[0].text
}

// Intercepts stdout
let output = ''
let history = ''
let lastOutputTimestamp = 0
const endIntercept = intercept(async (txt: string) => {
    lastOutputTimestamp = new Date().getTime()
    output += txt
});

setInterval(async () => {
    try {
        if (new Date().getTime() - lastOutputTimestamp > 1000) {
            output = "Tell the game what to do next with no other output, as if you are a human playing a text based adventure game. Very simple english only. Your goal is to complete the game by exploring.\n Game history: \n" + output
            history += output
            // Feed txt into GPT-3
            if (history.length > 6000) {
                // If over 6000 characters, trim the output
                history = history.substring(output.length - 6000, output.length)
            }
            const gptInput = await getGptResponse(history)
            // Give that output to Zork
            logger.write('\n' + gptInput)
            await keyboard.type(gptInput)
            await keyboard.type('\n')
            output = ''
        }
    } catch (e: any) {
        endIntercept()
        console.error(e.response)
        process.exit(1)
    }
}, 1000)

try {
    launchZork();
} catch (e: any) {
    endIntercept()
    console.error(e.message)
}

