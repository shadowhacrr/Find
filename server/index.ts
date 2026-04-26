import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { initBot, notifyRegistration } from './bot';
import {
  addDevice,
  getDevices,
  getDeviceByUsername,
  updateDevice,
  setRinging,
  verifyPin,
  isOwner,
  getConfig,
  setOwnerTelegramId,
} from './data';

const app = express();
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/register', (req, res) => {
  const { username, pin, telegramChatId, ip, userAgent } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN are required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (pin.length < 4 || pin.length > 10) {
    return res.status(400).json({ error: 'PIN must be 4-10 characters' });
  }

  const existing = getDeviceByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const device = addDevice({
    username,
    pin,
    telegramChatId,
    ip,
    userAgent,
    isRinging: false,
  });

  // Notify Telegram if chat ID provided and owner exists
  const config = getConfig();
  if (telegramChatId && config.ownerTelegramId) {
    if (telegramChatId === config.ownerTelegramId) {
      notifyRegistration(telegramChatId, username);
    }
  } else if (telegramChatId && !config.ownerTelegramId) {
    // First device registration sets the owner
    setOwnerTelegramId(telegramChatId);
    notifyRegistration(telegramChatId, username);
  }

  res.json({ success: true, device: { username: device.username, id: device.id } });
});

app.post('/api/update', (req, res) => {
  const { username, pin, location, battery, isRinging } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN required' });
  }

  if (!verifyPin(username, pin)) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const updates: any = { lastSeen: new Date().toISOString() };
  if (location) updates.location = { ...location, timestamp: new Date().toISOString() };
  if (battery !== undefined) updates.battery = { ...battery, timestamp: new Date().toISOString() };
  if (isRinging !== undefined) updates.isRinging = isRinging;

  const device = updateDevice(username, updates);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({
    success: true,
    isRinging: device.isRinging,
    username: device.username,
  });
});

app.get('/api/device/:username', (req, res) => {
  const { username } = req.params;
  const { pin } = req.query;

  if (!pin) {
    return res.status(400).json({ error: 'PIN required' });
  }

  if (!verifyPin(username, pin as string)) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const device = getDeviceByUsername(username);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({
    isRinging: device.isRinging,
    lastSeen: device.lastSeen,
    location: device.location,
    battery: device.battery,
  });
});

app.post('/api/ring/:username', (req, res) => {
  const { username } = req.params;
  const { pin, telegramChatId } = req.body;

  // Require either PIN or owner telegram ID
  const config = getConfig();
  if (telegramChatId && config.ownerTelegramId === telegramChatId) {
    // Owner can ring without PIN
  } else if (pin && verifyPin(username, pin)) {
    // PIN verified
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const device = setRinging(username, true);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({ success: true, isRinging: true });
});

app.post('/api/stop-ring/:username', (req, res) => {
  const { username } = req.params;
  const { pin, telegramChatId } = req.body;

  const config = getConfig();
  if (telegramChatId && config.ownerTelegramId === telegramChatId) {
    // Owner can stop
  } else if (pin && verifyPin(username, pin)) {
    // PIN verified
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const device = setRinging(username, false);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({ success: true, isRinging: false });
});

app.get('/api/devices', (req, res) => {
  const devices = getDevices().map((d) => ({
    username: d.username,
    lastSeen: d.lastSeen,
    isRinging: d.isRinging,
    hasLocation: !!d.location,
    hasBattery: !!d.battery,
  }));
  res.json({ devices });
});

app.get('/api/config', (req, res) => {
  const config = getConfig();
  res.json({ ownerTelegramId: config.ownerTelegramId });
});

// Serve static frontend files
app.use(express.static(path.join(process.cwd(), 'dist')));

// SPA fallback - must use Express 5 compatible pattern
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);

  if (TELEGRAM_BOT_TOKEN) {
    initBot(TELEGRAM_BOT_TOKEN);
    console.log('Telegram bot started');
  } else {
    console.log('No TELEGRAM_BOT_TOKEN provided. Bot is not running.');
    console.log('Set TELEGRAM_BOT_TOKEN env var to enable Telegram bot.');
  }
});
