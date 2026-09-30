/**
 * Direct Google Drive API v3 Service
 * Uploads physical files directly into Google Drive folders using OAuth Bearer Token.
 */

export interface DriveUploadResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Upload a file directly into a specific Google Drive Folder using OAuth Token
 */
export async function uploadFileToGoogleDriveFolder(
  accessToken: string,
  fileName: string,
  mimeType: string,
  base64Data: string,
  folderId?: string
): Promise<DriveUploadResponse> {
  // Clean base64 string if data URL prefix exists
  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const fileBlob = new Blob([byteArray], { type: mimeType });

  // Metadata payload for Drive API
  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: mimeType,
  };

  if (folderId && folderId.trim() !== '') {
    metadata.parents = [folderId.trim()];
  }

  // Use multipart upload to send metadata + file content in a single request
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API Error (${response.status}): ${errorText}`);
  }

  const result: DriveUploadResponse = await response.json();
  return result;
}
