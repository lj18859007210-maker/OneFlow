export const SSO_TOKEN_KEYS = ["jkToken", "token"];
export const SSO_USERNAME_KEYS = ["jkUsername", "username", "login_user", "userName", "loginName", "account", "name"];

function firstString(values) {
  for (const value of values) {
    const current = Array.isArray(value) ? value[0] : value;
    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }
  }
  return "";
}

function readQuery(query, key) {
  return firstString([query?.[key]]);
}

function readSearch(params, key) {
  return firstString([params.get(key)]);
}

function readCookie(name) {
  const prefix = `${name}=`;
  const cookies = (document.cookie || "").split(";");
  for (const cookie of cookies) {
    const item = cookie.trim();
    if (!item.startsWith(prefix)) continue;

    const value = item.slice(prefix.length);
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }
  return "";
}

function firstFromKeys(keys, readers) {
  for (const key of keys) {
    const value = firstString(readers.map((reader) => reader(key)));
    if (value) return value;
  }
  return "";
}

export function buildSsoPayload(query = {}, search = window.location.search || "") {
  const params = new URLSearchParams(search);
  const readers = [
    (key) => readQuery(query, key),
    (key) => readSearch(params, key),
    readCookie,
  ];
  const username = firstFromKeys(SSO_USERNAME_KEYS, readers);

  return {
    jkToken: firstFromKeys(SSO_TOKEN_KEYS, readers),
    jkUsername: username,
    username,
    forceSso: firstString([readQuery(query, "forceSso"), readSearch(params, "forceSso")]),
    manualLogout: firstString([readQuery(query, "manualLogout"), readSearch(params, "manualLogout")]),
  };
}

export function hasSsoLoginSignal(query = {}) {
  if (firstString([query.forceSso]) === "1") return true;

  return [...SSO_TOKEN_KEYS, ...SSO_USERNAME_KEYS].some((key) => Boolean(firstString([query[key]])));
}
