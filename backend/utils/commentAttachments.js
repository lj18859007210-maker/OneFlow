const path = require('path');

function isLegacyAttachmentUrl(line) {
  return /^https?:\/\/\S+/i.test(line) || /^\/uploads\/\S+/i.test(line);
}

function guessMimeType(fileUrl) {
  const extension = path.extname(fileUrl).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(extension)) {
    return 'image/*';
  }
  if (extension === '.pdf') {
    return 'application/pdf';
  }
  return 'application/octet-stream';
}

function splitLegacyCommentContent(content) {
  const lines = String(content || '').split('\n');
  const textLines = [];
  const legacyAttachments = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (isLegacyAttachmentUrl(trimmed)) {
      legacyAttachments.push({
        name: path.basename(trimmed.split('?')[0]),
        url: trimmed,
        mimeType: guessMimeType(trimmed),
        source: 'legacy-inline'
      });
      return;
    }

    textLines.push(trimmed);
  });

  return {
    content: textLines.join('\n'),
    legacyAttachments
  };
}

function mergeCommentRecord(comment, attachments = [], legacyAttachments = []) {
  return {
    ...comment,
    attachments: [...attachments, ...legacyAttachments]
  };
}

module.exports = {
  splitLegacyCommentContent,
  mergeCommentRecord,
  guessMimeType
};
