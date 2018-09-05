const Koa = require("koa");
const Router = require("koa-router");
const Telegraf = require("telegraf");
const { patreon: patreonAPI, oauth: patreonOAuth } = require("patreon");
const config = require("./config");

const {
  patreon_client_id: CLIENT_ID,
  patreon_client_secret: CLIENT_SECRET,
  telegram_api_token: TELEGRAM_API_TOKEN,
  telegram_bot_name: TELEGRAM_BOT_NAME,
  telegram_chat_id: CHAT_ID,
  telegram_link_valid_time: DELAY,
  host: HOST,
  port: PORT
} = config;

const API_PATH = "/api/v1/auth";
const REDIRECT_URL = `${HOST}${API_PATH}`;

const patreonOAuthClient = patreonOAuth(CLIENT_ID, CLIENT_SECRET);
const bot = new Telegraf(TELEGRAM_API_TOKEN);
const router = new Router();

router.get("/", ctx => {
  ctx.body = { success: true };
});

router.get(API_PATH, async ctx => {
  const { code, state: userId } = ctx.request.query;
  const { access_token: accessToken } = await patreonOAuthClient.getTokens(
    code,
    REDIRECT_URL
  );
  const patreonAPIClient = patreonAPI(accessToken);

  const { store } = await patreonAPIClient("/current_user");
  const isPatron = store.findAll("pledge").length > 0;
  ctx.redirect(`https://t.me/${TELEGRAM_BOT_NAME}`);
  if (isPatron) {
    sendPatreonReply(userId);
  } else {
    bot.telegram.sendMessage(
      userId,
      "Извините, но вы не поддерживаете наш проект на Patreon"
    );
  }
});

let currentLink = null;
async function clearLink() {
  currentLink = null;
  await bot.telegram.exportChatInviteLink(CHAT_ID);
}

function handlePatreonRequest(ctx) {
  ctx.reply(
    "Для доступа к закрытому чату авторизуйтесь на Patreon",
    Telegraf.Extra.Markup.inlineKeyboard([
      Telegraf.Extra.Markup.urlButton(
        "Авторизация",
        "https://www.patreon.com/oauth2/authorize?" +
          [
            "response_type=code",
            `client_id=${CLIENT_ID}`,
            `redirect_uri=${REDIRECT_URL}`,
            `state=${ctx.from.id}`
          ].join("&")
      )
    ])
      .oneTime()
      .resize()
      .extra()
  );
}

bot.command("start", async ctx => {
  handlePatreonRequest(ctx);
});

async function sendPatreonReply(chatId) {
  if (!currentLink) {
    currentLink = {
      value: bot.telegram.exportChatInviteLink(CHAT_ID),
      timeout: setTimeout(clearLink, DELAY * 1000)
    };
  } else {
    clearTimeout(currentLink.timeout);
    currentLink.timeout = setTimeout(clearLink, DELAY * 1000);
  }
  const link = await currentLink.value;
  bot.telegram.sendMessage(
    chatId,
    "Верификация успешно завершена. Нажмите кнопку, чтобы присоединиться к чату",
    Telegraf.Extra.Markup.inlineKeyboard([
      Telegraf.Extra.Markup.urlButton("Присоединиться к чату подписчиков", link)
    ])
      .oneTime()
      .resize()
      .extra()
  );
}

const app = new Koa();
app.use(router.routes());
app.use(router.allowedMethods());

// bot.startPolling();
app.listen(PORT);
