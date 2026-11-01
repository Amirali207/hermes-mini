export interface Env {
  DB: D1Database;
  AI: Ai;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ALLOWED_TELEGRAM_ID: string;
  AI_MODEL: string;
  REMINDER_HOUR: string;
}

interface Task {
  id: number;
  text: string;
  done: number;
  time: string | null;
}

interface FoundTask {
  day: string;
  text: string;
  done: number;
  time: string | null;
}

interface NewTask {
  text: string;
  time: string | null;
}

interface AiAction {
  action: 'add' | 'done' | 'undone' | 'list' | 'search' | 'settime' | 'del' | 'delall'| 'chat';
  text?: string;
  tasks?: NewTask[];
  numbers?: number[];
  time?: string | null;
  query?: string;
  reply?: string;
}

interface Pending {
  ids: number[];
  at: number;
}

type TimeAnswer = { kind: 'time'; time: string } | { kind: 'skip' };



const AI_PROMPT = `تو «هرمس‌مینی» هستی، دستیار کارهای روزانهٔ یک کاربر فارسی‌زبان. پیام کاربر را بخوان و تصمیم بگیر چه می‌خواهد.
فقط و فقط یک JSON معتبر برگردان. هیچ متن، توضیح، کد‌بلاک یا چیز دیگری قبل یا بعد از JSON ننویس.

انواع action:
1) add — کاربر یک یا چند کار جدید می‌گوید.
   {"action":"add","tasks":[{"text":"کار اول","time":"17:00"},{"text":"کار دوم","time":null}]}
   هر کار یک مورد جداست. متن هر کار کوتاه و تمیز باشد (کلمه‌های اضافه مثل «لطفاً» یا «باید» و خود ساعت از متن حذف شود).
   time فقط وقتی پر شود که کاربر صراحتاً ساعت گفته باشد، به شکل ۲۴ ساعتهٔ HH:MM (مثلاً «۵ عصر» = "17:00"، «۸ شب» = "20:00"). اگر ساعت نگفته، null بگذار. هرگز خودت ساعت نساز.
2) done — کاربر می‌گوید کاری (یا چند کار) را انجام داده است.
   {"action":"done","numbers":[1]}
   شمارهٔ درست را از «لیست کارهای امروز» بردار. اگر کار مورد نظر در لیست نیست: {"action":"done","numbers":[]}
3) undone — کاربر می‌خواهد تیک کاری را بردارد.
   {"action":"undone","numbers":[2]}
4) settime — کاربر ساعت یک کار موجود در لیست را تعیین یا عوض می‌کند.
   {"action":"settime","numbers":[2],"time":"18:30"}
8) del — کاربر می‌خواهد یک یا چند کار را از لیست امروز حذف کند.
   {"action":"del","numbers":[3]}
   شمارهٔ درست را از «لیست کارهای امروز» بردار. اگر شماره‌ای گفت که در لیست نیست، همان عدد را بنویس
9) delall — کاربر می‌خواهد همهٔ کارهای امروز را حذف کند.
   {"action":"delall"}
5) list — کاربر می‌خواهد لیست امروز را ببیند.
   {"action":"list"}
6) search — کاربر دنبال کاری در همهٔ روزها می‌گردد.
   {"action":"search","query":"یک کلمهٔ کوتاه"}
7) chat — سلام، تشکر، پرسش دربارهٔ کارها یا تاریخ و روز هفته، یا هر چیز دیگری.
   {"action":"chat","reply":"جواب کوتاه، محترمانه و فارسی"}
   برای پرسش دربارهٔ کارها از «لیست کارهای امروز» و برای تاریخ از «تاریخ امروز» جواب بده و چیزی از خودت اضافه نکن.


قوانین:
- جمله‌ای که کاری برای انجام دادن است (مثل «خرید نان» یا «برم دکتر») یعنی add.
- جمله‌ای که انجام شدن کاری را می‌گوید (مثل «تموم شد»، «انجام دادم»، «خریدم») یعنی done.
- سؤال، سلام و گپ یعنی chat.
- برای ادامهٔ گفتگو از پیام‌های قبلی همین مکالمه کمک بگیر.

مثال‌ها (فرض کن لیست امروز این است: 1. ⬜ خرید نان  2. ⬜ زنگ به مامان  3. ✅ مطالعه):
«نان رو خریدم» ← {"action":"done","numbers":[1]}
«هر دو رو انجام دادم» ← {"action":"done","numbers":[1,2]}
«زنگ مامان هنوز مونده» ← {"action":"undone","numbers":[2]}
«جلسه ساعت ۵ عصر» ← {"action":"add","tasks":[{"text":"جلسه","time":"17:00"}]}
«برم دکتر و داروخانه» ← {"action":"add","tasks":[{"text":"رفتن به دکتر","time":null},{"text":"رفتن به داروخانه","time":null}]}
«زنگ مامان رو بذار ساعت ۸ شب» ← {"action":"settime","numbers":[2],"time":"20:00"}
«امروز چی دارم؟» ← {"action":"list"}
«دنبال کار نان بگرد» ← {"action":"search","query":"نان"}
«چند تا کار مونده؟» ← {"action":"chat","reply":"۲ کار از ۳ کار هنوز مونده."}
«شماره ۳ رو حذف کن» ← {"action":"del","numbers":[3]}
«زنگ مامان رو پاک کن» ← {"action":"del","numbers":[2]}
«همه رو پاک کن» ← {"action":"delall"}
«/start» ← {"action":"chat","reply":"سلام! 👋 کارهات رو بگو، من یادداشت می‌کنم. مثلاً «خرید نان» یا «جلسه ساعت ۵ عصر»."}
«سلام» ← {"action":"chat","reply":"سلام! 👋 چه کاری اضافه کنم؟"}`;

