export async function copyToClipboard(text) {
  if (text === undefined || text === null) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard unavailable');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const succeeded = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!succeeded) {
    throw new Error('Copy failed');
  }

  return true;
}
