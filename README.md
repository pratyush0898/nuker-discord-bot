# Nuker Discord Bot

> ⚠️ **Warning:** This project is built for educational purposes only. Misusing it against Discord's Terms of Service or any server you do not own is likely to result in account/channel bans and potentially legal action.

A small Node.js bot that demonstrates how to interact with the Discord API using `discord.js`. When triggered via a console command, the bot will iterate over all joined guilds and attempt to rename channels and send messages.

---

## 🚀 Features

- Connects to Discord using a bot token
- Lists all guilds the bot is in+
- Iterates through every channel in each guild
- Renames channels & categorys to a fixed name
- Bans every member in each guild
- Sends a burst of messages and then continues sending interval messages in text channels

---

## 🧩 Prerequisites

- Node.js 18+ (or a compatible LTS version)
- A Discord bot token with all the intents enabled and with Administration permission provided.

> Note: Discord bots require the correct intents to access guild and message data. Some intents (like Message Content) may require explicit approval from Discord depending on bot usage.

---

## 🛠️ Setup

1. Clone this repository (if you haven't already):

```bash
git clone https://github.com/pratyush0898/nuker-discord-bot.git
cd nuker-discord-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with your bot token:

```env
DISCORD_TOKEN=your_bot_token_here
```

4. Start the bot:

```bash
npm start
```

---

## ▶️ Usage

After the bot logs in, it will display a prompt in the terminal:

- Type `nuke` and press Enter to start processing all guilds the bot is in.
- Type `exit` and press Enter to quit the bot.

---

## 💰 Pricing (Offer)

This project also supports monetized services (as discussed):

- $10 per nuke execution (one-time nuke process)
- $20  for background burst for a month
- $50 per month for full Antinuke + Nuke whitelist protection

> These are service-level options. The code is unchanged (no enforcement in the bot), they are part of the support/service pricing model.

---

## ⚠️ Important Notes

- This bot is extremely aggressive and can be disruptive. Only run it in servers you own or explicitly have permission to interact with in this way.
- Discord’s API rate limits and anti-abuse policies still apply. Running this against a server you do not control is against Discord’s Terms of Service.

---

## 🧾 License

This project is licensed under the [MIT License](LICENSE).
