require("dotenv").config();
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const { Sequelize, Op } = require("sequelize");
const db = new sqlite3.Database("database.sqlite");

const { Verification } = require("./models/Verification");

const client = new Discord.Client();

const api = axios.create({ baseURL: process.env.API_URL });

async function verifyConfirmationPost(msg, exists) {
  const { id, forum_username, verified, verification_message_id } = exists;

  if (verified) {
    return msg.reply("You are already verified.");
  }

  const result = await api.get("posts", {
    params: {
      topic: "",
      author: forum_username,
      exact: `Verify: ${id}`,
    },
  });

  if (!result.data.count) {
    return msg.reply(
      "We couldn't verify you. Please wait a few minutes if you already made your verification post."
    );
  }

  const verification_post_url = result.data.rows[0].link;

  try {
    await Verification.update(
      { verified: true, verification_post_url },
      { where: { id } }
    );

    const newRole = await msg.channel.guild.roles.create({
      data: {
        name: forum_username,
        color: "GRAY",
      },
      reason: `Verified on BitcoinTalk as: ${forum_username}`,
    });

    const member = msg.channel.guild.member(msg.author);
    await member.roles.add(newRole);

    msg.reply(`You have been verified! Post: ${verification_post_url}`);
    return msg.channel.messages
      .fetch({ around: verification_message_id, limit: 1 })
      .then((msg) => {
        const fetchedMsg = msg.first();
        fetchedMsg.edit("Verified!", {
          embed: {
            title: `confirmed as ${forum_username}`,
            fields: [
              {
                name: "Forum Username",
                value: forum_username,
              },
              {
                name: "Discord",
                value: `<@${id}>`,
              },
              {
                name: "User ID",
                value: id,
              },
              {
                name: "Confirmation Post",
                value: `${verification_post_url}`,
              },
              {
                name: "Status",
                value: "✅ Confirmed",
              },
            ],
          },
        });
      });
  } catch (error) {
    console.log(error);
    return msg.reply("Something went wrong...");
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async (msg) => {
  if (msg.content.match(/\/verify .*/)) {
    if (msg.channel.name === "verify" && !msg.author.bot) {
      const user_id = msg.author.id;
      const username = msg.content.replace(/\/verify /, "").trim();

      const exists = await Verification.findByPk(user_id);

      if (exists) {
        if (exists.verified) return msg.reply("You are already verified.");
        return msg.reply("You already have pending verification.");
      }

      const usernameAlreadyVerified = await Verification.findOne({
        where: { forum_username: { [Op.iLike]: username }, verified: true },
      });

      if (usernameAlreadyVerified) {
        return msg.reply(
          "There is already a member verified with this username."
        );
      }

      const verificationMessage = await msg.reply(
        "Please grab your Verification Message and post it in the verification thread. Type /confirm afterwards.",
        {
          embed: {
            title: "Pending Verification",
            fields: [
              {
                name: "Username",
                value: username,
              },
              {
                name: "User ID",
                value: msg.author.id,
              },
              {
                name: "Verification Message",
                value: `Verify: ${msg.author.id}`,
              },
              {
                name: "Status",
                value: "❌ Not confirmed",
              },
            ],
          },
        }
      );

      try {
        await Verification.create({
          id: user_id,
          forum_username: username,
          verification_message_id: verificationMessage.id,
        });
      } catch (error) {
        verificationMessage.delete();
        return msg.reply("Something went wrong...");
      }
    }
  }

  if (msg.content.match(/\/confirm/)) {
    if (msg.channel.name === "verify" && !msg.author.bot) {
      const user_id = msg.author.id;
      const exists = await Verification.findByPk(user_id);

      if (!exists) {
        return msg.reply("You do not have any pending verification.");
      }

      return verifyConfirmationPost(msg, exists);
    }
  }

  if (msg.content === "ping") {
    msg.reply("Pong!");
  }
});

client.login(process.env.DISCORD_BOT_KEY);
