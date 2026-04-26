import TelegramBot from 'node-telegram-bot-api';
import {
  getDevices,
  getDeviceByUsername,
  setRinging,
  isOwner,
  setOwnerTelegramId,
  verifyPin,
  getConfig,
} from './data';

let bot: TelegramBot | null = null;

export function initBot(token: string): TelegramBot {
  if (bot) return bot;

  bot = new TelegramBot(token, { polling: true });

  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // If no owner set, this first user becomes the owner
    const config = getConfig();
    if (!config.ownerTelegramId) {
      setOwnerTelegramId(chatId);
      bot!.sendMessage(
        chatId,
        `Welcome ${username}! You are now the *OWNER* of this Find Your Lost Device bot.

Your Telegram ID has been registered as the owner. Only you can use this bot.

To register a device:
1. Open the website on your mobile
2. Set a username and PIN
3. The device will be linked automatically

Use /devices to see your registered devices.
Use /help for more commands.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (!isOwner(chatId)) {
      bot!.sendMessage(
        chatId,
        'Sorry, you are not authorized to use this bot. Only the owner can access it.'
      );
      return;
    }

    sendDeviceMenu(chatId);
  });

  // /devices command
  bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id.toString();
    if (!isOwner(chatId)) {
      bot!.sendMessage(chatId, 'Unauthorized.');
      return;
    }
    sendDeviceMenu(chatId);
  });

  // /help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id.toString();
    bot!.sendMessage(
      chatId,
      `*Find Your Lost Device - Help*

/start - Show your registered devices
/devices - Same as /start
/help - Show this help message

*How to register a device:*
1. Open the website on your mobile phone
2. Enter a unique username and a secret PIN
3. Your device will be registered

*When your device is lost:*
1. Open this bot in Telegram
2. Select your device from the menu
3. Choose: Get Location, Get Battery, or Ring Device

The ring feature will make your phone play a loud sound!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Handle callback queries (inline button clicks)
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id.toString();
    if (!chatId || !isOwner(chatId)) {
      bot!.answerCallbackQuery(query.id, { text: 'Unauthorized' });
      return;
    }

    const data = query.data || '';

    if (data.startsWith('device:')) {
      const deviceUsername = data.split(':')[1];
      sendDeviceActions(chatId, deviceUsername);
    } else if (data.startsWith('location:')) {
      const deviceUsername = data.split(':')[1];
      const device = getDeviceByUsername(deviceUsername);
      if (device?.location) {
        const loc = device.location;
        bot!.sendMessage(
          chatId,
          `Location for *${device.username}*\n\nLatitude: ${loc.latitude}\nLongitude: ${loc.longitude}\nAccuracy: ${loc.accuracy || 'N/A'} meters\nUpdated: ${new Date(loc.timestamp).toLocaleString()}`,
          { parse_mode: 'Markdown' }
        );
        // Also send a map link
        bot!.sendMessage(
          chatId,
          `[Open in Google Maps](https://www.google.com/maps?q=${loc.latitude},${loc.longitude})`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot!.sendMessage(chatId, `No location data available for *${deviceUsername}*. The device may be offline.`, { parse_mode: 'Markdown' });
      }
      bot!.answerCallbackQuery(query.id);
    } else if (data.startsWith('battery:')) {
      const deviceUsername = data.split(':')[1];
      const device = getDeviceByUsername(deviceUsername);
      if (device?.battery) {
        const bat = device.battery;
        bot!.sendMessage(
          chatId,
          `Battery for *${device.username}*\n\nLevel: ${(bat.level * 100).toFixed(0)}%\nStatus: ${bat.charging ? 'Charging' : 'Discharging'}\nUpdated: ${new Date(bat.timestamp).toLocaleString()}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot!.sendMessage(chatId, `No battery data available for *${deviceUsername}*. The device may be offline.`, { parse_mode: 'Markdown' });
      }
      bot!.answerCallbackQuery(query.id);
    } else if (data.startsWith('ring:')) {
      const deviceUsername = data.split(':')[1];
      setRinging(deviceUsername, true);
      bot!.sendMessage(
        chatId,
        `Ringing *${deviceUsername}*... Your phone should start making noise now!`,
        { parse_mode: 'Markdown' }
      );
      bot!.answerCallbackQuery(query.id);
    } else if (data.startsWith('stopring:')) {
      const deviceUsername = data.split(':')[1];
      setRinging(deviceUsername, false);
      bot!.sendMessage(chatId, `Stopped ringing *${deviceUsername}*.`, { parse_mode: 'Markdown' });
      bot!.answerCallbackQuery(query.id);
    } else if (data === 'refresh') {
      sendDeviceMenu(chatId);
      bot!.answerCallbackQuery(query.id);
    }
  });

  return bot;
}

function sendDeviceMenu(chatId: string) {
  const devices = getDevices();
  const config = getConfig();

  if (devices.length === 0) {
    bot!.sendMessage(
      chatId,
      `No devices registered yet.\n\nTo register a device:\n1. Open the website: ${process.env.WEBSITE_URL || 'the website'}\n2. Set a username and PIN\n3. Your device will appear here automatically.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: 'Refresh', callback_data: 'refresh' }]],
        },
      }
    );
    return;
  }

  const buttons = devices.map((d) => [
    {
      text: `${d.username} ${d.isRinging ? '(Ringing!)' : ''}`,
      callback_data: `device:${d.username}`,
    },
  ]);

  buttons.push([{ text: 'Refresh List', callback_data: 'refresh' }]);

  bot!.sendMessage(
    chatId,
    `*Your Registered Devices* (${devices.length})\n\nSelect a device to control it:`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    }
  );
}

function sendDeviceActions(chatId: string, deviceUsername: string) {
  const device = getDeviceByUsername(deviceUsername);
  if (!device) {
    bot!.sendMessage(chatId, 'Device not found.');
    return;
  }

  const status = `Device: *${device.username}*\nLast seen: ${new Date(device.lastSeen).toLocaleString()}\nStatus: ${device.isRinging ? 'Ringing!' : 'Online'}`;

  const buttons = [
    [
      { text: 'Get Location', callback_data: `location:${device.username}` },
      { text: 'Get Battery', callback_data: `battery:${device.username}` },
    ],
    [
      { text: 'Ring Device', callback_data: `ring:${device.username}` },
      { text: 'Stop Ringing', callback_data: `stopring:${device.username}` },
    ],
    [{ text: 'Back to Devices', callback_data: 'refresh' }],
  ];

  bot!.sendMessage(chatId, status, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons },
  });
}

export function notifyRegistration(telegramChatId: string, username: string) {
  if (!bot) return;
  bot.sendMessage(
    telegramChatId,
    `Your mobile device has been registered!\n\nUsername: *${username}*\n\nIf you lose your device, open this bot and use /start to find it.`,
    { parse_mode: 'Markdown' }
  );
}

export { bot };
