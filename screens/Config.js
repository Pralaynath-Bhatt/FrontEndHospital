// Config.js
// ─────────────────────────────────────────────────────────────────────────────
// The problem with exporting a plain string as default:
//   export default _url   ← exports the VALUE at load time, never updates
//
// Solution: export a Proxy object that always reads the latest _url.
// Every file that does:
//   import BASE_URL from "./Config"
//   `${BASE_URL}:8080/api/...`
// will automatically use the current IP with zero changes.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "cardioai_server_ip";
const DEFAULT_IP  = "https://nonpermeable-lamellirostral-harland.ngrok-free.dev";

let _url = DEFAULT_IP;

// ── Named exports for App.js and WelcomeScreen ────────────────────────────────

export async function initConfig() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      _url = saved.trim();
      console.log("[Config] Loaded saved IP:", _url);
    } else {
      console.log("[Config] No saved IP, using default:", _url);
    }
  } catch (e) {
    console.log("[Config] Storage error, using default:", _url);
  }
}

export async function saveServerIp(ip) {
  const clean = ip.trim().replace(/\/$/, "");
  _url = clean;
  await AsyncStorage.setItem(STORAGE_KEY, clean);
  console.log("[Config] Saved new IP:", _url);
}

export function getCurrentIp() {
  return _url;
}

// ── Default export — a Proxy that always returns the current _url ─────────────
// When your code does:  `${BASE_URL}:8080/api/heart/predict/text`
// JavaScript calls .toString() on BASE_URL, which the Proxy intercepts
// and returns the latest _url string every single time.

const BASE_URL = new Proxy(
  {},
  {
    get(_, prop) {
      // toString / valueOf / Symbol.toPrimitive — all return current _url
      if (
        prop === Symbol.toPrimitive ||
        prop === "toString"         ||
        prop === "valueOf"
      ) {
        return () => _url;
      }
      // For any other property access, return from the string
      return _url[prop];
    },
  }
);

export default BASE_URL;