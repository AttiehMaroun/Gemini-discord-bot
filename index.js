
import dotenv from 'dotenv'; dotenv.config();
import {GoogleGenerativeAI , HarmBlockThreshold, HarmCategory} from "@google/generative-ai";
import {
    Client, REST, Partials,
    GatewayIntentBits, Routes,
    ActivityType, ChannelType
  }
    from 'discord.js';
import chalk from 'chalk';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const activity = '/gemini "Your question"'

const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

const commands = [
    {
      name: 'gemini',
      description: 'Ask Anything!',
      dm_permission: false,
      options: [
        {
          name: "question",
          description: "Your question",
          type: 3,
          required: true
        }
      ]
    }
]

async function initDiscordCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
      console.log('Started refreshing application commands (/)');
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands }).then(() => {
        console.log('Successfully reloaded application commands (/)');
      }).catch(e => console.log(chalk.red(e)));
      console.log('Connecting to Discord Gateway...');
    } catch (error) {
      console.log(chalk.red(error));
    }
  }
async function main(){
  await initDiscordCommands().catch(e => { console.log(e) });
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
  });
  client.login(process.env.DISCORD_BOT_TOKEN).catch(e => console.log(chalk.red(e)));
  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(chalk.greenBright('Connected to Discord Gateway'));
    console.log(new Date())
    client.user.setStatus('online');
    client.user.setActivity(activity);
  });

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    client.user.setActivity(interaction.user.tag, { type: ActivityType.Watching });
    
    switch (interaction.commandName) {
        case "gemini":
          ask_Interaction_Handler(interaction);
          break;
        default:
        await interaction.reply({ content: 'Command Not Found' });

  }
  });
    async function ask_Interaction_Handler(interaction){
        const question = interaction.options.getString("question");
        const model = genAI.getGenerativeModel({ model: "gemini-pro", safetySettings});
        try{
            await interaction.reply({ content: `Let Me Think 🤔` });
            const prompt = question
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            //await interaction.editReply();
            
            if (text.length >= process.env.DISCORD_MAX_RESPONSE_LENGTH) {
                await interaction.editReply({ content: "The Answer Is Too Powerful 🤯,\nCheck Your DM 😅" });
                splitAndSendResponse(text, interaction.user);
              } else {
                await interaction.editReply(`**${interaction.user.tag}:** ${question}\n**${client.user.username}:** ${text}\n`);
                
              }
            
        }catch(e){
            console.error(chalk.red(e));
        }

    
    }
    async function splitAndSendResponse(resp, user) {
        while (resp.length > 0) {
          let end = Math.min(process.env.DISCORD_MAX_RESPONSE_LENGTH, resp.length)
          await user.send(resp.slice(0, end))
          resp = resp.slice(end, resp.length)
        }
      }
}

main()