const SEARCH_LIMIT = 20;
const HISTORY_TURNS = 6;
const HISTORY_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const HISTORY_KEEP = 20;
const MAX_ADD_AT_ONCE = 10;
const PENDING_KEY = 'pending_time';
const CONFIRM_KEY = 'pending_delete';
const DUP_KEY = 'pending_dup';
const DUP_TTL_MS = 5 * 60 * 1000;

interface PendingDup {
  items: NewTask[];
  at: number;
}
const CONFIRM_TTL_MS = 5 * 60 * 1000;
const PENDING_TTL_MS = 30 * 60 * 1000;

// ---------- تاریخ و ساعت ----------

function tehranDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function tehranHourMinute(now: Date = new Date()): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { h: get('hour'), m: get('minute') };
}

// مثلاً «یکشنبه ۳ آبان ۱۴۰۵»؛ اگر مشکلی بود همان تاریخ میلادی را برمی‌گرداند
function faDateLong(day: string): string {
  try {
    const d = new Date(`${day}T12:00:00Z`);
    const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'UTC',
      weekday: 'long',
    }).format(d);
    const date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return `${weekday} ${date}`;
  } catch {
    return day;
  }
}

function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

// «ي» و «ك» عربی را به «ی» و «ک» فارسی تبدیل می‌کند تا جستجو دقیق‌تر شود
function normalizeFa(s: string): string {
  return s.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// ساعت را از جملهٔ آزاد کاربر می‌فهمد: «۱۴:۳۰»، «ساعت ۵»، «۸ شب»، «۵ و نیم عصر»، «بی‌ساعت»
function parseTimeAnswer(raw: string): TimeAnswer | null {
  const s = toLatinDigits(raw).replace(/\u200c/g, ' ').trim();
  if (!s || s.length > 40) return null;

  if (/^(نه|نخیر|ندارد|ندارم|ندارن|بی ?ساعت|بدون ?ساعت|مهم نیست|فرقی (نداره|نمی ?کنه)|بیخیال|رد|-+)([\s.!،]|$)/.test(s)) {
    return { kind: 'skip' };
  }

  const hasColon = /\d{1,2}\s*[:٫.]\s*\d{2}/.test(s);
  const hasSaat = /ساعت/.test(s);
  const isMorning = /(صبح|بامداد|سحر)/.test(s);
  const isAfternoon = /(عصر|بعد ?از ?ظهر|غروب)/.test(s);
  const isNight = /شب/.test(s);
  const isNoon = /ظهر/.test(s) && !/بعد ?از ?ظهر/.test(s);
  const hasPeriod = isMorning || isAfternoon || isNight || isNoon;
  const bareNumber = /^\d{1,2}$/.test(s);
  if (!hasColon && !hasSaat && !hasPeriod && !bareNumber) return null;

  let h: number;
  let m = 0;
  const c = s.match(/(\d{1,2})\s*[:٫.]\s*(\d{2})/);
  if (c) {
    h = Number(c[1]);
    m = Number(c[2]);
  } else {
    const n = s.match(/(\d{1,2})/);
    if (!n) return null;
    h = Number(n[1]);
    if (/و ?نیم/.test(s)) m = 30;
    else if (/و ?ربع/.test(s)) m = 15;
  }
  if (h > 24 || m > 59) return null;
  if (h === 24) h = 0;

  if (h <= 12) {
    if (isMorning) {
      h = h === 12 ? 0 : h;
    } else if (isNoon) {
      h = h === 12 ? 12 : h <= 4 ? h + 12 : h;
    } else if (isAfternoon) {
      h = h < 12 ? h + 12 : 12;
    } else if (isNight) {
      h = h === 12 ? 0 : h <= 5 ? h : h + 12;
    } else if (h >= 1 && h <= 6) {
      h += 12; // بدون توضیح: «۵» یعنی ۱۷
    }
  }
  return { kind: 'time', time: `${pad2(h)}:${pad2(m)}` };
}

function normalizeTime(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = toLatinDigits(v).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return `${pad2(h)}:${pad2(mm)}`;
}

// ---------- تلگرام ----------

async function tg(env: Env, method: string, body: unknown): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function send(env: Env, chatId: number, text: string): Promise<void> {
  await tg(env, 'sendMessage', { chat_id: chatId, text });
}

// ---------- دیتابیس ----------

async function todayTasks(env: Env, day: string): Promise<Task[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, text, done, time FROM tasks WHERE day = ? ORDER BY (time IS NULL), time, id',
  )
    .bind(day)
    .all<Task>();
  return results ?? [];
}

