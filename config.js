const rc = require("rc");
const APP_NAME = "ninjapatreon";

module.exports = rc(APP_NAME, {
  patreon_client_id: "",
  patreon_client_secret: "",
  telegram_api_token: "",
  telegram_bot_name: "",
  telegram_chat_id: "",
  telegram_link_valid_time: "",
  port: 3000
});
