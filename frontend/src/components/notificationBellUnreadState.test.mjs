import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'NotificationBell.vue'), 'utf8');

assert.match(
  source,
  /await loadUnreadCount\(\)[\s\S]*?finally \{/,
  'loading notifications should refresh unread count so the red marker clears when all notifications are read',
);

assert.match(
  source,
  /const deletedNotification = notifications\.value\.find\(n => n\.id === id\)/,
  'deleting a notification should capture its read state before removing it',
);

assert.match(
  source,
  /if \(deletedNotification && !deletedNotification\.isRead\) \{[\s\S]*?unreadCount\.value = Math\.max\(0, unreadCount\.value - 1\)/,
  'deleting an unread notification should reduce unread count and clear the red marker when it reaches zero',
);

assert.match(
  source,
  /\.bell-icon\.has-unread(?:,\s*\.bell-icon\.has-unread:hover)?\s*\{[^}]*color:\s*#ef4444;/,
  'the header bell should turn red when unread notifications exist',
);

assert.match(
  source,
  /unreadCount\.value = Number\(res\.data\?\.data\?\.count \?\? 0\)/,
  'unread count should read the nested API payload count returned by the backend',
);

console.log('notification bell unread state tests passed');
