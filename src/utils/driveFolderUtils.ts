/**
 * Utility functions for Google Drive Folder URL parsing and validation
 */

export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Match /folders/([a-zA-Z0-9_-]+)
  const matchFolders = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolders && matchFolders[1]) {
    return matchFolders[1];
  }

  // Match ?id=([a-zA-Z0-9_-]+) or &id=([a-zA-Z0-9_-]+)
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return matchId[1];
  }

  // If it's a raw folder ID without protocol
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export function buildDriveFolderUrl(folderIdOrUrl: string): string {
  if (!folderIdOrUrl) return '';
  const trimmed = folderIdOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanId = extractDriveFolderId(trimmed);
  return `https://drive.google.com/drive/folders/${cleanId}`;
}

export function isValidDriveLink(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  return (
    trimmed.includes('drive.google.com') ||
    trimmed.includes('/folders/') ||
    /^[a-zA-Z0-9_-]{15,}$/.test(trimmed)
  );
}
