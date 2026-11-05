'use strict';

const requestsDatabaseName = 'pena-requests:' + new URL('.', location.href).pathname;
const moscowClock = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
let databasePromise;

class VisitConflict extends Error {}

function moscowNow() {
  const parts = {};
  for (const part of moscowClock.formatToParts(new Date())) parts[part.type] = part.value;
  return {
    day: parts.year + '-' + parts.month + '-' + parts.day,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function openRequestsDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(requestsDatabaseName, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('requests', { keyPath: 'id' });
      store.createIndex('day', 'day');
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Закройте старые вкладки сайта и повторите.'));
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      resolve(db);
    };
  }).catch(error => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

function transactionFinished(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error('Операция хранения прервана.'));
  });
}

async function readRequests(day) {
  const db = await openRequestsDatabase();
  const transaction = db.transaction('requests');
  const store = transaction.objectStore('requests');
  const read = day ? store.index('day').getAll(day) : store.getAll();
  await transactionFinished(transaction);
  return read.result;
}

function clockLabel(minutes) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  return hh + ':' + String(minutes % 60).padStart(2, '0');
}

function availableStarts(day, duration, bookings, now = moscowNow()) {
  const starts = [];
  if (!day || day < now.day) return starts;
  for (let start = 8 * 60; start + duration <= 22 * 60; start += 30) {
    if (day === now.day && start <= now.minutes) continue;
    const overlaps = bookings.some(item =>
      start < item.start + item.minutes && item.start < start + duration
    );
    if (!overlaps) starts.push(clockLabel(start));
  }
  return starts;
}

function createRequest(kind, form, program) {
  const values = new FormData(form);
  const key = Array.from(crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, '0')).join('');
  return {
    id: key, kind, createdAt: new Date().toISOString(),
    programId: program?.id || '', programName: program?.name || '',
    price: program?.price ?? null, minutes: program?.minutes ?? null,
    name: values.get('name').trim(), phone: values.get('phone'),
    email: (values.get('email') || '').trim(), comment: (values.get('comment') || '').trim()
  };
}

async function saveRequest(record) {
  const db = await openRequestsDatabase();
  const transaction = db.transaction('requests', 'readwrite');
  const finished = transactionFinished(transaction);
  const store = transaction.objectStore('requests');
  let conflict;
  if (record.kind === 'booking') {
    // Проверка и запись выполняются под одной блокировкой, включая запросы из других вкладок.
    const sameDay = store.index('day').getAll(record.day);
    sameDay.onsuccess = () => {
      const starts = availableStarts(record.day, record.minutes, sameDay.result);
      if (!starts.includes(clockLabel(record.start))) {
        conflict = new VisitConflict('Это время уже занято в вашем расписании или прошло. Выберите другое.');
        transaction.abort();
        return;
      }
      store.add(record);
    };
  } else {
    store.add(record);
  }
  try {
    await finished;
  } catch (error) {
    throw conflict || error;
  }
  return record;
}

async function deleteRequest(id) {
  const db = await openRequestsDatabase();
  const transaction = db.transaction('requests', 'readwrite');
  const finished = transactionFinished(transaction);
  transaction.objectStore('requests').delete(id);
  await finished;
}
