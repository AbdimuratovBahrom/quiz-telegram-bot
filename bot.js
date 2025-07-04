require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const url = process.env.WEBHOOK_URL;
const port = process.env.PORT || 3000;

const bot = new TelegramBot(token, { webHook: { port } });
bot.setWebHook(`${url}/bot${token}`);

const app = express();
app.use(express.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('🤖 Quiz Bot is running via Webhook!'));

// === Викторина ===
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
  users[chatId] = { index: 0, score: 0, timeout: null };
  sendQuestion(chatId);
});

function sendQuestion(chatId) {
  const user = users[chatId];
  if (user.index < questions.length) {
    const q = questions[user.index];

    bot.sendMessage(chatId, `❓ ${q.question}\n⏳ У вас есть 30 секунд на ответ!`, {
      reply_markup: {
        keyboard: [q.options.map(opt => ({ text: opt }))],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });

    // Очищаем предыдущий таймер
    if (user.timeout) clearTimeout(user.timeout);

    // Устанавливаем таймер на 30 секунд (30000 мс)
    user.timeout = setTimeout(() => {
      bot.sendMessage(chatId, '⏰ Время вышло! Следующий вопрос.');
      user.index++;
      sendQuestion(chatId);
    }, 30000);
  } else {
    bot.sendMessage(chatId, `✅ Викторина завершена! Вы набрали ${user.score}/${questions.length} баллов.`);
    delete users[chatId];
  }
}

bot.on('message', msg => {
  const chatId = msg.chat.id;
  const user = users[chatId];
  if (!user || msg.text.startsWith('/')) return;

  // Останавливаем таймер, если пользователь ответил
  if (user.timeout) clearTimeout(user.timeout);

  const q = questions[user.index];
  const answerIndex = q.options.findIndex(opt => opt === msg.text);
  if (answerIndex === q.answer) {
    user.score++;
    bot.sendMessage(chatId, '✅ Правильно!');
  } else {
    bot.sendMessage(chatId, `❌ Неправильно. Правильный ответ: ${q.options[q.answer]}`);
  }

  user.index++;
  sendQuestion(chatId);
});

app.listen(port, () => {
  console.log(`✅ Express server listening on ${port}`);
});
