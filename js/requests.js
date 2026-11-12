'use strict';

const requestsDatabaseName = 'pena-requests:' + new URL('.', location.href).pathname;
const washHours = { open: 8 * 60, close: 22 * 60, step: 30 };
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

function clockMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function availableStarts(day, duration, bookings, now = moscowNow(), finishBy = washHours.close) {
  const starts = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < now.day) return starts;
  if (!Number.isInteger(duration) || duration <= 0 || !Number.isInteger(finishBy)) return starts;
  const visits = bookings.filter(item => item.kind === 'booking' && item.day === day);
  const latestFinish = Math.min(washHours.close, finishBy);
  for (let start = washHours.open; start + duration <= latestFinish; start += washHours.step) {
    if (day === now.day && start <= now.minutes) continue;
    const overlaps = visits.some(item =>
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
    extras: program?.extras || [],
    departure: values.get('departure') || '',
    name: values.get('name').trim(), phone: values.get('phone'),
    email: (values.get('email') || '').trim(), comment: (values.get('comment') || '').trim()
  };
}

function validateBookingDetails(record) {
  const program = findWashProgram(record.programId);
  if (!program) throw new VisitConflict('Программа больше недоступна. Выберите её заново.');
  let quote;
  try {
    quote = quoteVisit(program, (record.extras || []).map(extra => extra.id));
  } catch (error) {
    throw new VisitConflict(error.message);
  }
  if (quote.price !== record.price || quote.minutes !== record.minutes) {
    throw new VisitConflict('Состав или стоимость визита изменились. Выберите услуги заново.');
  }
  const deadline = record.departure ? clockMinutes(record.departure) : washHours.close;
  if (!Number.isFinite(deadline)) throw new VisitConflict('Проверьте время выезда.');
  return deadline;
}

async function saveRequest(record) {
  const deadline = record.kind === 'booking' ? validateBookingDetails(record) : undefined;
  const db = await openRequestsDatabase();
  const transaction = db.transaction('requests', 'readwrite');
  const finished = transactionFinished(transaction);
  const store = transaction.objectStore('requests');
  let conflict;
  if (record.kind === 'booking') {
    // Проверка и запись выполняются под одной блокировкой, включая запросы из других вкладок.
    const sameDay = store.index('day').getAll(record.day);
    sameDay.onsuccess = () => {
      const starts = availableStarts(record.day, record.minutes, sameDay.result, moscowNow(), deadline);
      if (!starts.includes(clockLabel(record.start))) {
        conflict = new VisitConflict('Это время занято, уже прошло или не подходит к выезду. Выберите другое начало.');
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
