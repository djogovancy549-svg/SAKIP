/**
 * Utility Helper: Batas Waktu / Deadline Revisi Dokumen SAKIP
 * Menghitung sisa waktu, status keterlambatan (overdue), dan format tanggal ramah pengguna.
 */

export interface DeadlineInfo {
  hasDeadline: boolean;
  formattedDate: string;
  isOverdue: boolean;
  isNearDeadline: boolean; // < 24 jam tersisa
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  humanDiff: string;
  statusBadge: {
    bg: string;
    border: string;
    text: string;
    label: string;
    icon: 'overdue' | 'urgent' | 'ontime' | 'none';
  };
}

export function parseDeadlineDate(deadlineStr?: string): Date | null {
  if (!deadlineStr || !deadlineStr.trim()) return null;
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function calculateDeadlineInfo(deadlineStr?: string): DeadlineInfo {
  if (!deadlineStr || !deadlineStr.trim()) {
    return {
      hasDeadline: false,
      formattedDate: '-',
      isOverdue: false,
      isNearDeadline: false,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      humanDiff: 'Tidak ada batas waktu',
      statusBadge: {
        bg: 'bg-slate-100',
        border: 'border-slate-200',
        text: 'text-slate-600',
        label: 'Tanpa Batas Waktu',
        icon: 'none',
      },
    };
  }

  const deadline = parseDeadlineDate(deadlineStr);
  if (!deadline) {
    return {
      hasDeadline: false,
      formattedDate: deadlineStr,
      isOverdue: false,
      isNearDeadline: false,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      humanDiff: deadlineStr,
      statusBadge: {
        bg: 'bg-slate-100',
        border: 'border-slate-200',
        text: 'text-slate-600',
        label: deadlineStr,
        icon: 'none',
      },
    };
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiff / (1000 * 60));
  const totalHours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const isNearDeadline = !isOverdue && totalHours < 24;

  let humanDiff = '';
  if (isOverdue) {
    if (days > 0) humanDiff = `Terlambat ${days} hari ${hours} jam`;
    else if (hours > 0) humanDiff = `Terlambat ${hours} jam ${minutes} mnt`;
    else humanDiff = `Terlambat ${minutes} menit`;
  } else {
    if (days > 0) humanDiff = `Sisa ${days} hari ${hours} jam`;
    else if (hours > 0) humanDiff = `Sisa ${hours} jam ${minutes} mnt`;
    else humanDiff = `Sisa ${minutes} menit lagi`;
  }

  const formattedDate = deadline.toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isOverdue) {
    return {
      hasDeadline: true,
      formattedDate,
      isOverdue: true,
      isNearDeadline: false,
      daysLeft: -days,
      hoursLeft: -totalHours,
      minutesLeft: -totalMinutes,
      humanDiff,
      statusBadge: {
        bg: 'bg-rose-50',
        border: 'border-rose-400',
        text: 'text-rose-700',
        label: `TERLAMBAT (${humanDiff})`,
        icon: 'overdue',
      },
    };
  }

  if (isNearDeadline) {
    return {
      hasDeadline: true,
      formattedDate,
      isOverdue: false,
      isNearDeadline: true,
      daysLeft: days,
      hoursLeft: totalHours,
      minutesLeft: totalMinutes,
      humanDiff,
      statusBadge: {
        bg: 'bg-amber-50',
        border: 'border-amber-400',
        text: 'text-amber-800',
        label: `DEADLINE SEGERA BERAKHIR (${humanDiff})`,
        icon: 'urgent',
      },
    };
  }

  return {
    hasDeadline: true,
    formattedDate,
    isOverdue: false,
    isNearDeadline: false,
    daysLeft: days,
    hoursLeft: totalHours,
    minutesLeft: totalMinutes,
    humanDiff,
    statusBadge: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      label: `Deadline: ${formattedDate} (${humanDiff})`,
      icon: 'ontime',
    },
  };
}

/**
 * Format string untuk input datetime-local
 */
export function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Buat deadline default berdasarkan penambahan hari
 */
export function createDefaultDeadline(daysToAdd: number = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(16, 0, 0, 0); // Jam kerja tutup pukul 16:00
  return toDateTimeLocalString(d);
}
