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
  return readCookieFromDocument(document, name);
}

function readCookieFromDocument(sourceDocument, name) {
  if (!sourceDocument) return "";
  const prefix = `${name}=`;
  const cookies = (sourceDocument.cookie || "").split(";");
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

function readStorage(sourceWindow, storageName, key) {
  try {
    return firstString([sourceWindow?.[storageName]?.getItem(key)]);
  } catch (error) {
    return "";
  }
}

function isSameOriginWindow(sourceWindow) {
  try {
    return Boolean(sourceWindow && sourceWindow.location && sourceWindow.location.origin === window.location.origin);
  } catch (error) {
    return false;
  }
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
  const hrefParams = new URL(window.location.href).searchParams;
  const sameOriginWindows = [window.opener, window.parent].filter((sourceWindow) => {
    return sourceWindow !== window && isSameOriginWindow(sourceWindow);
  });
  const readers = [
    (key) => readQuery(query, key),
    (key) => readSearch(params, key),
    (key) => readSearch(hrefParams, key),
    readCookie,
    (key) => readStorage(window, "localStorage", key),
    (key) => readStorage(window, "sessionStorage", key),
    ...sameOriginWindows.flatMap((sourceWindow) => [
      (key) => readCookieFromDocument(sourceWindow.document, key),
      (key) => readStorage(sourceWindow, "localStorage", key),
      (key) => readStorage(sourceWindow, "sessionStorage", key),
    ]),
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
