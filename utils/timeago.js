import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Devuelve una string relativa de tiempo (ej: "2 minutes ago", "just now").
 * Reemplaza react-native-timeago (abandonado) + moment.
 * @param {number|null} seconds  - Timestamp en segundos (de Firestore)
 * @returns {string}
 */
export const timeAgo = (seconds) => {
  if (seconds == null) return ''; // explicit null/undefined check — 0 is a valid timestamp
  return dayjs.unix(seconds).fromNow();
};