function taskLine(t: Task, i: number): string {
  return `${i + 1}. ${t.done ? '✅' : '⬜'} ${t.time ? `⏰ ${t.time} — ` : ''}${t.text}`;
}

function emptyToday(extra: string): string {
  return `📅 ${faDateLong(tehranDay())}\n\n${extra}`;
}

function renderList(tasks: Task[]): string {
  const doneCount = tasks.filter((t) => t.done).length;
  return `📅 ${faDateLong(tehranDay())}\n${doneCount} از ${tasks.length} انجام شده\n\n${tasks.map(taskLine).join('\n')}`;
}

function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function searchTasks(env: Env, query: string): Promise<FoundTask[]> {
  const q = normalizeFa(query.trim());
  if (!q) return [];
  const { results } = await env.DB.prepare(
    "SELECT day, text, done, time FROM tasks WHERE REPLACE(REPLACE(text, 'ي', 'ی'), 'ك', 'ک') LIKE ? ESCAPE '\\' ORDER BY day DESC, id DESC LIMIT ?",
  )
    .bind(`%${likeEscape(q)}%`, SEARCH_LIMIT)
    .all<FoundTask>();
  return results ?? [];
}

function renderSearch(rows: FoundTask[], query: string): string {
  if (!rows.length) return `🔍 چیزی برای «${query}» پیدا نشد.`;
  const today = tehranDay();
  const lines = rows.map(
    (r) =>
      `${r.done ? '✅' : '⬜'} ${r.time ? `⏰ ${r.time} — ` : ''}${r.text}\n     📅 ${r.day === today ? 'امروز' : faDateLong(r.day)}`,
  );
  const more = rows.length >= SEARCH_LIMIT ? `\n\n(فقط ${SEARCH_LIMIT} نتیجهٔ آخر نشان داده شد. جستجو را دقیق‌تر کن.)` : '';
  return `🔍 نتیجهٔ جستجو برای «${query}» — ${rows.length} مورد\n\n${lines.join('\n\n')}${more}`;
}

function nowHHMM(): string {
  const { h, m } = tehranHourMinute();
  return `${pad2(h)}:${pad2(m)}`;
}

// اگر ساعتی که تعیین می‌شود همین الان یا گذشته باشد، دیگر یادآوری نمی‌فرستیم (reminded = 1)
function remindedFor(time: string | null): number {
  return time !== null && time <= nowHHMM() ? 1 : 0;
}

async function addTask(env: Env, text: string, time: string | null = null): Promise<number> {
  const r = await env.DB.prepare('INSERT INTO tasks (text, day, created_at, time, reminded) VALUES (?, ?, ?, ?, ?)')
    .bind(text, tehranDay(), Date.now(), time, remindedFor(time))
    .run();
  return Number(r.meta.last_row_id);
}

async function setDone(env: Env, id: number, done: boolean): Promise<void> {
  await env.DB.prepare('UPDATE tasks SET done = ?, done_at = ? WHERE id = ?')
    .bind(done ? 1 : 0, done ? Date.now() : null, id)
    .run();
}

async function setTime(env: Env, id: number, time: string | null): Promise<void> {
  await env.DB.prepare('UPDATE tasks SET time = ?, reminded = ? WHERE id = ?')
    .bind(time, remindedFor(time), id)
    .run();
}

function doneHeader(done: boolean): string {
  return done ? '✅ تیک خورد' : '↩️ تیک برداشته شد';
}

// ---------- حافظهٔ کوتاه: منتظر جواب «ساعتش چنده؟» ----------

