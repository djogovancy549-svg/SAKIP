/**
 * GOOGLE APPS SCRIPT FILES: Code.gs & Index.html
 * Versi Mutakhir: Multi-Worksheet & Multi-Folder Lifecycle Architecture
 * 
 * 1. Sheet 'DOKUMEN_PROSES' (Folder: 01_DOKUMEN_PROSES) -> Terhapus otomatis dari proses saat sah
 * 2. Sheet 'DOKUMEN_SAH_TERVERIFIKASI' (Folder: 02_DOKUMEN_SAH_FINAL_5_TAHUN) -> Retensi resmi 5 Tahun
 * 3. Sheet 'SUMMARY_RIWAYAT_REVISI' (Folder: 03_DRAF_REVISI_SUMMARY_3_BULAN) -> Otomatis dibersihkan dalam 3 Bulan
 * 4. Sheet 'DATABASE_PENGGUNA'
 * 5. Sheet 'MAPPING_FOLDER_OPD'
 */

export { APPS_SCRIPT_CODE_GS } from './googleAppsScriptCodeGs';
export { APPS_SCRIPT_INDEX_HTML } from './googleAppsScriptIndexHtml';
import { APPS_SCRIPT_CODE_GS } from './googleAppsScriptCodeGs';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = APPS_SCRIPT_CODE_GS;
