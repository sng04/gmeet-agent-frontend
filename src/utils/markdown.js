/**
 * Lightweight markdown-to-HTML converter for chat messages.
 * Strips model artifacts like <thinking> tags.
 */
export function renderMarkdown(text) {
  if (!text) return '';

  // Strip model thinking/reflection tags
  let s = text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
    .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '')
    .replace(/<output>|<\/output>/gi, '')
    .trim();
  if (!s) return '';

  // Escape HTML
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Fenced code blocks (```lang\n...\n```)
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Inline code (must come after fenced blocks)
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Headers h1-h6 (must be at start of line)
  s = s.replace(/^#{6}\s+(.+)$/gm, '<div style="font-weight:600;font-size:12px;margin:8px 0 4px">$1</div>');
  s = s.replace(/^#{5}\s+(.+)$/gm, '<div style="font-weight:600;font-size:12px;margin:8px 0 4px">$1</div>');
  s = s.replace(/^#{4}\s+(.+)$/gm, '<div style="font-weight:600;font-size:13px;margin:8px 0 4px">$1</div>');
  s = s.replace(/^#{3}\s+(.+)$/gm, '<div style="font-weight:600;font-size:13px;margin:10px 0 4px">$1</div>');
  s = s.replace(/^#{2}\s+(.+)$/gm, '<div style="font-weight:600;font-size:14px;margin:10px 0 4px">$1</div>');
  s = s.replace(/^#{1}\s+(.+)$/gm, '<div style="font-weight:600;font-size:15px;margin:10px 0 4px">$1</div>');

  // Horizontal rules
  s = s.replace(/^[-*_]{3,}$/gm, '<hr style="border:none;border-top:1px solid var(--gray-200);margin:8px 0">');

  // Bold + italic (***text***)
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold (**text**)
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic (*text*)
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  // Strikethrough (~~text~~)
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Blockquotes (> text)
  s = s.replace(/^&gt;\s?(.+)$/gm, '<blockquote style="border-left:3px solid var(--gray-300);padding-left:10px;color:var(--gray-500);margin:4px 0">$1</blockquote>');

  // Unordered lists (- item or * item, but not inside code)
  s = s.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');

  // Numbered lists (1. item)
  s = s.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  s = s.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul style="margin:4px 0;padding-left:20px">$1</ul>');

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--pri-500)">$1</a>');

  // Paragraphs: double newline = paragraph break
  s = s.replace(/\n\n+/g, '</p><p>');
  // Single newline = line break (but not inside block elements)
  s = s.replace(/\n/g, '<br>');

  s = '<p>' + s + '</p>';

  // Clean up: remove empty paragraphs, fix <p> wrapping block elements
  s = s.replace(/<p>\s*<\/p>/g, '');
  s = s.replace(/<p>(<div[^>]*>)/g, '$1');
  s = s.replace(/(<\/div>)<\/p>/g, '$1');
  s = s.replace(/<p>(<pre>)/g, '$1');
  s = s.replace(/(<\/pre>)<\/p>/g, '$1');
  s = s.replace(/<p>(<ul[^>]*>)/g, '$1');
  s = s.replace(/(<\/ul>)<\/p>/g, '$1');
  s = s.replace(/<p>(<blockquote[^>]*>)/g, '$1');
  s = s.replace(/(<\/blockquote>)<\/p>/g, '$1');
  s = s.replace(/<p>(<hr[^>]*>)/g, '$1');
  s = s.replace(/(<hr[^>]*>)<\/p>/g, '$1');
  // Remove leading <br> inside paragraphs
  s = s.replace(/<p><br>/g, '<p>');

  return s;
}
