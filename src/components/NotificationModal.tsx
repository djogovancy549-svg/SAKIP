import { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  FilePlus,
  FileCheck2,
  FileX,
  RotateCcw,
  FolderTree,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { NotificationItem, UserAccount, DocumentItem } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectDocumentById: (docId: string) => void;
}

export function NotificationModal({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectDocumentById,
}: NotificationModalProps) {
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!isOpen) return null;

  const isDinas = currentUser.role === 'DINAS_PEMOHON';

  // Filter notifications for current user's role and OPD
  const userNotifications = notifications.filter((item) => {
    if (item.targetRole === 'ALL') return true;
    if (isDinas) {
      if (item.targetRole !== 'DINAS_PEMOHON') return false;
      if (item.targetOpdId && item.targetOpdId !== currentUser.opdId) return false;
      return true;
    } else {
      return item.targetRole === 'VERIFIKATOR';
    }
  });

  const filteredItems = userNotifications.filter((item) => {
    if (filterTab === 'UNREAD') return !item.isRead;
    return true;
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'NEW_UPLOAD':
        return <FilePlus className="w-4 h-4 text-blue-600" />;
      case 'REVISION_UPLOAD':
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case 'VERIFICATION_APPROVED':
        return <FileCheck2 className="w-4 h-4 text-emerald-600" />;
      case 'VERIFICATION_REJECTED':
        return <FileX className="w-4 h-4 text-rose-600" />;
      case 'VERIFICATION_REVISION_NEEDED':
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case 'FOLDER_REGISTERED':
        return <FolderTree className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 bg-white/10 border border-white/20 rounded-xl text-white">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-xs">
                Pusat Notifikasi Aktivitas SAKIP
              </h2>
              <p className="text-[11px] text-blue-100">
                {isDinas
                  ? `Notifikasi pengajuan & status verifikasi ${currentUser.opdName}`
                  : 'Notifikasi berkas baru & revisi dari seluruh OPD'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar & Action */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Semua ({userNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('UNREAD')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'UNREAD'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
              <div className="text-sm font-bold text-slate-800">
                Tidak ada notifikasi {filterTab === 'UNREAD' ? 'belum dibaca' : ''}
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {isDinas
                  ? 'Setiap ada pembaruan status verifikasi atau persetujuan dokumen, pemberitahuan akan tampil di sini.'
                  : 'Setiap ada dokumen baru atau revisi yang diunggah oleh OPD, notifikasi akan tampil di sini.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.isRead) onMarkAsRead(item.id);
                  if (item.docId) {
                    onSelectDocumentById(item.docId);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                  item.isRead
                    ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                    : 'bg-blue-50/70 border-blue-300 text-blue-950 font-medium shadow-2xs hover:bg-blue-50'
                }`}
              >
                {!item.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0 shadow-2xs mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 pr-4">
                      <div className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {item.title}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {item.message}
                    </p>

                    <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-medium border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-blue-800 font-bold">{item.senderName}</span>
                        <span>·</span>
                        <span className="text-slate-600">{item.senderOpd}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="text-[11px] font-medium text-slate-500">
            Sistem Notifikasi Real-Time SAKIP Nagekeo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated Floating Notification Toast Bar
 */
export function NotificationToast({
  notification,
  onDismiss,
  onClick,
}: {
  notification: NotificationItem | null;
  onDismiss: () => void;
  onClick: () => void;
}) {
  if (!notification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full bg-slate-950 text-white border-2 border-blue-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-md">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-xs text-sky-400">{notification.title}</div>
            <div className="text-xs text-slate-200 leading-snug">{notification.message}</div>
            <div className="text-[10px] text-slate-400 font-mono pt-1">
              {notification.senderName} ({notification.senderOpd}) · {notification.timestamp}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end gap-2 text-xs">
        <button
          onClick={() => {
            onClick();
            onDismiss();
          }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Buka Dokumen</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
