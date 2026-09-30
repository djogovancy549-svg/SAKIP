/**
 * Utility for 3-Month (90-Day) Retention & Archival Policy for Old Drafts
 */

export function calculateRetention(uploadedAtStr: string): {
  expiryDateStr: string;
  daysLeft: number;
  isExpired: boolean;
} {
  // Parse date or fallback to current time minus offset
  let uploadDate = new Date();
  try {
    // Attempt parse
    const parsed = Date.parse(uploadedAtStr);
    if (!isNaN(parsed)) {
      uploadDate = new Date(parsed);
    }
  } catch {
    uploadDate = new Date();
  }

  // Add 90 days (3 months)
  const expiryDate = new Date(uploadDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isExpired = daysLeft <= 0;

  const expiryDateStr = expiryDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    expiryDateStr,
    daysLeft: daysLeft > 90 ? 90 : daysLeft,
    isExpired,
  };
}

export function formatArchiveSubfolder(opdName: string): string {
  return `Google Drive Induk / ${opdName} / ARSIP_DRAF_LAMA_3_BULAN`;
}
