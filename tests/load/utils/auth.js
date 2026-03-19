import http from "k6/http";
import { check } from "k6";
import { BASE_URL, DEFAULT_HEADERS } from "./config.js";

let vuCounter = 0;

export function generateUniqueEmail() {
  vuCounter++;
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `loadtest_${timestamp}_${random}_${__VU}@stress-test.invalid`;
}

export function register(email, password, name) {
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password, name }),
    { headers: DEFAULT_HEADERS }
  );

  const ok = check(res, {
    "register: status 201 or 409": (r) => r.status === 201 || r.status === 409,
  });

  if (res.status === 201) {
    const body = res.json();
    return body.token || null;
  }
  return null;
}

export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: DEFAULT_HEADERS }
  );

  check(res, {
    "login: status 200": (r) => r.status === 200,
    "login: has token": (r) => {
      try {
        return !!r.json("token");
      } catch {
        return false;
      }
    },
  });

  if (res.status === 200) {
    try {
      return res.json("token");
    } catch {
      return null;
    }
  }
  return null;
}

export function registerAndLogin() {
  const email = generateUniqueEmail();
  const password = "LoadTest123!";
  const name = `LoadTest User ${__VU}`;

  let token = register(email, password, name);
  if (!token) {
    token = login(email, password);
  }
  return { token, email, password };
}
