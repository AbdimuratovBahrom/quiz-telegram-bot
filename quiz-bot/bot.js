
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const db = new sqlite3.Database('quiz.db');

db.run('CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, username TEXT, score INTEGER, level TEXT)');

const questions = {
  easy: [
    { question: "What color is the sky?", options: ["Green", "Blue", "Red", "Yellow"], correct: 1 },
    { question: "What is 2 + 2?", options: ["3", "4", "5", "22"], correct: 1 }
  ],
  medium: [
    { question: "Choose the correct form: 'He ___ to school every day.'", options: ["go", "goes", "gone", "going"], correct: 1 }
  ],
  hard: [
    { question: "Which sentence is grammatically correct?", options: ["She don't like apples", "She doesn't likes apples", "She doesn't like apples", "She don't likes apples"], correct: 2 }
  ]
};

const userStates = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to the English Quiz Bot! Type /quiz to start.");
});

bot.onText(/\/quiz/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Choose difficulty:", {
    reply_markup: {
      keyboard: [["Easy"], ["Medium"], ["Hard"]],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  });
});

bot.onText(/Easy|Medium|Hard/, (msg) => {
  const chatId = msg.chat.id;
  const level = msg.text.toLowerCase();
  const quiz = questions[level];
  if (!quiz) return;

  userStates[chatId] = { score: 0, index: 0, quiz, level, username: msg.from.username || msg.from.first_name };

  askQuestion(chatId);
});

function askQuestion(chatId) {
  const state = userStates[chatId];
  if (state.index >= state.quiz.length) {
    bot.sendMessage(chatId, `Quiz finished! You scored ${state.score}/${state.quiz.length}`);
    db.run('INSERT INTO scores(username, score, level) VALUES (?, ?, ?)', [state.username, state.score, state.level]);
    return;
  }

  const q = state.quiz[state.index];
  const opts = {
    reply_markup: {
      inline_keyboard: q.options.map((opt, i) => [{
        text: opt,
        callback_data: i.toString()
      }])
    }
  };

  bot.sendMessage(chatId, q.question, opts);
}

bot.on("callback_query", (cbq) => {
  const chatId = cbq.message.chat.id;
  const state = userStates[chatId];
  const answer = parseInt(cbq.data);
  const correct = state.quiz[state.index].correct;

  if (answer === correct) state.score++;
  state.index++;
  askQuestion(chatId);
});

bot.onText(/\/export/, (msg) => {
  const filePath = 'export.csv';
  const stream = fs.createWriteStream(filePath);
  stream.write("username,score,level\n");

  db.each("SELECT username, score, level FROM scores", (err, row) => {
    if (!err) {
      stream.write(`${row.username},${row.score},${row.level}\n`);
    }
  }, () => {
    stream.end(() => {
      bot.sendDocument(msg.chat.id, filePath);
    });
  });
});

bot.onText(/\/topscores/, (msg) => {
  db.all("SELECT username, score, level FROM scores ORDER BY score DESC LIMIT 5", (err, rows) => {
    if (err) return bot.sendMessage(msg.chat.id, "Error loading scores.");
    let text = "🏆 Top Scores:\n";
    rows.forEach((row, i) => {
      text += `${i + 1}. ${row.username} — ${row.score} (${row.level})\n`;
    });
    bot.sendMessage(msg.chat.id, text);
  });
});
