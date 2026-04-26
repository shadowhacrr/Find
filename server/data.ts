import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

interface Device {
  id: string;
  username: string;
  pin: string;
  telegramChatId?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
  };
  battery?: {
    level: number;
    charging: boolean;
    timestamp: string;
  };
  isRinging: boolean;
  ringStartedAt?: string;
  lastSeen: string;
  registeredAt: string;
  ip?: string;
  userAgent?: string;
}

interface Config {
  ownerTelegramId?: string;
  secretKey: string;
  devices: Device[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readConfig(): Config {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig: Config = {
      secretKey: generateSecretKey(),
      devices: [],
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data) as Config;
  } catch {
    return { secretKey: generateSecretKey(), devices: [] };
  }
}

function writeConfig(config: Config) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function generateSecretKey(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getConfig(): Config {
  return readConfig();
}

export function getDevices(): Device[] {
  return readConfig().devices;
}

export function getDeviceByUsername(username: string): Device | undefined {
  return readConfig().devices.find(
    (d) => d.username.toLowerCase() === username.toLowerCase()
  );
}

export function addDevice(device: Omit<Device, 'id' | 'registeredAt' | 'lastSeen'>): Device {
  const config = readConfig();
  const newDevice: Device = {
    ...device,
    id: generateSecretKey(),
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  config.devices.push(newDevice);
  writeConfig(config);
  return newDevice;
}

export function updateDevice(username: string, updates: Partial<Device>): Device | null {
  const config = readConfig();
  const index = config.devices.findIndex(
    (d) => d.username.toLowerCase() === username.toLowerCase()
  );
  if (index === -1) return null;
  config.devices[index] = { ...config.devices[index], ...updates };
  writeConfig(config);
  return config.devices[index];
}

export function deleteDevice(username: string): boolean {
  const config = readConfig();
  const initialLength = config.devices.length;
  config.devices = config.devices.filter(
    (d) => d.username.toLowerCase() !== username.toLowerCase()
  );
  if (config.devices.length < initialLength) {
    writeConfig(config);
    return true;
  }
  return false;
}

export function setRinging(username: string, ringing: boolean): Device | null {
  return updateDevice(username, {
    isRinging: ringing,
    ringStartedAt: ringing ? new Date().toISOString() : undefined,
  });
}

export function verifyPin(username: string, pin: string): boolean {
  const device = getDeviceByUsername(username);
  if (!device) return false;
  return device.pin === pin;
}

export function setOwnerTelegramId(telegramId: string): void {
  const config = readConfig();
  config.ownerTelegramId = telegramId;
  writeConfig(config);
}

export function isOwner(telegramId: string): boolean {
  const config = readConfig();
  return config.ownerTelegramId === telegramId;
}
