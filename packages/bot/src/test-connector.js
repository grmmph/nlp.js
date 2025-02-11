/*
 * Copyright (c) AXA Group Operations Spain S.A.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const fs = require('fs');
const { Connector } = require('@nlpjs/connector');

class TestConnector extends Connector {
  initialize() {
    this.messages = [];
  }

  say(message, reference) {
    let text;
    if (typeof reference === 'object' && reference.value) {
      text = reference.value;
    } else if (typeof message === 'string') {
      text = message;
    } else {
      text = message.answer || message.message || message.text || reference;
    }
    const botName = this.settings.botName || 'bot';
    if (this.settings.debug && typeof message === 'object' && !reference) {
      const intent = message.intent || '';
      const score = message.score || '';
      this.messages.push(`${botName}> ${text} (${intent} - ${score})`);
    } else {
      this.messages.push(`${botName}> ${text}`);
    }
  }

  async hear(line) {
    const userName = this.settings.userName || 'user';
    this.messages.push(`${userName}> ${line}`);
    if (this.onHear) {
      this.onHear(this, line);
    } else {
      const name = `${this.settings.tag}.hear`;
      const pipeline = this.container.getPipeline(name);
      if (pipeline) {
        this.container.runPipeline(
          pipeline,
          { message: line, channel: 'console', app: this.container.name },
          this
        );
      } else {
        const bot = this.container.get('bot');
        if (bot) {
          const session = this.createSession({
            channelId: 'console',
            text: line,
            address: { conversation: { id: 'console000' } },
          });
          await bot.process(session);
        } else {
          const nlp = this.container.get('nlp');
          if (nlp) {
            const result = await nlp.process(
              {
                message: line,
                channel: 'console',
                app: this.container.name,
              },
              undefined,
              this.context
            );
            this.say(result);
          } else {
            console.error(`There is no pipeline for ${name}`);
          }
        }
      }
    }
  }

  async runScript(fileName) {
    this.expected = fs
      .readFileSync(fileName, 'utf-8')
      .split(/\r?\n/)
      .filter((x) => !x.startsWith('#'))
      .filter((x) => x);
    this.messages = [];
    const userName = this.settings.userName || 'user';
    for (let i = 0; i < this.expected.length; i += 1) {
      const line = this.expected[i];
      if (line.startsWith(`${userName}>`)) {
        await this.hear(line.slice(userName.length + 2));
      }
    }
  }
}

module.exports = TestConnector;
