require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const url = process.env.WEBHOOK_URL;
const port = process.env.PORT || 3000;

const bot = new TelegramBot(token, { webHook: { port: port } });
bot.setWebHook(${url}/bot${token});

const app = express();
app.use(express.json());

app.post(/bot${token}, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('🤖 Quiz Bot is running via Webhook!'));

let questions = [
  {
    question: 'What is the plural of “mouse”?',
    options: ['Mouses', 'Mices', 'Mice', 'Mousen'],
    answer: 2
  },
  {
    question: 'Choose the correct past tense of “go”:',
    options: ['Go', 'Went', 'Gone', 'Goed'],
    answer: 1
  }
];

let users = {};

bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  users[chatId] = { index: 0, score: 0 };
  sendQuestion(chatId);
});

function sendQuestion(chatId) {
  const user = users[chatId];
  if (user.index < questions.length) {
    const q = questions[user.index];
    bot.sendMessage(chatId, q.question, {
      reply_markup: {
        keyboard: [q.options.map(opt => ({ text: opt }))],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });
  } else {
    bot.sendMessage(chatId, ✅ Quiz finished! You scored ${user.score}/${questions.length});
    delete users[chatId];
  }
}

bot.on('message', msg => {
  const chatId = msg.chat.id;
  const user = users[chatId];
  if (!user || msg.text.startsWith('/')) return;

  const q = questions[user.index];
  const answerIndex = q.options.findIndex(opt => opt === msg.text);
  if (answerIndex === q.answer) user.score++;

  user.index++;
  sendQuestion(chatId);
});

app.listen(port, () => {
  console.log(✅ Express server listening on ${port});
});