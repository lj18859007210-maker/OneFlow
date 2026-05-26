const assert = require('assert');

const {
  splitLegacyCommentContent,
  mergeCommentRecord
} = require('./utils/commentAttachments');

function run() {
  const split = splitLegacyCommentContent([
    '补充说明一',
    'https://example.com/a.png',
    '',
    'https://example.com/spec.pdf',
    '补充说明二'
  ].join('\n'));

  assert.deepStrictEqual(
    split,
    {
      content: '补充说明一\n补充说明二',
      legacyAttachments: [
        { name: 'a.png', url: 'https://example.com/a.png', mimeType: 'image/*', source: 'legacy-inline' },
        { name: 'spec.pdf', url: 'https://example.com/spec.pdf', mimeType: 'application/pdf', source: 'legacy-inline' }
      ]
    },
    'legacy inline file URLs should be separated from comment text without losing order-insensitive content'
  );

  const merged = mergeCommentRecord(
    {
      id: 'c-1',
      content: '这是评论内容',
      createdAt: '2026-05-26T00:00:00.000Z'
    },
    [
      { id: 'file-1', originalName: 'error.txt', url: '/uploads/error.txt', mimeType: 'text/plain' }
    ],
    [
      { name: 'old.png', url: 'https://example.com/old.png', mimeType: 'image/*', source: 'legacy-inline' }
    ]
  );

  assert.deepStrictEqual(
    merged.attachments,
    [
      { id: 'file-1', originalName: 'error.txt', url: '/uploads/error.txt', mimeType: 'text/plain' },
      { name: 'old.png', url: 'https://example.com/old.png', mimeType: 'image/*', source: 'legacy-inline' }
    ],
    'comment responses should merge stored attachments with compatible legacy inline files'
  );

  console.log('comment attachment compatibility tests passed');
}

run();