async function getPending(env: Env): Promise<Pending | null> {
  try {
    const row = await env.DB.prepare('SELECT v FROM state WHERE k = ?').bind(PENDING_KEY).first<{ v: string }>();
    if (!row) return null;
    const p = JSON.parse(row.v) as Pending;
    if (!Array.isArray(p.ids) || !p.ids.length || Date.now() - p.at > PENDING_TTL_MS) {
      await clearPending(env);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

async function setPending(env: Env, ids: number[]): Promise<void> {
  const value = JSON.stringify({ ids, at: Date.now() } satisfies Pending);
  await env.DB.prepare('INSERT OR REPLACE INTO state (k, v) VALUES (?, ?)').bind(PENDING_KEY, value).run();
}

async function clearPending(env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM state WHERE k = ?').bind(PENDING_KEY).run();
}

async function getConfirmDelete(env: Env): Promise<Pending | null> {
  try {
    const row = await env.DB.prepare('SELECT v FROM state WHERE k = ?').bind(CONFIRM_KEY).first<{ v: string }>();
    if (!row) return null;
    const p = JSON.parse(row.v) as Pending;
    if (!Array.isArray(p.ids) || !p.ids.length || Date.now() - p.at > CONFIRM_TTL_MS) {
      await clearConfirmDelete(env);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

async function setConfirmDelete(env: Env, ids: number[]): Promise<void> {
  const value = JSON.stringify({ ids: ids.slice(0, 50), at: Date.now() } satisfies Pending);
  await env.DB.prepare('INSERT OR REPLACE INTO state (k, v) VALUES (?, ?)').bind(CONFIRM_KEY, value).run();
}

async function clearConfirmDelete(env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM state WHERE k = ?').bind(CONFIRM_KEY).run();
}

async function findDuplicate(env: Env, text: string, time: string | null): Promise<boolean> {
  const norm = normalizeFa(text.trim());
  const row = await env.DB.prepare(
    "SELECT id FROM tasks WHERE day = ? AND done = 0 AND REPLACE(REPLACE(text, 'ي', 'ی'), 'ك', 'ک') = ? AND ((time IS NULL AND ? IS NULL) OR time = ?) LIMIT 1",
  )
    .bind(tehranDay(), norm, time, time)
    .first<{ id: number }>();
  return !!row;
}

async function getDup(env: Env): Promise<PendingDup | null> {
  try {
    const row = await env.DB.prepare('SELECT v FROM state WHERE k = ?').bind(DUP_KEY).first<{ v: string }>();
    if (!row) return null;
    const p = JSON.parse(row.v) as PendingDup;
    if (!Array.isArray(p.items) || !p.items.length || Date.now() - p.at > DUP_TTL_MS) {
      await clearDup(env);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

async function setDup(env: Env, items: NewTask[]): Promise<void> {
  const value = JSON.stringify({ items: items.slice(0, MAX_ADD_AT_ONCE), at: Date.now() } satisfies PendingDup);
  await env.DB.prepare('INSERT OR REPLACE INTO state (k, v) VALUES (?, ?)').bind(DUP_KEY, value).run();
}

async function clearDup(env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM state WHERE k = ?').bind(DUP_KEY).run();
}

function parseYesNo(raw: string): 'yes' | 'no' | null {
  const s = raw.replace(/\u200c/g, ' ').trim();
  if (/^(بله|آره|اره|تایید|تأیید|حتما|حتماً|باشه|yes|y)([\s.!،]|$)/i.test(s)) return 'yes';
  if (/^(نه|نخیر|خیر|لغو|بیخیال|نکن|منصرف|no|n)([\s.!،]|$)/i.test(s)) return 'no';
  return null;
}

async function askConfirmDelete(env: Env, chatId: number, targets: Task[]): Promise<void> {
  await setConfirmDelete(env, targets.map((t) => t.id));
  const lines = targets.slice(0, 15).map((t) => `• ${t.text}`).join('\n');
  await send(env, chatId, `⚠️ ${targets.length} کار حذف بشه؟\n${lines}\n\nبنویس «بله» تا حذف بشه، یا «نه» برای لغو.`);
}

function timeQuestion(text: string): string {
  return `⏰ «${text}» ساعتش چنده؟\n(مثلاً 14:30 یا «۸ شب». اگه ساعت نداره بنویس «بی‌ساعت»)`;
}

async function askTimes(env: Env, chatId: number, created: { id: number; text: string }[], intro: string): Promise<void> {
  await setPending(env, created.map((c) => c.id));
  await send(env, chatId, `${intro}\n\n${timeQuestion(created[0].text)}`);
}

async function taskText(env: Env, id: number): Promise<string | null> {
  const row = await env.DB.prepare('SELECT text FROM tasks WHERE id = ?').bind(id).first<{ text: string }>();
  return row?.text ?? null;
}

const TIME_WORDS = new Set([
  'ساعت', 'صبح', 'بامداد', 'سحر', 'ظهر', 'بعد', 'از', 'عصر', 'غروب', 'شب', 'و', 'نیم', 'ربع',
  'بی', 'بدون', 'بیساعت', 'بدونساعت', 'ندارد', 'ندارم', 'ندارن', 'نه', 'نخیر', 'مهم', 'نیست',
  'فرقی', 'نداره', 'نمیکنه', 'بیخیال', 'رد', 'همه',
]);

function isTimeOnly(raw: string): boolean {
  const s = toLatinDigits(raw)
    .replace(/\u200c/g, '')
    .replace(/(\d)([^\d\s:٫.])/g, '$1 $2')
    .replace(/([^\d\s:٫.])(\d)/g, '$1 $2')
    .replace(/[!؟،.]+(?=\s|$)/g, ' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.length > 6) return false;
  return tokens.every((t) => /^\d{1,2}([:٫.]\d{2})?$/.test(t) || TIME_WORDS.has(t) || /^-+$/.test(t));
}

// true یعنی پیام جواب ساعت بود و مصرف شد؛ false یعنی باید عادی پردازش شود
async function answerPending(env: Env, chatId: number, pending: Pending, text: string): Promise<boolean> {
  if (!isTimeOnly(text)) {
  await clearPending(env);
  return false;
  }
  const ans = parseTimeAnswer(text);
  if (!ans) {
    await clearPending(env);
    return false;
  }
  const skipAll = ans.kind === 'skip' && /همه/.test(text);
  const [id, ...rest] = pending.ids;

  let line = '';
  const cur = await taskText(env, id);
  if (cur !== null) {
    if (ans.kind === 'time') {
      await setTime(env, id, ans.time);
      line = `⏰ ساعت ${ans.time} ثبت شد: ${cur}`;
    } else {
      line = `👌 بدون ساعت: ${cur}`;
    }
  }

  let nextId: number | null = null;
  let nextText: string | null = null;
  if (!skipAll) {
    for (const rid of rest) {
      const t = await taskText(env, rid);
      if (t !== null) {
        nextId = rid;
        nextText = t;
        break;
      }
    }
  }

  if (nextId === null || nextText === null) {
    await clearPending(env);
    await send(env, chatId, line || 'باشه 👌');
    return true;
  }
  const remaining = rest.slice(rest.indexOf(nextId));
  await setPending(env, remaining);
  await send(env, chatId, `${line}\n\n${timeQuestion(nextText)}`);
  return true;
}

// ---------- هوش مصنوعی ----------

// جواب مدل‌های مختلف شکل‌های مختلف دارد؛ اینجا متن را از هر شکلی بیرون می‌کشیم
function extractAiText(res: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = res as any;
  if (typeof res === 'string') return res;
  if (typeof r?.response === 'string') return r.response;
  if (r?.response && typeof r.response === 'object') return JSON.stringify(r.response);
  const c = r?.choices?.[0]?.message?.content;
  if (typeof c === 'string') return c;
  return '';
}

function cleanTasks(v: unknown): NewTask[] {
  if (!Array.isArray(v)) return [];
  const out: NewTask[] = [];
  for (const x of v) {
    let text = '';
    let time: string | null = null;
    if (typeof x === 'string') {
      text = x;
    } else if (x && typeof x === 'object') {
      const o = x as { text?: unknown; time?: unknown };
      if (typeof o.text === 'string') text = o.text;
      time = normalizeTime(o.time);
    }
    text = text.trim().slice(0, 200);
    if (!text) continue;
    out.push({ text, time });
    if (out.length >= MAX_ADD_AT_ONCE) break;
  }
  return out;
}

function cleanNumbers(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 1);
}

type ChatMsg = { role: 'user' | 'assistant'; content: string };

async function loadHistory(env: Env): Promise<ChatMsg[]> {
  try {
    const { results } = await env.DB.prepare(
      'SELECT role, content FROM messages WHERE created_at > ? ORDER BY id DESC LIMIT ?',
    )
      .bind(Date.now() - HISTORY_MAX_AGE_MS, HISTORY_TURNS)
      .all<ChatMsg>();
    return (results ?? [])
    .reverse()
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

async function saveTurn(env: Env, user: string, reply: string): Promise<void> {
  try {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO messages (role, content, created_at) VALUES (?, ?, ?)').bind('user', user.slice(0, 300), now),
      env.DB.prepare('INSERT INTO messages (role, content, created_at) VALUES (?, ?, ?)').bind('assistant', reply.slice(0, 300), now),
      env.DB.prepare(`DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT ${HISTORY_KEEP})`),
    ]);
  } catch (e) {
    console.error('save history failed', e);
  }
}

function mentions(text: string, n: number, t: Task): boolean {
  const s = normalizeFa(toLatinDigits(text));
  if (new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(s)) return true;
  return normalizeFa(t.text)
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .some((w) => s.includes(w));
}
// اگر مشکلی پیش بیاید null برمی‌گرداند (و پیام را به‌اشتباه «کار جدید» ثبت نمی‌کنیم)
async function aiParse(env: Env, text: string, tasks: Task[], history: ChatMsg[]): Promise<AiAction | null> {
  try {
    const list = tasks.length ? tasks.map(taskLine).join('\n') : '(خالی)';
    const system = `${AI_PROMPT}\n\nتاریخ امروز: ${faDateLong(tehranDay())}\nلیست کارهای امروز:\n${list}`;
    // مدل‌های Qwen3 به‌طور پیش‌فرض «فکر» می‌کنند؛ این علامت جلوی آن را می‌گیرد
    const noThink = /qwen3/i.test(env.AI_MODEL) ? ' /no_think' : '';
    const res = await env.AI.run(env.AI_MODEL, {
      messages: [
        { role: 'system', content: system }, ...history,
        { role: 'user', content: `${text}${noThink}` },
      ],
      max_tokens: 500,
      temperature: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const raw = extractAiText(res).replace(/<think>[\s\S]*?<\/think>/g, '');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = JSON.parse(match[0]) as any;
    if (!['add', 'done', 'undone', 'list', 'search', 'settime', 'del', 'delall', 'chat'].includes(p?.action)) return null;

    const act: AiAction = { action: p.action };
    if (typeof p.text === 'string') act.text = p.text;
    if (typeof p.query === 'string') act.query = p.query;
    if (typeof p.reply === 'string') act.reply = p.reply;
    act.tasks = cleanTasks(p.tasks ?? p.texts);
    act.numbers = cleanNumbers(p.numbers);
    act.time = normalizeTime(p.time);
    return act;
  } catch (e) {
    console.error('ai failed', e);
    return null;
  }
}

// ---------- پردازش پیام ----------

async function handleUpdate(env: Env, update: { message?: { chat: { id: number }; from?: { id: number }; text?: string } }): Promise<void> {
  const msg = update.message;
  const text = msg?.text;
  
  if (!text) return;
  const chatId: number = msg.chat.id;

  const allowed = (env.ALLOWED_TELEGRAM_ID ?? '').trim();
  const fromId = msg.from?.id ?? 0;
  if (!allowed) {
    await send(env, chatId, `این ربات شخصیه.\nuser ID تو: ${fromId}\nاین عدد رو به ادمین بده.`);
    return;
  }
  if (String(fromId) !== allowed) return;
  const confirm = await getConfirmDelete(env);
if (confirm) {
  const yn = parseYesNo(text);
  if (yn === 'yes') {
    await clearConfirmDelete(env);
    const ph = confirm.ids.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`SELECT id, text FROM tasks WHERE day = ? AND id IN (${ph})`)
      .bind(tehranDay(), ...confirm.ids)
      .all<{ id: number; text: string }>();
    const rows = results ?? [];
    if (!rows.length) {
      await send(env, chatId, 'چیزی برای حذف نمونده.');
      return;
    }
    await env.DB.prepare(`DELETE FROM tasks WHERE id IN (${rows.map(() => '?').join(',')})`)
      .bind(...rows.map((r) => r.id))
      .run();
    await send(env, chatId, `🗑 ${rows.length} کار حذف شد.`);
    return;
  }
  await clearConfirmDelete(env);
  if (yn === 'no') {
    await send(env, chatId, 'باشه، چیزی حذف نشد 👌');
    return;
  }
  // پیام نامربوط: درخواست حذف لغو می‌شود و پیام عادی پردازش می‌شود
}

const dup = await getDup(env);
if (dup) {
  await clearDup(env);
  const yn = parseYesNo(text);
  if (yn === 'yes') {
    const needTime: { id: number; text: string }[] = [];
    const lines: string[] = [];
    for (const it of dup.items) {
      const id = await addTask(env, it.text, it.time);
      lines.push(`• ${it.time ? `⏰ ${it.time} — ` : ''}${it.text}`);
      if (!it.time) needTime.push({ id, text: it.text });
    } 
    const intro = `✚ دوباره اضافه شد:\n${lines.join('\n')}`;
    if (needTime.length) await askTimes(env, chatId, needTime, intro);
    else await send(env, chatId, intro);
    return;
  }
  if (yn === 'no') {
    await send(env, chatId, 'باشه، اضافه نشد. کار اول سر جاشه 👌');
    return;
  }
  // پیام نامربوط: سؤال لغو می‌شود و پیام عادی پردازش می‌شود
}
  // اگر منتظر جواب «ساعتش چنده؟» هستیم
  const pending = await getPending(env);
  if (pending && (await answerPending(env, chatId, pending, text))) return;

  

  // ---- متن آزاد: هوش مصنوعی تصمیم می‌گیرد ----
  const tasks = await todayTasks(env, tehranDay());
  const history = await loadHistory(env);
  const act = await aiParse(env, text, tasks, history);
  if (!act) {
    await send(env, chatId, 'الان نتونستم پیامت رو بفهمم 😅\nیه جور دیگه بگو، مثلاً «خرید نان».');
    return;
  }

  switch (act.action) {
    case 'add': {
      let items = act.tasks ?? [];
      if (!items.length && act.text?.trim()) items = [{ text: act.text.trim(), time: null }];
      if (!items.length) {
        await send(env, chatId, 'نفهمیدم چه کاری اضافه کنم. مثلاً بگو «خرید نان».');
        break;
      }
      const needTime: { id: number; text: string }[] = [];
      const lines: string[] = [];
      const dups: NewTask[] = [];
      const seen = new Set<string>();
      for (const it of items) {
        const key = `${normalizeFa(it.text.trim())}|${it.time ?? ''}`;
        if (seen.has(key) || (await findDuplicate(env, it.text, it.time))) {
          dups.push(it);
          seen.add(key);
          continue;
        }
        seen.add(key);
        const id = await addTask(env, it.text, it.time);
        lines.push(`• ${it.time ? `⏰ ${it.time} — ` : ''}${it.text}`);
        if (!it.time) needTime.push({ id, text: it.text });
      }
      const added = lines.length ? `✚ اضافه شد:\n${lines.join('\n')}\n\n` : '';
      if (dups.length) {
        await setDup(env, dups);
        const dupLines = dups.map((d) => `• ${d.time ? `⏰ ${d.time} — ` : ''}${d.text}`).join('\n');
        const timeNote = needTime.length ? 'ساعت کارهای جدید رو بعداً بگو، مثلاً «ساعت کار ۲ رو بذار ۸ شب».\n\n' : '';
        await send(env, chatId, `${added}${timeNote}⚠️ این کار از قبل توی لیست امروز هست:\n${dupLines}\n\nباز هم اضافه بشه؟ «بله» یا «نه»`);
        break;
      }
      const intro = `✚ اضافه شد:\n${lines.join('\n')}`;
      if (needTime.length) await askTimes(env, chatId, needTime, intro);
      else await send(env, chatId, intro);
      break;
    }
    case 'done':
    case 'undone': {
      const done = act.action === 'done';
      const targets: Task[] = [];
      for (const n of act.numbers ?? []) {
        const t = tasks[n - 1];
        if (t && !targets.some((x) => x.id === t.id)) targets.push(t);
      }
      // اگر مدل شماره نداد ولی کلمه‌ای داد، با جستجوی متن امتحان می‌کنیم
      const q = (act.query ?? '').trim();
      if (!targets.length && q) {
        const row = await env.DB.prepare(
          "SELECT id, text, done, time FROM tasks WHERE day = ? AND text LIKE ? ESCAPE '\\' ORDER BY id LIMIT 1",
        )
          .bind(tehranDay(), `%${likeEscape(q)}%`)
          .first<Task>();
        if (row) targets.push(row);
      }
      if (!targets.length) {
        await send(env, chatId, 'کاری که می‌گی رو پیدا نکردم. بگو «چیه کارام» تا لیست رو ببینی');
        break;
      }

      const open = tasks.filter((t) => Boolean(t.done) !== done);
      const onlyOne = open.length === 1 && targets.length === 1 && targets[0].id === open[0].id;
      const grounded = targets.length !== 1 || onlyOne || mentions(text, tasks.findIndex((x) => x.id === targets[0].id) + 1, targets[0]);
      if (!grounded) {
      await send(env, chatId, `کدوم کار رو؟ شمارهٔ کار یا اسمش رو بگو:\n${renderList(tasks)}`);
      break;
      }

      const pendingTasks = targets.filter((t) => Boolean(t.done) !== done);
      if (!pendingTasks.length) {
        await send(env, chatId, `ℹ️ از قبل ${done ? 'تیک خورده' : 'بدون تیک'} بود:\n${targets.map((t) => `• ${t.text}`).join('\n')}`);
        break;
      }
      for (const t of pendingTasks) await setDone(env, t.id, done);
      await send(env, chatId, `${doneHeader(done)}:\n${pendingTasks.map((t) => `• ${t.text}`).join('\n')}`);
      break;
    }
    case 'settime': {
      const targets: Task[] = [];
      for (const n of act.numbers ?? []) {
        const t = tasks[n - 1];
        if (t && !targets.some((x) => x.id === t.id)) targets.push(t);
      }
      if (!act.time || !targets.length) {
        await send(env, chatId, 'نفهمیدم ساعتِ کدام کار را عوض کنم 🤔\n دنبال چی بگردم؟ مثلاً: «دنبال کار دکتر بگرد»');
        break;
      }
      for (const t of targets) await setTime(env, t.id, act.time);
      await send(env, chatId, `⏰ ساعت ${act.time} ثبت شد:\n${targets.map((t) => `• ${t.text}`).join('\n')}`);
      break;
    }
    case 'list': {
      await send(env, chatId, tasks.length ? renderList(tasks) : emptyToday('امروز کاری ثبت نشده.'));
      break;
    }
    case 'search': {
      const q = (act.query ?? '').trim();
      if (!q) {
        await send(env, chatId, 'دنبال چی بگردم؟ مثلاً: /search دکتر');
        break;
      }
      const rows = await searchTasks(env, q);
      await send(env, chatId, renderSearch(rows, q));
      break;
    }
    case 'del': {
      const nums = [...new Set(act.numbers ?? [])].slice(0, 10);
      if (!tasks.length) {
      await send(env, chatId, 'امروز کاری ندارم که حذف کنم.');
      break;
      }
      if (!nums.length) {
      await send(env, chatId, 'کدوم کار رو حذف کنم؟ شمارهٔ کار رو بگو، مثلاً «شماره ۲ رو حذف کن».');
      break;
      }
      const bad = nums.filter((n) => n > tasks.length);
      if (bad.length) {
      await send(env, chatId, `شمارهٔ ${bad.join('، ')} توی لیست نیست (۱ تا ${tasks.length}). چیزی حذف نشد.`);
      break;
      }
      
      const targets = nums.map((n) => tasks[n - 1]);
      if (targets.length > 1 || !mentions(text, nums[0], targets[0])) {
      await askConfirmDelete(env, chatId, targets);
      break;
      }
      await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(targets[0].id).run();
      await send(env, chatId, `🗑 حذف شد:\n• ${targets[0].text}`);
      break;
    }
    case 'delall': {
      if (!tasks.length) {
      await send(env, chatId, 'امروز کاری ندارم که حذف کنم.');
      break;
      }
      await askConfirmDelete(env, chatId, tasks);
      break;
    }
    case 'chat':{
      const reply = act.reply?.trim() || 'نشد! 🤷';
      await send(env, chatId, reply);
      await saveTurn(env, text, reply);
      break;
    }

  }
}

// پیام صبحگاهی: در ساعت REMINDER_HOUR فقط یک بار در روز
async function morningBrief(env: Env): Promise<void> {
  const { h } = tehranHourMinute();
  if (h !== Number(env.REMINDER_HOUR || '8')) return;
  const day = tehranDay();
  const sent = await env.DB.prepare('SELECT v FROM state WHERE k = ?').bind('morning_sent').first<{ v: string }>();
  if (sent?.v === day) return;
  await env.DB.prepare('INSERT OR REPLACE INTO state (k, v) VALUES (?, ?)').bind('morning_sent', day).run();

  const tasks = await todayTasks(env, day);
  const text = tasks.length
    ? `☀️ صبح بخیر!\n${renderList(tasks)}`
    : `☀️ صبح بخیر!\n📅 ${faDateLong(day)}\n\nامروز هنوز کاری ثبت نشده.`;
  await send(env, Number(env.ALLOWED_TELEGRAM_ID), text);
}

// یادآوری سر وقتِ هر کار ساعت‌دار که هنوز تیک نخورده؛ هر کار فقط یک بار
async function taskReminders(env: Env): Promise<void> {
  const day = tehranDay();
  const { results } = await env.DB.prepare(
    'SELECT id, text, time FROM tasks WHERE day = ? AND done = 0 AND reminded = 0 AND time IS NOT NULL AND time <= ? ORDER BY time, id',
  )
    .bind(day, nowHHMM())
    .all<{ id: number; text: string; time: string }>();
  const due = results ?? [];
  if (!due.length) return;

  // اول علامت می‌زنیم تا اگر ارسال به مشکل خورد، هر دقیقه تکرار نشود
  for (const t of due) {
    await env.DB.prepare('UPDATE tasks SET reminded = 1 WHERE id = ?').bind(t.id).run();
  }
  const all = await todayTasks(env, day);
  const chatId = Number(env.ALLOWED_TELEGRAM_ID);
  for (const t of due) {
    const idx = all.findIndex((x) => x.id === t.id);
    const tip = idx >= 0 ? `\nتیک زدن: بگو «کار ${idx + 1} انجام شد»` : '';
    await send(env, chatId, `⏰ وقتشه! (${t.time})\n${t.text}${tip}`);
  }
}

async function claimUpdate(env: Env, id: unknown): Promise<boolean> {
  if (typeof id !== 'number') return true;
  try {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO state (k, v) VALUES (?, ?)')
      .bind(`upd:${id}`, String(Date.now()))
      .run();
    if (r.meta.changes === 0) return false;
    await env.DB.prepare("DELETE FROM state WHERE k LIKE 'upd:%' AND CAST(v AS INTEGER) < ?")
      .bind(Date.now() - 24 * 60 * 60 * 1000)
      .run();
    return true;
  } catch (e) {
    console.error('claim failed', e);
    return true;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/' && req.method === 'GET') {
      return new Response('hermes-mini is up\n');
    }
    if (url.pathname !== '/webhook' || req.method !== 'POST') {
      return new Response('not found\n', { status: 404 });
    }
    if (req.headers.get('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('forbidden\n', { status: 403 });
    }
    try {
      const update = (await req.json()) as {
        update_id?: number;
        message?: { chat: { id: number }; from?: { id: number }; text?: string };
      };
      if (!(await claimUpdate(env, update.update_id))) {
        console.log('duplicate update ignored', update.update_id);
        return new Response('ok\n');
      }
      await handleUpdate(env, update);
    } catch (e) {
      console.error('update failed', e);
    }
    return new Response('ok\n');
  },

  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      await morningBrief(env);
    } catch (e) {
      console.error('morning brief failed', e);
    }
    try {
      await taskReminders(env);
    } catch (e) {
      console.error('task reminders failed', e);
    }
  },
};
