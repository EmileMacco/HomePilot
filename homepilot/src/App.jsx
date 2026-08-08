import { useState, useEffect, useCallback, useRef } from "react";
import { ShoppingCart, CreditCard, Plus, X, Check, Store, User, Loader2, Trash2, Calendar, Home, ListChecks } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const HOUSEHOLD_ID = "homepilot";
const HOUSEHOLD_EMAIL = "household@homepilot.app";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchHousehold() {
  const { data, error } = await supabase
    .from("household")
    .select("data,updated_at")
    .eq("id", HOUSEHOLD_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function pushHousehold(nextData) {
  const updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("household")
    .update({ data: nextData, updated_at })
    .eq("id", HOUSEHOLD_ID)
    .select("data,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

const OWNER_COLORS = {
  Emile: { bg: "#2B7A4B", text: "#FFFFFF" },
  Emily: { bg: "#6B4E9C", text: "#FFFFFF" },
  Samen: { bg: "#C8272A", text: "#FFFFFF" },
};

const STORE_COLORS = {
  "Albert Heijn": { bg: "#00539B", text: "#FFFFFF" },
  "Amazing Oriental": { bg: "#2B7A4B", text: "#FFFFFF" },
  Makro: { bg: "#FFCB05", text: "#0F2A4A" },
};
const DEFAULT_STORES = ["Albert Heijn", "Amazing Oriental", "Makro"];
const CARD_COLORS = ["#00539B", "#C8272A", "#FFCB05", "#2B7A4B", "#6B4E9C", "#0F2A4A"];

const STORE_COLOR_PALETTE = [
  { bg: "#00539B", text: "#FFFFFF" },
  { bg: "#C8272A", text: "#FFFFFF" },
  { bg: "#FFCB05", text: "#0F2A4A" },
  { bg: "#2B7A4B", text: "#FFFFFF" },
  { bg: "#6B4E9C", text: "#FFFFFF" },
  { bg: "#E08A2C", text: "#FFFFFF" },
  { bg: "#2E86DE", text: "#FFFFFF" },
  { bg: "#0F2A4A", text: "#FFFFFF" },
];

function colorFor(store, customColors) {
  return STORE_COLORS[store] || (customColors && customColors[store]) || { bg: "#0F2A4A", text: "#FFFFFF" };
}

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function encodeCode128B(text) {
  const START_B = 104;
  const values = [START_B];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    values.push(code >= 32 && code <= 126 ? code - 32 : 0);
  }
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  checksum %= 103;
  values.push(checksum);
  values.push(106);
  return values;
}

function Barcode128({ value, height = 42 }) {
  const text = String(value || "").trim();
  if (!text) return null;
  const widthDigits = encodeCode128B(text)
    .map((v) => CODE128_PATTERNS[v])
    .join("")
    .split("")
    .map(Number);
  let x = 0;
  let isBar = true;
  const bars = [];
  widthDigits.forEach((w) => {
    if (isBar) bars.push({ x, w });
    x += w;
    isBar = !isBar;
  });
  return (
    <svg viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={40} fill="#0F2A4A" />
      ))}
    </svg>
  );
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / 86400000);
  if (diffDays === 0) return "Vandaag";
  if (diffDays === 1) return "Morgen";
  const weekdays = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const WEEKDAYS_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MONTHS_FULL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}
function toISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromISO(s) {
  return new Date(s + "T00:00:00");
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthGrid(d) {
  const gridStart = startOfWeek(startOfMonth(d));
  const weeks = [];
  let cur = gridStart;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(cur);
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const BIRTHDAY_COLOR = { bg: "#D9A02A", text: "#FFFFFF" };
const HOLIDAY_COLOR = { bg: "#5AA9E6", text: "#FFFFFF" };

function colorForEvent(e) {
  if (e.isBirthday) return BIRTHDAY_COLOR;
  if (e.isHoliday) return HOLIDAY_COLOR;
  return OWNER_COLORS[e.owner] || OWNER_COLORS.Samen;
}

function birthdayEventsFor(iso, birthdays) {
  const d = fromISO(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return (birthdays || [])
    .filter((b) => b.day === day && b.month === month)
    .map((b) => ({
      id: `bday-${b.id}-${iso}`,
      birthdayId: b.id,
      title: b.year ? `${b.name} wordt ${d.getFullYear() - b.year}` : b.name,
      date: iso,
      allDay: true,
      owner: "Samen",
      isBirthday: true,
    }));
}

const REPEAT_LABELS = {
  week: "Wekelijks",
  "2week": "Elke 2 weken",
  "4week": "Elke 4 weken",
  month: "Maandelijks",
};

const STATUS_ORDER = ["te_doen", "bezig", "wacht", "klaar"];
const STATUS_META = {
  te_doen: { label: "Te doen", color: "#A6AEB8" },
  bezig: { label: "Bezig", color: "#2E86DE" },
  wacht: { label: "Wacht op iemand", color: "#E08A2C" },
  klaar: { label: "Klaar", color: "#2B7A4B" },
};

function getTodoStatus(t) {
  return t.status || (t.done ? "klaar" : "te_doen");
}

function isItemActive(it, todayIso) {
  return !it.validFrom || it.validFrom <= todayIso;
}

function daysUntil(dateIso, todayIso) {
  return Math.round((fromISO(dateIso) - fromISO(todayIso)) / 86400000);
}

function recurringInstancesFor(iso, events) {
  const d = fromISO(iso);
  const result = [];
  (events || []).forEach((e) => {
    if (!e.repeat || e.repeat === "none" || e.date === iso) return;
    if ((e.excludedDates || []).includes(iso)) return;
    const anchor = fromISO(e.date);
    const diffDays = Math.round((d - anchor) / 86400000);
    if (diffDays < 0) return;
    let matches = false;
    if (e.repeat === "week") matches = diffDays % 7 === 0;
    else if (e.repeat === "2week") matches = diffDays % 14 === 0;
    else if (e.repeat === "4week") matches = diffDays % 28 === 0;
    else if (e.repeat === "month") matches = d.getDate() === anchor.getDate();
    if (matches) {
      result.push({ ...e, id: `${e.id}-${iso}`, date: iso, originalId: e.id, isRecurringInstance: true });
    }
  });
  return result;
}

function spanInstancesFor(iso, events) {
  const result = [];
  (events || []).forEach((e) => {
    if (!e.endDate || e.endDate === e.date || e.endDate < e.date) return;
    if (iso <= e.date || iso > e.endDate) return;
    result.push({ ...e, id: `${e.id}-span-${iso}`, date: iso, originalId: e.id, isSpanInstance: true });
  });
  return result;
}

function unfoldICS(text) {
  // Regels die beginnen met een spatie/tab horen bij de vorige regel (ICS line folding)
  return text.replace(/\r\n/g, "\n").split("\n").reduce((lines, line) => {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
    return lines;
  }, []);
}

function unescapeICSText(s) {
  return (s || "")
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseICSDate(rawKey, rawValue) {
  const isDateOnly = rawKey.includes("VALUE=DATE") || (/^\d{8}$/.test(rawValue));
  const digits = rawValue.replace(/[TZ]/g, (m) => (m === "T" ? "T" : ""));
  const y = rawValue.slice(0, 4);
  const mo = rawValue.slice(4, 6);
  const d = rawValue.slice(6, 8);
  const date = `${y}-${mo}-${d}`;
  if (isDateOnly || rawValue.length <= 8) return { date, time: "", allDay: true };
  const hh = rawValue.slice(9, 11) || "00";
  const mm = rawValue.slice(11, 13) || "00";
  return { date, time: `${hh}:${mm}`, allDay: false };
}

function mapRRuleToRepeat(rrule) {
  if (!rrule) return "none";
  const freqMatch = rrule.match(/FREQ=([A-Z]+)/);
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  const freq = freqMatch ? freqMatch[1] : "";
  const interval = intervalMatch ? Number(intervalMatch[1]) : 1;
  if (freq === "WEEKLY") {
    if (interval === 1) return "week";
    if (interval === 2) return "2week";
    if (interval === 4) return "4week";
  }
  if (freq === "MONTHLY" && interval === 1) return "month";
  return "none";
}

function looksLikeBirthday(title, rrule) {
  const isYearly = /FREQ=YEARLY/.test(rrule || "");
  const titleMatch = /verjaardag|birthday/i.test(title || "");
  return isYearly || titleMatch;
}

function extractBirthdayName(title) {
  let t = (title || "").trim();
  t = t.replace(/[’']s\s+birthday$/i, "");
  t = t.replace(/^verjaardag\s+van\s+/i, "");
  t = t.replace(/\s*verjaardag$/i, "");
  t = t.replace(/\s*\(\d+(st|nd|rd|th)?\)\s*$/i, "");
  t = t.trim();
  return t || title;
}

function parseVCardBday(raw) {
  let s = (raw || "").trim().split(";")[0];
  let noYear = false;
  if (s.startsWith("--")) {
    noYear = true;
    s = s.slice(2);
  }
  s = s.replace(/-/g, "");
  if (noYear) {
    if (s.length < 4) return null;
    return { year: null, month: Number(s.slice(0, 2)), day: Number(s.slice(2, 4)) };
  }
  if (s.length < 8) return null;
  return { year: Number(s.slice(0, 4)), month: Number(s.slice(4, 6)), day: Number(s.slice(6, 8)) };
}

function parseVCard(text) {
  const lines = unfoldICS(text);
  const results = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VCARD")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VCARD")) {
      if (current && current.name && current.bday) {
        const y = current.bday.year;
        const dateY = y && y >= 1900 && y <= new Date().getFullYear() ? y : 1604;
        const date = `${dateY}-${pad2(current.bday.month)}-${pad2(current.bday.day)}`;
        results.push({
          title: current.name,
          date,
          time: "",
          endTime: "",
          allDay: true,
          notes: "",
          repeat: "none",
          isBirthdayLike: true,
          noYearKnown: !y,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const sepIndex = line.indexOf(":");
    if (sepIndex === -1) continue;
    const rawKey = line.slice(0, sepIndex);
    const rawValue = line.slice(sepIndex + 1);
    const key = rawKey.split(";")[0];
    if (key === "FN") current.name = unescapeICSText(rawValue);
    else if (key === "N" && !current.name) current.name = unescapeICSText(rawValue.split(";").filter(Boolean).reverse().join(" "));
    else if (key === "BDAY") current.bday = parseVCardBday(rawValue);
  }
  return results.filter((e) => e.date);
}

function parseICS(text) {
  const lines = unfoldICS(text);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (current && current.title) {
        events.push({
          title: current.title,
          date: current.date || "",
          time: current.allDay ? "" : current.time || "",
          endTime: current.allDay ? "" : current.endTime || "",
          allDay: !!current.allDay,
          notes: current.notes || "",
          repeat: mapRRuleToRepeat(current.rrule),
          isBirthdayLike: looksLikeBirthday(current.title, current.rrule),
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const sepIndex = line.indexOf(":");
    if (sepIndex === -1) continue;
    const rawKey = line.slice(0, sepIndex);
    const rawValue = line.slice(sepIndex + 1);
    const key = rawKey.split(";")[0];
    if (key === "SUMMARY") current.title = unescapeICSText(rawValue);
    else if (key === "DESCRIPTION") current.notes = unescapeICSText(rawValue);
    else if (key === "DTSTART") {
      const parsed = parseICSDate(rawKey, rawValue);
      current.date = parsed.date;
      current.time = parsed.time;
      current.allDay = parsed.allDay;
    } else if (key === "DTEND") {
      const parsed = parseICSDate(rawKey, rawValue);
      current.endTime = parsed.time;
    } else if (key === "RRULE") {
      current.rrule = rawValue;
    }
  }
  return events.filter((e) => e.date);
}

function EventRow({ e, onRemove, onEdit, onEditBirthday, onRequestRemove }) {
  const c = colorForEvent(e);
  return (
    <div
      onClick={() => (e.isBirthday ? onEditBirthday && onEditBirthday(e.birthdayId) : onEdit(e))}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: e.isBirthday ? "#FFF9EC" : "#fff",
        borderRadius: 12,
        padding: "12px 12px",
        border: "1px solid #EDEFF2",
        borderLeft: `4px solid ${c.bg}`,
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: "#1E2A38", fontWeight: 500 }}>{e.title}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", marginTop: 2 }}>
          {e.isBirthday ? "Verjaardag · " : e.isHoliday ? "Feestdag · " : e.allDay ? "Hele dag · " : e.time ? `${e.time}${e.endTime ? `–${e.endTime}` : ""} · ` : ""}
          {e.endDate && e.endDate !== e.date ? `t/m ${dayLabel(e.endDate)} · ` : ""}
          {e.owner}
          {e.repeat && e.repeat !== "none" ? ` · ${REPEAT_LABELS[e.repeat]}` : ""}
        </div>
        {e.notes && (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: "#B0B8C1",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {e.notes}
          </div>
        )}
      </div>
      {!e.isBirthday && (
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            if (e.isRecurringInstance || e.isSpanInstance) {
              onEdit(e);
            } else if (onRequestRemove) {
              onRequestRemove(e);
            } else {
              onRemove(e.id);
            }
          }}
          style={{ background: "none", border: "none", color: "#C7CFD8", cursor: "pointer", padding: 4, flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => pad2(i * 5));

const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function DateSelect({ value, onChange }) {
  const [y, m, d] = (value || "").split("-");
  const nowY = new Date().getFullYear();
  const YEARS = Array.from({ length: 5 }, (_, i) => String(nowY - 1 + i));
  const selectStyle = {
    fontFamily: FONT_BODY,
    fontSize: 13,
    padding: "10px 4px",
    borderRadius: 10,
    border: "1px solid #D8DEE6",
    outline: "none",
    background: "#fff",
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
  };
  const set = (part, val) => {
    const yy = part === "y" ? val : y || String(nowY);
    const mm = part === "m" ? val : m || "";
    const dd = part === "d" ? val : d || "";
    if (!mm || !dd) {
      onChange(`${yy}-${part === "m" ? val : mm || "01"}-${part === "d" ? val : dd || "01"}`);
    } else {
      onChange(`${yy}-${mm}-${dd}`);
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <select value={d || ""} onChange={(e) => set("d", e.target.value)} style={{ ...selectStyle, flex: 0.8 }}>
        <option value="" disabled>
          dag
        </option>
        {Array.from({ length: 31 }, (_, i) => pad2(i + 1)).map((dd) => (
          <option key={dd} value={dd}>
            {dd}
          </option>
        ))}
      </select>
      <select value={m || ""} onChange={(e) => set("m", e.target.value)} style={{ ...selectStyle, flex: 1.3 }}>
        <option value="" disabled>
          maand
        </option>
        {MONTHS_SHORT.map((mm, i) => (
          <option key={mm} value={pad2(i + 1)}>
            {mm}
          </option>
        ))}
      </select>
      <select value={y || ""} onChange={(e) => set("y", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
        <option value="" disabled>
          jaar
        </option>
        {YEARS.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
      {value && (
        <button
          onClick={() => onChange("")}
          style={{ background: "none", border: "none", color: "#C7CFD8", cursor: "pointer", padding: 2, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function TimeSelect({ value, onChange, placeholder }) {
  const [h, m] = (value || "").split(":");
  const selectStyle = {
    fontFamily: FONT_BODY,
    fontSize: 14,
    padding: "10px 6px",
    borderRadius: 10,
    border: "1px solid #D8DEE6",
    outline: "none",
    background: "#fff",
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <select value={h || ""} onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)} style={selectStyle}>
        <option value="" disabled>
          uu
        </option>
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span style={{ color: "#8A96A3", fontFamily: FONT_BODY }}>:</span>
      <select value={m || ""} onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)} style={selectStyle}>
        <option value="" disabled>
          mm
        </option>
        {MINUTES_5.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      {value && (
        <button
          onClick={() => onChange("")}
          style={{ background: "none", border: "none", color: "#C7CFD8", cursor: "pointer", padding: 2, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function QtyStepper({ qty, onChange, size = "sm" }) {
  const dim = size === "sm" ? 22 : 30;
  const fontSize = size === "sm" ? 13 : 15;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          onChange(-1);
        }}
        disabled={qty <= 1}
        style={{
          width: dim,
          height: dim,
          borderRadius: 6,
          border: "1px solid #D8DEE6",
          background: "#fff",
          color: qty <= 1 ? "#D8DEE6" : "#5C6B7A",
          fontFamily: FONT_BODY,
          fontWeight: 700,
          cursor: qty <= 1 ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        −
      </button>
      <span style={{ fontFamily: FONT_BODY, fontSize, fontWeight: 700, color: "#1E2A38", minWidth: 14, textAlign: "center" }}>
        {qty}×
      </span>
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          onChange(1);
        }}
        style={{
          width: dim,
          height: dim,
          borderRadius: 6,
          border: "1px solid #D8DEE6",
          background: "#fff",
          color: "#5C6B7A",
          fontFamily: FONT_BODY,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        +
      </button>
    </div>
  );
}

function AllDayChip({ e, onEdit, onEditBirthday }) {
  const c = colorForEvent(e);
  return (
    <div
      onClick={() => (e.isBirthday ? onEditBirthday && onEditBirthday(e.birthdayId) : onEdit(e))}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: c.bg,
        color: "#fff",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12,
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {e.title}
      </span>
      {e.endDate && e.endDate !== e.date && (
        <span style={{ fontFamily: FONT_BODY, fontSize: 11, opacity: 0.85, flexShrink: 0 }}>
          t/m {dayLabel(e.endDate)}
        </span>
      )}
    </div>
  );
}

function DayList({ dateISO, items, onRemove, onEdit, onEditBirthday, onRequestRemove }) {
  const allDayItems = items.filter((e) => e.isBirthday || e.allDay);
  const timedItems = items.filter((e) => !e.isBirthday && !e.allDay);
  return (
    <div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginBottom: 8, textTransform: "uppercase" }}>
        {dayLabel(dateISO)}
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: FONT_BODY, color: "#A6AEB8", fontSize: 14, padding: "12px 2px" }}>Geen afspraken.</div>
      ) : (
        <>
          {allDayItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: timedItems.length > 0 ? 8 : 0 }}>
              {allDayItems.map((e) => (
                <AllDayChip key={e.id} e={e} onEdit={onEdit} onEditBirthday={onEditBirthday} />
              ))}
            </div>
          )}
          {timedItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {timedItems.map((e) => (
                <EventRow key={e.id} e={e} onRemove={onRemove} onEdit={onEdit} onEditBirthday={onEditBirthday} onRequestRemove={onRequestRemove} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function shade(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

export default function HuishoudApp() {
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ stores: DEFAULT_STORES, lists: {}, cards: [], events: [], birthdays: [], todos: [], storeColors: {} });
  const [activeStore, setActiveStore] = useState(DEFAULT_STORES[0]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [itemDraft, setItemDraft] = useState({ text: "", validFrom: "", validTo: "", qty: 1 });
  const [showAddStore, setShowAddStore] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreColor, setNewStoreColor] = useState(STORE_COLOR_PALETTE[0]);
  const [newCard, setNewCard] = useState({ store: "", number: "", color: CARD_COLORS[0] });
  const [openCardId, setOpenCardId] = useState(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({ title: "", date: "", time: "", owner: "Samen", status: "te_doen", pickedUpBy: "" });
  const [editingTodoId, setEditingTodoId] = useState(null);

  const theme = OWNER_COLORS[user] || OWNER_COLORS.Emile;
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventFormType, setEventFormType] = useState("afspraak");
  const [agendaFilter, setAgendaFilter] = useState("Alles");
  const [newEvent, setNewEvent] = useState({ title: "", date: "", endDate: "", time: "", endTime: "", allDay: false, notes: "", owner: "Samen", repeat: "none" });
  const [editingId, setEditingId] = useState(null);
  const [deleteTargetDate, setDeleteTargetDate] = useState("");
  const [confirmRemoveEvent, setConfirmRemoveEvent] = useState(null);
  const [confirmDeleteChoice, setConfirmDeleteChoice] = useState(false);
  const [newBirthday, setNewBirthday] = useState({ name: "", day: "", month: "", year: "" });
  const [editingBirthdayId, setEditingBirthdayId] = useState(null);
  const [agendaView, setAgendaView] = useState("week");
  const [cursorDate, setCursorDate] = useState(toISO(new Date()));
  const [showImport, setShowImport] = useState(false);
  const [importParsed, setImportParsed] = useState([]);
  const [importSelected, setImportSelected] = useState({});
  const [importAsType, setImportAsType] = useState({});
  const [importMode, setImportMode] = useState("file");
  const [importOwner, setImportOwner] = useState("Samen");
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef(null);
  const [selectedDay, setSelectedDay] = useState(toISO(new Date()));

  const lastSyncRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState("ok");
  const [syncErrorDetail, setSyncErrorDetail] = useState("");

  const [session, setSession] = useState(undefined);
  const [pwInput, setPwInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: HOUSEHOLD_EMAIL, password: pwInput });
    if (error) setAuthError("Wachtwoord onjuist.");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    try {
      localStorage.removeItem("homepilot-current-user");
    } catch (e) {}
  };

  useEffect(() => {
    if (!session) return;
    try {
      const name = localStorage.getItem("homepilot-current-user");
      if (name) {
        setUser(name);
        setNewEvent((e) => ({ ...e, owner: name }));
      }
    } catch (e) {}

    (async () => {
      try {
        const row = await fetchHousehold();
        if (row) {
          const parsed = row.data || {};
          setData({ stores: DEFAULT_STORES, lists: {}, cards: [], events: [], birthdays: [], todos: [], storeColors: {}, ...parsed });
          if (parsed.stores?.length) setActiveStore(parsed.stores[0]);
          lastSyncRef.current = row.updated_at;
          setSyncStatus("ok");
        } else {
          setSyncStatus("error");
          setSyncErrorDetail("Geen rij gevonden met id 'homepilot' in de household-tabel.");
        }
      } catch (e) {
        console.error("Supabase laden mislukt", e);
        setSyncStatus("error");
        setSyncErrorDetail(String(e && e.message ? e.message : e));
      }
      setLoading(false);
    })();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("household-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "household", filter: `id=eq.${HOUSEHOLD_ID}` },
        (payload) => {
          const row = payload.new;
          if (!row || row.updated_at === lastSyncRef.current) return;
          const parsed = row.data || {};
          setData({ stores: DEFAULT_STORES, lists: {}, cards: [], events: [], birthdays: [], todos: [], storeColors: {}, ...parsed });
          lastSyncRef.current = row.updated_at;
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setSyncStatus("ok");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncStatus("error");
          setSyncErrorDetail("Realtime-verbinding verbroken (" + status + ").");
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const save = useCallback(async (next) => {
    setData(next);
    try {
      const row = await pushHousehold(next);
      if (row) lastSyncRef.current = row.updated_at;
      setSyncStatus("ok");
    } catch (e) {
      console.error("Opslaan mislukt", e);
      setSyncStatus("error");
      setSyncErrorDetail(String(e && e.message ? e.message : e));
    }
  }, []);

  const chooseUser = async (name) => {
    setUser(name);
    setNewEvent((e) => ({ ...e, owner: name }));
    try {
      localStorage.setItem("homepilot-current-user", name);
    } catch (e) {}
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const list = data.lists[activeStore] || [];
    const item = { id: Date.now().toString(36), text: newItem.trim(), done: false, addedBy: user, qty: 1 };
    save({ ...data, lists: { ...data.lists, [activeStore]: [...list, item] } });
    setNewItem("");
  };

  const toggleItem = (id) => {
    const list = (data.lists[activeStore] || []).map((it) =>
      it.id === id ? { ...it, done: !it.done } : it
    );
    save({ ...data, lists: { ...data.lists, [activeStore]: list } });
  };

  const removeItem = (id) => {
    const list = (data.lists[activeStore] || []).filter((it) => it.id !== id);
    save({ ...data, lists: { ...data.lists, [activeStore]: list } });
  };

  const updateItem = (store, id, patch) => {
    const list = (data.lists[store] || []).map((it) => (it.id === id ? { ...it, ...patch } : it));
    save({ ...data, lists: { ...data.lists, [store]: list } });
  };

  const changeQty = (store, id, delta) => {
    const list = data.lists[store] || [];
    const it = list.find((x) => x.id === id);
    if (!it) return;
    const next = Math.max(1, (it.qty || 1) + delta);
    updateItem(store, id, { qty: next });
  };

  const openEditItem = (store, it) => {
    setEditingItem({ store, id: it.id });
    setItemDraft({ text: it.text, validFrom: it.validFrom || "", validTo: it.validTo || "", qty: it.qty || 1 });
  };

  const closeEditItem = () => setEditingItem(null);

  const saveEditItem = () => {
    if (!editingItem || !itemDraft.text.trim()) return;
    updateItem(editingItem.store, editingItem.id, {
      text: itemDraft.text.trim(),
      validFrom: itemDraft.validFrom,
      validTo: itemDraft.validTo,
      qty: Math.max(1, Number(itemDraft.qty) || 1),
    });
    closeEditItem();
  };

  const clearDone = () => {
    const list = (data.lists[activeStore] || []).filter((it) => !it.done);
    save({ ...data, lists: { ...data.lists, [activeStore]: list } });
  };

  const addStore = () => {
    if (!newStoreName.trim() || data.stores.includes(newStoreName.trim())) return;
    const name = newStoreName.trim();
    const stores = [...data.stores, name];
    const storeColors = { ...data.storeColors, [name]: newStoreColor };
    save({ ...data, stores, storeColors });
    setActiveStore(name);
    setNewStoreName("");
    setNewStoreColor(STORE_COLOR_PALETTE[0]);
    setShowAddStore(false);
  };

  const removeStore = (store) => {
    const stores = data.stores.filter((s) => s !== store);
    const lists = { ...data.lists };
    delete lists[store];
    const storeColors = { ...data.storeColors };
    delete storeColors[store];
    save({ ...data, stores, lists, storeColors });
    if (activeStore === store) setActiveStore(stores[0] || "");
    setStoreToDelete(null);
  };

  const addCard = () => {
    if (!newCard.store.trim() || !newCard.number.trim()) return;
    const cards = [...data.cards, { id: Date.now().toString(36), ...newCard }];
    save({ ...data, cards });
    setNewCard({ store: "", number: "", color: CARD_COLORS[0] });
    setShowAddCard(false);
  };

  const removeCard = (id) => {
    save({ ...data, cards: data.cards.filter((c) => c.id !== id) });
    if (openCardId === id) setOpenCardId(null);
  };

  const openAddTodo = () => {
    setEditingTodoId(null);
    setNewTodo({ title: "", date: toISO(new Date()), time: "", owner: user, status: "te_doen", pickedUpBy: "" });
    setShowAddTodo(true);
  };

  const openEditTodo = (t) => {
    setEditingTodoId(t.id);
    setNewTodo({
      title: t.title || "",
      date: t.date || "",
      time: t.time || "",
      owner: t.owner || user,
      status: getTodoStatus(t),
      pickedUpBy: t.pickedUpBy || "",
    });
    setShowAddTodo(true);
  };

  const closeTodoForm = () => {
    setShowAddTodo(false);
    setEditingTodoId(null);
  };

  const saveTodo = () => {
    if (!newTodo.title.trim()) return;
    const cleaned = { ...newTodo, title: newTodo.title.trim() };
    delete cleaned.done;
    if (editingTodoId) {
      const todos = (data.todos || []).map((t) => (t.id === editingTodoId ? { ...t, ...cleaned } : t));
      save({ ...data, todos });
    } else {
      const todo = { id: Date.now().toString(36), ...cleaned };
      save({ ...data, todos: [...(data.todos || []), todo] });
    }
    closeTodoForm();
  };

  const cycleTodoStatus = (id) => {
    const todos = (data.todos || []).map((t) => {
      if (t.id !== id) return t;
      const current = getTodoStatus(t);
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length];
      const pickedUpBy = next === "bezig" && !t.pickedUpBy ? user : t.pickedUpBy;
      return { ...t, status: next, pickedUpBy, done: next === "klaar" };
    });
    save({ ...data, todos });
  };

  const removeTodo = (id) => {
    save({ ...data, todos: (data.todos || []).filter((t) => t.id !== id) });
    if (editingTodoId === id) closeTodoForm();
  };

  const clearDoneTodos = () => {
    save({ ...data, todos: (data.todos || []).filter((t) => getTodoStatus(t) !== "klaar") });
  };

  const saveEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    const cleaned = {
      ...newEvent,
      title: newEvent.title.trim(),
      endDate: newEvent.endDate && newEvent.endDate >= newEvent.date ? newEvent.endDate : "",
    };
    if (editingId) {
      const events = (data.events || []).map((e) => (e.id === editingId ? { ...e, ...cleaned } : e));
      save({ ...data, events });
    } else {
      const event = { id: Date.now().toString(36), ...cleaned };
      save({ ...data, events: [...(data.events || []), event] });
    }
    setNewEvent({ title: "", date: "", endDate: "", time: "", endTime: "", allDay: false, notes: "", owner: user, repeat: "none" });
    setEditingId(null);
    setShowAddEvent(false);
  };

  const removeEvent = (id) => {
    save({ ...data, events: (data.events || []).filter((e) => e.id !== id) });
    if (editingId === id) {
      setEditingId(null);
      setShowAddEvent(false);
      setConfirmDeleteChoice(false);
    }
  };

  const requestRemoveEvent = (e) => setConfirmRemoveEvent(e);

  const confirmRemoveNow = () => {
    if (!confirmRemoveEvent) return;
    removeEvent(confirmRemoveEvent.id);
    setConfirmRemoveEvent(null);
  };

  const removeEventOccurrence = (id, dateToExclude) => {
    const events = (data.events || []).map((e) => {
      if (e.id !== id) return e;
      const excludedDates = Array.from(new Set([...(e.excludedDates || []), dateToExclude]));
      return { ...e, excludedDates };
    });
    save({ ...data, events });
    setEditingId(null);
    setShowAddEvent(false);
    setConfirmDeleteChoice(false);
  };

  const saveBirthday = () => {
    if (!newBirthday.name.trim() || !newBirthday.day || !newBirthday.month) return;
    const cleaned = {
      name: newBirthday.name.trim(),
      day: Number(newBirthday.day),
      month: Number(newBirthday.month),
      year: newBirthday.year ? Number(newBirthday.year) : null,
    };
    if (editingBirthdayId) {
      const birthdays = (data.birthdays || []).map((b) => (b.id === editingBirthdayId ? { ...b, ...cleaned } : b));
      save({ ...data, birthdays });
    } else {
      const b = { id: Date.now().toString(36), ...cleaned };
      save({ ...data, birthdays: [...(data.birthdays || []), b] });
    }
    setNewBirthday({ name: "", day: "", month: "", year: "" });
    setEditingBirthdayId(null);
    setShowAddEvent(false);
  };

  const removeBirthday = (id) => {
    save({ ...data, birthdays: (data.birthdays || []).filter((b) => b.id !== id) });
    if (editingBirthdayId === id) {
      setEditingBirthdayId(null);
      setShowAddEvent(false);
    }
  };

  const openEditBirthday = (id) => {
    const b = (data.birthdays || []).find((x) => x.id === id);
    if (!b) return;
    setEventFormType("verjaardag");
    setEditingId(null);
    setEditingBirthdayId(b.id);
    setNewBirthday({ name: b.name, day: String(b.day), month: String(b.month), year: b.year ? String(b.year) : "" });
    setShowAddEvent(true);
  };

  const shiftCursor = (dir) => {
    const d = fromISO(cursorDate);
    let next;
    if (agendaView === "dag") next = addDays(d, dir);
    else if (agendaView === "week") next = addDays(d, dir * 7);
    else next = new Date(d.getFullYear(), d.getMonth() + dir, 1);
    const iso = toISO(next);
    setCursorDate(iso);
    if (agendaView !== "maand") setSelectedDay(iso);
  };

  const goToday = () => {
    const iso = toISO(new Date());
    setCursorDate(iso);
    setSelectedDay(iso);
  };

  const openAddEvent = (dateForForm) => {
    setEventFormType("afspraak");
    setEditingId(null);
    setEditingBirthdayId(null);
    setConfirmDeleteChoice(false);
    setNewEvent({ title: "", date: dateForForm || selectedDay, endDate: "", time: "", endTime: "", allDay: false, notes: "", owner: user, repeat: "none" });
    setNewBirthday({ name: "", day: "", month: "", year: "" });
    setShowAddEvent(true);
  };

  const openEditEvent = (clicked) => {
    const event =
      clicked.isRecurringInstance || clicked.isSpanInstance
        ? (data.events || []).find((e) => e.id === clicked.originalId) || clicked
        : clicked;
    setEventFormType("afspraak");
    setEditingBirthdayId(null);
    setEditingId(event.id);
    setDeleteTargetDate(clicked.date || event.date);
    setConfirmDeleteChoice(false);
    setNewEvent({
      title: event.title || "",
      date: event.date || "",
      endDate: event.endDate || "",
      time: event.time || "",
      endTime: event.endTime || "",
      allDay: !!event.allDay,
      notes: event.notes || "",
      owner: event.owner || user,
      repeat: event.repeat || "none",
    });
    setShowAddEvent(true);
  };

  const closeEventForm = () => {
    setShowAddEvent(false);
    setEditingId(null);
    setEditingBirthdayId(null);
    setConfirmDeleteChoice(false);
  };

  const handleICSFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportOwner(user || "Samen");
    setImportMode("file");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const isVCard = /BEGIN:VCARD/i.test(text) && !/BEGIN:VCALENDAR/i.test(text);
        const parsed = isVCard ? parseVCard(text) : parseICS(text);
        setImportParsed(parsed);
        const selected = {};
        const asType = {};
        parsed.forEach((ev, i) => {
          selected[i] = true;
          asType[i] = ev.isBirthdayLike ? "verjaardag" : "afspraak";
        });
        setImportSelected(selected);
        setImportAsType(asType);
        setShowImport(true);
      } catch (err) {
        console.error("ICS-import mislukt", err);
        alert("Kon dit .ics-bestand niet lezen. Controleer of het een geldig agenda-exportbestand is.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    const toAddEvents = [];
    const toAddBirthdays = [];
    importParsed.forEach((ev, i) => {
      if (!importSelected[i]) return;
      if (importAsType[i] === "verjaardag") {
        const y = Number(ev.date.slice(0, 4));
        const m = Number(ev.date.slice(5, 7));
        const d = Number(ev.date.slice(8, 10));
        const plausibleYear = y >= 1900 && y <= new Date().getFullYear() && y !== 1604;
        toAddBirthdays.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: extractBirthdayName(ev.title),
          day: d,
          month: m,
          year: plausibleYear ? y : null,
        });
      } else {
        toAddEvents.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          title: ev.title,
          date: ev.date,
          time: ev.time,
          endTime: ev.endTime,
          allDay: ev.allDay,
          notes: ev.notes,
          repeat: ev.repeat,
          owner: importOwner,
          isHoliday: !!ev.isHoliday,
        });
      }
    });
    if (toAddEvents.length === 0 && toAddBirthdays.length === 0) {
      setShowImport(false);
      return;
    }
    save({
      ...data,
      events: [...(data.events || []), ...toAddEvents],
      birthdays: [...(data.birthdays || []), ...toAddBirthdays],
    });
    setShowImport(false);
    setImportParsed([]);
    setImportSelected({});
    setImportAsType({});
    setImportFileName("");
  };

  const cancelImport = () => {
    setShowImport(false);
    setImportParsed([]);
    setImportSelected({});
    setImportAsType({});
    setImportFileName("");
  };

  if (session === undefined) {
    return (
      <div style={{ ...shell, alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color="#0F2A4A" className="spin" />
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...shell, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: "#0F2A4A", marginBottom: 4 }}>
          HomePilot
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#5C6B7A", marginBottom: 24 }}>
          Voer het huishoud-wachtwoord in
        </div>
        <input
          type="password"
          value={pwInput}
          onChange={(e) => setPwInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !authLoading && handleLogin()}
          placeholder="Wachtwoord"
          autoFocus
          style={{ ...inputStyle, width: 240, textAlign: "center", fontSize: 16, marginBottom: 12 }}
        />
        {authError && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#C8272A", marginBottom: 12 }}>
            {authError}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={authLoading || !pwInput}
          style={{
            ...smallBtn,
            background: "#0F2A4A",
            width: 240,
            opacity: authLoading || !pwInput ? 0.6 : 1,
            cursor: authLoading || !pwInput ? "not-allowed" : "pointer",
          }}
        >
          {authLoading ? "Bezig..." : "Inloggen"}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...shell, alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color={theme.bg} className="spin" />
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ ...shell, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: "#0F2A4A", marginBottom: 4 }}>
          Wie ben jij?
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#5C6B7A", marginBottom: 28 }}>
          Zodat we weten wie wat toevoegt
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Emile", "Emily"].map((name) => (
            <button
              key={name}
              onClick={() => chooseUser(name)}
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 600,
                fontSize: 16,
                padding: "14px 28px",
                borderRadius: 14,
                border: "none",
                background: OWNER_COLORS[name].bg,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const todayIso = toISO(new Date());
  const currentList = data.lists[activeStore] || [];
  const activeItems = currentList.filter((i) => !i.done && isItemActive(i, todayIso));
  const upcomingItems = currentList.filter((i) => !i.done && !isItemActive(i, todayIso));
  const openCount = activeItems.length;

  const filteredEvents = (data.events || []).filter(
    (e) => agendaFilter === "Alles" || e.owner === agendaFilter
  );
  const eventsByDate = {};
  filteredEvents.forEach((e) => {
    if ((e.excludedDates || []).includes(e.date)) return;
    (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e);
  });
  Object.values(eventsByDate).forEach((list) =>
    list.sort((a, b) => (a.time || "").localeCompare(b.time || ""))
  );

  const getDayItems = (iso) => {
    const items = [
      ...birthdayEventsFor(iso, data.birthdays),
      ...(eventsByDate[iso] || []),
      ...recurringInstancesFor(iso, filteredEvents),
      ...spanInstancesFor(iso, filteredEvents),
    ];
    return items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  };

  const cursorD = fromISO(cursorDate);
  let periodLabel = "";
  if (agendaView === "dag") {
    periodLabel = dayLabel(cursorDate);
  } else if (agendaView === "week") {
    const start = startOfWeek(cursorD);
    const end = addDays(start, 6);
    periodLabel =
      start.getMonth() === end.getMonth()
        ? `${start.getDate()} – ${end.getDate()} ${MONTHS_FULL[end.getMonth()]}`
        : `${start.getDate()} ${MONTHS_FULL[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTHS_FULL[end.getMonth()].slice(0, 3)}`;
  } else {
    periodLabel = `${MONTHS_FULL[cursorD.getMonth()]} ${cursorD.getFullYear()}`;
  }

  return (
    <div style={shell}>
      <div style={{ ...header, background: `linear-gradient(135deg, ${shade(theme.bg, -30)}, ${theme.bg})` }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: "#fff", lineHeight: 1 }}>
            HomePilot
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => chooseUser(user === "Emile" ? "Emily" : "Emile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20,
              padding: "6px 12px",
              color: "#fff",
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <User size={13} /> {user}
          </button>
          <button
            onClick={handleLogout}
            title="Uitloggen"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20,
              width: 28,
              height: 28,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {syncStatus === "error" && (
        <div
          style={{
            background: "#FFF4F0",
            borderBottom: "1px solid #F3C9BC",
            padding: "8px 16px",
            fontFamily: FONT_BODY,
            fontSize: 12,
            color: "#8A3B1F",
            textAlign: "center",
          }}
        >
          Geen verbinding met de database.
          {syncErrorDetail && (
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, marginTop: 3, opacity: 0.85, wordBreak: "break-word" }}>
              {syncErrorDetail}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 16px 90px" }}>
        {tab === "home" && (
          <>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginBottom: 8, textTransform: "uppercase" }}>
              Boodschappen
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {data.stores.map((s) => {
                const storeItems = (data.lists[s] || []).filter((i) => !i.done && isItemActive(i, todayIso));
                const count = storeItems.length;
                const hasUrgent = storeItems.some((i) => i.validTo && daysUntil(i.validTo, todayIso) <= 2);
                const c = colorFor(s, data.storeColors);
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setActiveStore(s);
                      setTab("boodschappen");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#fff",
                      borderRadius: 12,
                      padding: "13px 14px",
                      border: `1px solid ${hasUrgent ? "#F3C9BC" : "#EDEFF2"}`,
                      borderLeft: `4px solid ${c.bg}`,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontFamily: FONT_BODY, fontSize: 15, color: "#1E2A38", fontWeight: 500 }}>
                      {hasUrgent ? "⚡ " : ""}
                      {s}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        fontWeight: 700,
                        color: count > 0 ? theme.bg : "#C7CFD8",
                      }}
                    >
                      {count > 0 ? `(${count})` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginBottom: 8, textTransform: "uppercase" }}>
              Taken
            </div>
            {(() => {
              const openTodos = (data.todos || []).filter((t) => getTodoStatus(t) !== "klaar");
              const hasUrgentTodo = openTodos.some((t) => t.date && daysUntil(t.date, todayIso) <= 2);
              return (
                <button
                  onClick={() => setTab("taken")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    background: "#fff",
                    borderRadius: 12,
                    padding: "13px 14px",
                    border: `1px solid ${hasUrgentTodo ? "#F3C9BC" : "#EDEFF2"}`,
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: 20,
                  }}
                >
                  <span style={{ fontFamily: FONT_BODY, fontSize: 15, color: "#1E2A38", fontWeight: 500 }}>
                    {hasUrgentTodo ? "⚡ " : ""}Openstaande taken
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      fontWeight: 700,
                      color: openTodos.length > 0 ? theme.bg : "#C7CFD8",
                    }}
                  >
                    {openTodos.length > 0 ? `(${openTodos.length})` : "—"}
                  </span>
                </button>
              );
            })()}

            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginBottom: 8, textTransform: "uppercase" }}>
              Vandaag
            </div>
            {(() => {
              const todayIso = toISO(new Date());
              const todaysItems = getDayItems(todayIso);
              if (todaysItems.length === 0) {
                return (
                  <div style={{ fontFamily: FONT_BODY, color: "#A6AEB8", fontSize: 14, padding: "4px 2px 0" }}>
                    Geen afspraken vandaag.
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {todaysItems.filter((e) => e.isBirthday || e.allDay).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {todaysItems
                        .filter((e) => e.isBirthday || e.allDay)
                        .map((e) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              setAgendaView("dag");
                              setCursorDate(todayIso);
                              setSelectedDay(todayIso);
                              setTab("agenda");
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: colorForEvent(e).bg,
                              color: "#fff",
                              borderRadius: 8,
                              padding: "6px 10px",
                              cursor: "pointer",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: FONT_BODY,
                                fontSize: 12,
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {e.title}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                  {todaysItems
                    .filter((e) => !e.isBirthday && !e.allDay)
                    .map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setAgendaView("dag");
                        setCursorDate(todayIso);
                        setSelectedDay(todayIso);
                        setTab("agenda");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#fff",
                        borderRadius: 12,
                        padding: "12px 12px",
                        border: "1px solid #EDEFF2",
                        borderLeft: `4px solid ${(OWNER_COLORS[e.owner] || OWNER_COLORS.Samen).bg}`,
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: "#1E2A38", fontWeight: 500 }}>{e.title}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", marginTop: 2 }}>
                          {e.time || "Hele dag"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}

            {(() => {
              const todayIso = toISO(new Date());
              const upcoming = [];
              for (let i = 0; i <= 5; i++) {
                const iso = toISO(addDays(fromISO(todayIso), i));
                birthdayEventsFor(iso, data.birthdays).forEach((b) => upcoming.push({ ...b, daysAway: i }));
              }
              if (upcoming.length === 0) return null;
              return (
                <>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginTop: 20, marginBottom: 8, textTransform: "uppercase" }}>
                    Verjaardagen
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {upcoming.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => openEditBirthday(b.birthdayId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          background: "#FFF9EC",
                          borderRadius: 12,
                          padding: "12px 12px",
                          border: "1px solid #EDEFF2",
                          borderLeft: `4px solid ${BIRTHDAY_COLOR.bg}`,
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        <span style={{ fontFamily: FONT_BODY, fontSize: 15, color: "#1E2A38", fontWeight: 500 }}>{b.title}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", flexShrink: 0, marginLeft: 8 }}>
                          {b.daysAway === 0 ? "Vandaag" : b.daysAway === 1 ? "Morgen" : `over ${b.daysAway} dagen`}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </>
        )}

        {tab === "boodschappen" && (
          <>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
              {data.stores.map((s) => {
                const c = colorFor(s, data.storeColors);
                const active = s === activeStore;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveStore(s)}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: active ? "none" : "1px solid #D8DEE6",
                      background: active ? c.bg : "#fff",
                      color: active ? c.text : "#5C6B7A",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                    {active && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStoreToDelete(s);
                        }}
                        style={{ display: "flex", alignItems: "center", opacity: 0.85 }}
                      >
                        <X size={13} />
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => setShowAddStore(true)}
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px dashed #B8C2CC",
                  background: "#fff",
                  color: "#5C6B7A",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {storeToDelete && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "#FFF4F0",
                  border: "1px solid #F3C9BC",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#8A3B1F" }}>
                  "{storeToDelete}" en zijn lijst verwijderen?
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => removeStore(storeToDelete)}
                    style={{ ...smallBtn, background: "#C8272A", padding: "6px 12px", fontSize: 12 }}
                  >
                    Verwijderen
                  </button>
                  <button
                    onClick={() => setStoreToDelete(null)}
                    style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6", padding: "6px 12px", fontSize: 12 }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            {showAddStore && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #EDEFF2", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    autoFocus
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addStore()}
                    placeholder="Naam van winkel"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 6 }}>
                  Kleur
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {STORE_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.bg}
                      onClick={() => setNewStoreColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: c.bg,
                        border: newStoreColor.bg === c.bg ? "3px solid #1E2A38" : "1px solid rgba(0,0,0,0.08)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addStore} style={{ ...smallBtn, background: newStoreColor.bg, color: newStoreColor.text, flex: 1 }}>
                    Toevoegen
                  </button>
                  <button
                    onClick={() => {
                      setShowAddStore(false);
                      setNewStoreName("");
                      setNewStoreColor(STORE_COLOR_PALETTE[0]);
                    }}
                    style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3 }}>
                {openCount === 0 ? "NIETS MEER NODIG" : `${openCount} OP DE LIJST`}
              </div>
              {currentList.some((it) => it.done) && (
                <button
                  onClick={clearDone}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    color: theme.bg,
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Trash2 size={13} /> Verwijder aangevinkte
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentList.length === 0 && (
                <div style={{ fontFamily: FONT_BODY, color: "#A6AEB8", fontSize: 14, padding: "24px 4px" }}>
                  Nog niets toegevoegd voor {activeStore}.
                </div>
              )}
              {currentList
                .filter((it) => it.done || isItemActive(it, todayIso))
                .slice()
                .sort((a, b) => {
                  if (a.done !== b.done) return a.done ? 1 : -1;
                  return (a.validTo || "9999-99-99").localeCompare(b.validTo || "9999-99-99");
                })
                .map((it) => {
                  if (editingItem && editingItem.store === activeStore && editingItem.id === it.id) {
                    return (
                      <div
                        key={it.id}
                        style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${theme.bg}` }}
                      >
                        <input
                          value={itemDraft.text}
                          onChange={(e) => setItemDraft({ ...itemDraft, text: e.target.value })}
                          style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
                        />
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                            Pas kopen vanaf
                          </div>
                          <DateSelect
                            value={itemDraft.validFrom}
                            onChange={(v) => setItemDraft({ ...itemDraft, validFrom: v })}
                          />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                            In de bonus t/m
                          </div>
                          <DateSelect
                            value={itemDraft.validTo}
                            onChange={(v) => setItemDraft({ ...itemDraft, validTo: v })}
                          />
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                            Aantal
                          </div>
                          <QtyStepper
                            qty={itemDraft.qty}
                            onChange={(delta) => setItemDraft({ ...itemDraft, qty: Math.max(1, itemDraft.qty + delta) })}
                            size="md"
                          />
                        </div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#B0B8C1", marginBottom: 10 }}>
                          Vanaf/tot zijn optioneel — laat leeg voor een gewoon item.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={saveEditItem}
                            disabled={!itemDraft.text.trim()}
                            style={{ ...smallBtn, background: theme.bg, flex: 1, opacity: itemDraft.text.trim() ? 1 : 0.5 }}
                          >
                            Opslaan
                          </button>
                          <button onClick={closeEditItem} style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}>
                            Annuleren
                          </button>
                        </div>
                      </div>
                    );
                  }
                  const daysLeft = it.validTo ? daysUntil(it.validTo, todayIso) : null;
                  const urgent = daysLeft !== null && daysLeft <= 2;
                  return (
                    <div
                      key={it.id}
                      onClick={() => openEditItem(activeStore, it)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#fff",
                        borderRadius: 12,
                        padding: "12px 12px",
                        border: `1px solid ${urgent && !it.done ? "#F3C9BC" : "#EDEFF2"}`,
                        cursor: "pointer",
                      }}
                    >
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleItem(it.id);
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: it.done ? "none" : "2px solid #C7CFD8",
                          background: it.done ? "#2B7A4B" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {it.done && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: FONT_BODY,
                            fontSize: 15,
                            color: it.done ? "#B0B8C1" : "#1E2A38",
                            textDecoration: it.done ? "line-through" : "none",
                          }}
                        >
                          {it.text}
                          {(it.qty || 1) > 1 ? ` (${it.qty}×)` : ""}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                          {it.addedBy && (
                            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#B0B8C1" }}>
                              toegevoegd door {it.addedBy}
                            </span>
                          )}
                          {it.validTo && !it.done && (
                            <span
                              style={{
                                fontFamily: FONT_BODY,
                                fontSize: 11,
                                fontWeight: 700,
                                color: urgent ? "#C8272A" : "#8A96A3",
                                border: `1px solid ${urgent ? "#C8272A" : "#D8DEE6"}`,
                                borderRadius: 999,
                                padding: "1px 7px",
                              }}
                            >
                              {urgent ? "⚡ " : ""}t/m {dayLabel(it.validTo)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!it.done && (
                        <QtyStepper qty={it.qty || 1} onChange={(delta) => changeQty(activeStore, it.id, delta)} />
                      )}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          removeItem(it.id);
                        }}
                        style={{ background: "none", border: "none", color: "#C7CFD8", cursor: "pointer", padding: 4, flexShrink: 0 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
            </div>

            {upcomingItems.length > 0 && (
              <>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginTop: 18, marginBottom: 8, textTransform: "uppercase" }}>
                  Binnenkort in de bonus
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {upcomingItems
                    .slice()
                    .sort((a, b) => (a.validFrom || "").localeCompare(b.validFrom || ""))
                    .map((it) => {
                      if (editingItem && editingItem.store === activeStore && editingItem.id === it.id) {
                        return (
                          <div
                            key={it.id}
                            style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${theme.bg}` }}
                          >
                            <input
                              value={itemDraft.text}
                              onChange={(e) => setItemDraft({ ...itemDraft, text: e.target.value })}
                              style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
                            />
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                                Pas kopen vanaf
                              </div>
                              <DateSelect
                                value={itemDraft.validFrom}
                                onChange={(v) => setItemDraft({ ...itemDraft, validFrom: v })}
                              />
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                                In de bonus t/m
                              </div>
                              <DateSelect
                                value={itemDraft.validTo}
                                onChange={(v) => setItemDraft({ ...itemDraft, validTo: v })}
                              />
                            </div>
                            <div style={{ marginBottom: 4 }}>
                              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                                Aantal
                              </div>
                              <QtyStepper
                                qty={itemDraft.qty}
                                onChange={(delta) => setItemDraft({ ...itemDraft, qty: Math.max(1, itemDraft.qty + delta) })}
                                size="md"
                              />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                              <button
                                onClick={saveEditItem}
                                disabled={!itemDraft.text.trim()}
                                style={{ ...smallBtn, background: theme.bg, flex: 1, opacity: itemDraft.text.trim() ? 1 : 0.5 }}
                              >
                                Opslaan
                              </button>
                              <button onClick={closeEditItem} style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}>
                                Annuleren
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={it.id}
                          onClick={() => openEditItem(activeStore, it)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: "#F5F6F8",
                            borderRadius: 12,
                            padding: "12px 12px",
                            border: "1px solid #EDEFF2",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: "#8A96A3" }}>
                              {it.text}
                              {(it.qty || 1) > 1 ? ` (${it.qty}×)` : ""}
                            </div>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#B0B8C1", marginTop: 2 }}>
                              vanaf {dayLabel(it.validFrom)}
                              {it.validTo ? ` · t/m ${dayLabel(it.validTo)}` : ""}
                            </div>
                          </div>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              removeItem(it.id);
                            }}
                            style={{ background: "none", border: "none", color: "#C7CFD8", cursor: "pointer", padding: 4, flexShrink: 0 }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </>
        )}

        {tab === "klantkaarten" && (
          <>
            {data.cards.length > 0 && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", marginBottom: 10 }}>
                Tik op een kaart om 'm groot te tonen en te scannen.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.cards.length === 0 && !showAddCard && (
                <div style={{ fontFamily: FONT_BODY, color: "#A6AEB8", fontSize: 14, padding: "24px 4px" }}>
                  Nog geen klantkaarten toegevoegd.
                </div>
              )}
              {data.cards.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setOpenCardId(c.id)}
                  style={{
                    borderRadius: 16,
                    padding: "18px 18px",
                    background: c.color,
                    color: "#fff",
                    position: "relative",
                    boxShadow: "0 4px 14px rgba(15,42,74,0.18)",
                    cursor: "pointer",
                  }}
                >
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeCard(c.id);
                    }}
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      borderRadius: 999,
                      width: 22,
                      height: 22,
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <X size={13} />
                  </button>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>{c.store}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 14, letterSpacing: 1.5, opacity: 0.85 }}>
                    {c.number}
                  </div>
                </div>
              ))}
            </div>

            {showAddCard ? (
              <div style={{ marginTop: 14, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #EDEFF2" }}>
                <input
                  value={newCard.store}
                  onChange={(e) => setNewCard({ ...newCard, store: e.target.value })}
                  placeholder="Winkelnaam"
                  style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
                />
                <input
                  value={newCard.number}
                  onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                  placeholder="Kaartnummer"
                  style={{ ...inputStyle, width: "100%", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {CARD_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => setNewCard({ ...newCard, color: col })}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: col,
                        border: newCard.color === col ? "2px solid #0F2A4A" : "2px solid transparent",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addCard} style={{ ...smallBtn, background: theme.bg, flex: 1 }}>Kaart opslaan</button>
                  <button
                    onClick={() => setShowAddCard(false)}
                    style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCard(true)}
                style={{
                  marginTop: 14,
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px dashed #B8C2CC",
                  background: "#fff",
                  color: "#5C6B7A",
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={15} /> Klantkaart toevoegen
              </button>
            )}
          </>
        )}

        {tab === "taken" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3 }}>
                {(data.todos || []).filter((t) => getTodoStatus(t) !== "klaar").length === 0 ? "NIETS TE DOEN" : `${(data.todos || []).filter((t) => getTodoStatus(t) !== "klaar").length} OPEN`}
              </div>
              {(data.todos || []).some((t) => getTodoStatus(t) === "klaar") && (
                <button
                  onClick={clearDoneTodos}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    color: theme.bg,
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Trash2 size={13} /> Verwijder afgeronde
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {(data.todos || []).length === 0 && (
                <div style={{ fontFamily: FONT_BODY, color: "#A6AEB8", fontSize: 14, padding: "12px 2px" }}>
                  Nog geen taken toegevoegd.
                </div>
              )}
              {(data.todos || [])
                .slice()
                .sort((a, b) => {
                  const sa = getTodoStatus(a);
                  const sb = getTodoStatus(b);
                  if ((sa === "klaar") !== (sb === "klaar")) return sa === "klaar" ? 1 : -1;
                  return (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));
                })
                .map((t) => {
                  const c = OWNER_COLORS[t.owner] || OWNER_COLORS.Samen;
                  const status = getTodoStatus(t);
                  const meta = STATUS_META[status];
                  const isDone = status === "klaar";
                  const daysLeft = t.date ? daysUntil(t.date, todayIso) : null;
                  const urgent = !isDone && daysLeft !== null && daysLeft <= 2;
                  return (
                    <div
                      key={t.id}
                      onClick={() => openEditTodo(t)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#fff",
                        borderRadius: 12,
                        padding: "12px 12px",
                        border: `1px solid ${urgent ? "#F3C9BC" : "#EDEFF2"}`,
                        borderLeft: `4px solid ${c.bg}`,
                        cursor: "pointer",
                      }}
                    >
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          cycleTodoStatus(t.id);
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: isDone ? "none" : `2px solid ${meta.color}`,
                          background: isDone ? meta.color : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {isDone && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: FONT_BODY,
                            fontSize: 15,
                            color: isDone ? "#B0B8C1" : "#1E2A38",
                            textDecoration: isDone ? "line-through" : "none",
                          }}
                        >
                          {t.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontFamily: FONT_BODY,
                              fontSize: 11,
                              fontWeight: 700,
                              color: meta.color,
                              border: `1px solid ${meta.color}`,
                              borderRadius: 999,
                              padding: "1px 8px",
                            }}
                          >
                            {meta.label}
                          </span>
                          {t.date && (
                            <span
                              style={{
                                fontFamily: FONT_BODY,
                                fontSize: 11,
                                fontWeight: 700,
                                color: urgent ? "#C8272A" : "#8A96A3",
                                border: `1px solid ${urgent ? "#C8272A" : "#D8DEE6"}`,
                                borderRadius: 999,
                                padding: "1px 8px",
                              }}
                            >
                              {urgent ? "⚡ " : ""}vóór/op {dayLabel(t.date)}
                              {t.time ? ` ${t.time}` : ""}
                            </span>
                          )}
                          {(t.owner || t.pickedUpBy) && (
                            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3" }}>
                              {t.owner}
                              {t.pickedUpBy ? ` · opgepakt door ${t.pickedUpBy}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          removeTodo(t.id);
                        }}
                        style={{ background: "none", border: "none", color: "#C7CFD8", cursor: "pointer", padding: 4, flexShrink: 0 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
            </div>

            {showAddTodo ? (
              <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #EDEFF2" }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginBottom: 10, textTransform: "uppercase" }}>
                  {editingTodoId ? "Taak bewerken" : "Nieuwe taak"}
                </div>
                <input
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="Wat moet er gebeuren?"
                  style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
                />
                <div style={{ marginBottom: 10 }}>
                  <DateSelect value={newTodo.date} onChange={(v) => setNewTodo({ ...newTodo, date: v })} />
                </div>
                {newTodo.date && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                      Tijd (optioneel)
                    </div>
                    <TimeSelect value={newTodo.time} onChange={(v) => setNewTodo({ ...newTodo, time: v })} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {["Emile", "Emily", "Samen"].map((o) => {
                    const c = OWNER_COLORS[o];
                    const active = newTodo.owner === o;
                    return (
                      <button
                        key={o}
                        onClick={() => setNewTodo({ ...newTodo, owner: o })}
                        style={{
                          fontFamily: FONT_BODY,
                          fontWeight: 600,
                          fontSize: 12,
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: active ? "none" : "1px solid #D8DEE6",
                          background: active ? c.bg : "#fff",
                          color: active ? c.text : "#5C6B7A",
                          cursor: "pointer",
                        }}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                  Status
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
                  {STATUS_ORDER.map((s) => {
                    const meta = STATUS_META[s];
                    const active = newTodo.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() =>
                          setNewTodo({
                            ...newTodo,
                            status: s,
                            pickedUpBy: s === "bezig" && !newTodo.pickedUpBy ? user : newTodo.pickedUpBy,
                          })
                        }
                        style={{
                          flexShrink: 0,
                          fontFamily: FONT_BODY,
                          fontWeight: 600,
                          fontSize: 12,
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: active ? "none" : `1px solid ${meta.color}`,
                          background: active ? meta.color : "#fff",
                          color: active ? "#fff" : meta.color,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                {newTodo.status !== "te_doen" && (
                  <>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                      Opgepakt door
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {["", "Emile", "Emily"].map((p) => {
                        const active = (newTodo.pickedUpBy || "") === p;
                        const c = p ? OWNER_COLORS[p] : null;
                        return (
                          <button
                            key={p || "niemand"}
                            onClick={() => setNewTodo({ ...newTodo, pickedUpBy: p })}
                            style={{
                              fontFamily: FONT_BODY,
                              fontWeight: 600,
                              fontSize: 12,
                              padding: "7px 12px",
                              borderRadius: 999,
                              border: active ? "none" : "1px solid #D8DEE6",
                              background: active ? (c ? c.bg : "#5C6B7A") : "#fff",
                              color: active ? "#fff" : "#5C6B7A",
                              cursor: "pointer",
                            }}
                          >
                            {p || "Niemand"}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                {!newTodo.title.trim() && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#C8272A", marginBottom: 8 }}>
                    Vul een omschrijving in om op te slaan.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={saveTodo}
                    disabled={!newTodo.title.trim()}
                    style={{
                      ...smallBtn,
                      background: theme.bg,
                      flex: 1,
                      opacity: !newTodo.title.trim() ? 0.5 : 1,
                      cursor: !newTodo.title.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {editingTodoId ? "Wijzigingen opslaan" : "Taak opslaan"}
                  </button>
                  <button
                    onClick={closeTodoForm}
                    style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}
                  >
                    Annuleren
                  </button>
                </div>
                {editingTodoId && (
                  <button
                    onClick={() => removeTodo(editingTodoId)}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: "#C8272A",
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 6,
                    }}
                  >
                    Taak verwijderen
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={openAddTodo}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px dashed #B8C2CC",
                  background: "#fff",
                  color: "#5C6B7A",
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={15} /> Taak toevoegen
              </button>
            )}
          </>
        )}

        {tab === "agenda" && (
          <>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
              {["Alles", "Emile", "Emily", "Samen"].map((f) => {
                const c = f === "Alles" ? { bg: "#0F2A4A", text: "#fff" } : OWNER_COLORS[f];
                const active = agendaFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setAgendaFilter(f)}
                    style={{
                      flexShrink: 0,
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: active ? "none" : "1px solid #D8DEE6",
                      background: active ? c.bg : "#fff",
                      color: active ? c.text : "#5C6B7A",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 2, background: "#EDEFF2", borderRadius: 10, padding: 3 }}>
                {["dag", "week", "maand"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAgendaView(v)}
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: agendaView === v ? "#fff" : "transparent",
                      color: agendaView === v ? "#0F2A4A" : "#8A96A3",
                      textTransform: "capitalize",
                      boxShadow: agendaView === v ? "0 1px 3px rgba(15,42,74,0.15)" : "none",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: "#8A96A3", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Importeren
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,.vcf,text/calendar,text/vcard,text/x-vcard"
                  onChange={handleICSFile}
                  style={{ display: "none" }}
                />
                <button
                  onClick={goToday}
                  style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: theme.bg, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Vandaag
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 14 }}>
              <button onClick={() => shiftCursor(-1)} style={navArrow}>‹</button>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: "#0F2A4A", textTransform: "capitalize", minWidth: 0, textAlign: "center" }}>
                {periodLabel}
              </div>
              <button onClick={() => shiftCursor(1)} style={navArrow}>›</button>
            </div>

                {agendaView === "dag" && (
                  <DayList
                    dateISO={cursorDate}
                    items={getDayItems(cursorDate)}
                    onRemove={removeEvent}
                    onEdit={openEditEvent}
                    onEditBirthday={openEditBirthday}
                    onRequestRemove={requestRemoveEvent}
                    onAdd={() => openAddEvent(cursorDate)}
                  />
                )}

                {agendaView === "week" &&
                  Array.from({ length: 7 }, (_, i) => toISO(addDays(startOfWeek(cursorD), i))).map((iso) => {
                    const dayItems = getDayItems(iso);
                    const allDayItems = dayItems.filter((e) => e.isBirthday || e.allDay);
                    const timedItems = dayItems.filter((e) => !e.isBirthday && !e.allDay);
                    return (
                      <div key={iso} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                            {dayLabel(iso)}
                          </div>
                          <button
                            onClick={() => openAddEvent(iso)}
                            style={{ background: "none", border: "none", color: "#B8C2CC", cursor: "pointer", padding: 2 }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {dayItems.length === 0 ? (
                          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#C7CFD8", paddingLeft: 2 }}>—</div>
                        ) : (
                          <>
                            {allDayItems.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: timedItems.length > 0 ? 6 : 0 }}>
                                {allDayItems.map((e) => (
                                  <AllDayChip key={e.id} e={e} onEdit={openEditEvent} onEditBirthday={openEditBirthday} />
                                ))}
                              </div>
                            )}
                            {timedItems.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {timedItems.map((e) => (
                                  <EventRow key={e.id} e={e} onRemove={removeEvent} onEdit={openEditEvent} onEditBirthday={openEditBirthday} onRequestRemove={requestRemoveEvent} />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                {agendaView === "maand" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
                      {WEEKDAYS_SHORT.map((w) => (
                        <div key={w} style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#A6AEB8", fontWeight: 600, textAlign: "center", padding: "4px 0" }}>
                          {w}
                        </div>
                      ))}
                    </div>
                    {monthGrid(cursorD).map((week, wi) => (
                      <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                        {week.map((d) => {
                          const iso = toISO(d);
                          const inMonth = d.getMonth() === cursorD.getMonth();
                          const isToday = iso === toISO(new Date());
                          const isSelected = iso === selectedDay;
                          const dayItems = getDayItems(iso);
                          const owners = [...new Set(dayItems.filter((e) => !e.isBirthday && !e.isHoliday).map((e) => e.owner))];
                          const hasBirthday = dayItems.some((e) => e.isBirthday);
                          const hasHoliday = dayItems.some((e) => e.isHoliday);
                          return (
                            <button
                              key={iso}
                              onClick={() => setSelectedDay(iso)}
                              style={{
                                border: "none",
                                background: isSelected ? theme.bg : "transparent",
                                borderRadius: 10,
                                padding: "7px 0 5px",
                                margin: 1,
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: FONT_BODY,
                                  fontSize: 13,
                                  fontWeight: isToday ? 700 : 500,
                                  color: isSelected ? "#fff" : inMonth ? (isToday ? theme.bg : "#1E2A38") : "#C7CFD8",
                                }}
                              >
                                {d.getDate()}
                              </span>
                              <span style={{ display: "flex", gap: 2, height: 4 }}>
                                {hasBirthday && (
                                  <span
                                    style={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: 999,
                                      background: isSelected ? "#fff" : BIRTHDAY_COLOR.bg,
                                    }}
                                  />
                                )}
                                {hasHoliday && (
                                  <span
                                    style={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: 999,
                                      background: isSelected ? "#fff" : HOLIDAY_COLOR.bg,
                                    }}
                                  />
                                )}
                                {owners.slice(0, 3).map((o) => (
                                  <span
                                    key={o}
                                    style={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: 999,
                                      background: isSelected ? "#fff" : (OWNER_COLORS[o] || OWNER_COLORS.Samen).bg,
                                    }}
                                  />
                                ))}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}

                    <div style={{ marginTop: 16 }}>
                      <DayList
                        dateISO={selectedDay}
                        items={getDayItems(selectedDay)}
                        onRemove={removeEvent}
                        onEdit={openEditEvent}
                        onEditBirthday={openEditBirthday}
                        onRequestRemove={requestRemoveEvent}
                        onAdd={() => openAddEvent(selectedDay)}
                      />
                    </div>
                  </>
                )}

            {showAddEvent ? (
              <div
                onClick={closeEventForm}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15,42,74,0.45)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  zIndex: 30,
                  padding: 16,
                }}
              >
              <div
                onClick={(ev) => ev.stopPropagation()}
                style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #EDEFF2", width: "100%", maxHeight: "88%", overflowY: "auto", boxShadow: "0 -12px 40px rgba(15,42,74,0.3)" }}
              >
                {editingId || editingBirthdayId ? (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", fontWeight: 600, letterSpacing: 0.3, marginBottom: 12, textTransform: "uppercase" }}>
                    {eventFormType === "afspraak" ? "Afspraak bewerken" : "Verjaardag bewerken"}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
                    {[
                      { key: "afspraak", label: "Nieuwe afspraak" },
                      { key: "verjaardag", label: "Verjaardag" },
                    ].map((t) => {
                      const active = eventFormType === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setEventFormType(t.key)}
                          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              border: active ? `5px solid ${theme.bg}` : "2px solid #C7CFD8",
                              background: "#fff",
                              boxSizing: "border-box",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: active ? "#1E2A38" : "#8A96A3" }}>
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {eventFormType === "afspraak" ? (
                  <>
                    <input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Wat staat er te gebeuren?"
                      style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
                    />
                    <div style={{ marginBottom: 10 }}>
                      <DateSelect value={newEvent.date} onChange={(v) => setNewEvent({ ...newEvent, date: v })} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                        T/m (optioneel, voor meerdaagse afspraken zoals vakanties)
                      </div>
                      <DateSelect value={newEvent.endDate} onChange={(v) => setNewEvent({ ...newEvent, endDate: v })} />
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, allDay: !newEvent.allDay })}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: newEvent.allDay ? "none" : "2px solid #C7CFD8",
                          background: newEvent.allDay ? theme.bg : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {newEvent.allDay && <Check size={13} color="#fff" strokeWidth={3} />}
                      </button>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#1E2A38" }}>Hele dag</span>
                    </label>

                    {!newEvent.allDay && (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                            Begintijd
                          </div>
                          <TimeSelect value={newEvent.time} onChange={(v) => setNewEvent({ ...newEvent, time: v })} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                            Eindtijd
                          </div>
                          <TimeSelect value={newEvent.endTime} onChange={(v) => setNewEvent({ ...newEvent, endTime: v })} />
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {["Emile", "Emily", "Samen"].map((o) => {
                        const c = OWNER_COLORS[o];
                        const active = newEvent.owner === o;
                        return (
                          <button
                            key={o}
                            onClick={() => setNewEvent({ ...newEvent, owner: o })}
                            style={{
                              fontFamily: FONT_BODY,
                              fontWeight: 600,
                              fontSize: 12,
                              padding: "7px 12px",
                              borderRadius: 999,
                              border: active ? "none" : "1px solid #D8DEE6",
                              background: active ? c.bg : "#fff",
                              color: active ? c.text : "#5C6B7A",
                              cursor: "pointer",
                            }}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 4 }}>
                      Herhalen
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
                      {[
                        { key: "none", label: "Niet herhalen" },
                        { key: "week", label: "Wekelijks" },
                        { key: "2week", label: "Elke 2 weken" },
                        { key: "4week", label: "Elke 4 weken" },
                        { key: "month", label: "Maandelijks" },
                      ].map((r) => {
                        const active = (newEvent.repeat || "none") === r.key;
                        return (
                          <button
                            key={r.key}
                            onClick={() => setNewEvent({ ...newEvent, repeat: r.key })}
                            style={{
                              flexShrink: 0,
                              fontFamily: FONT_BODY,
                              fontWeight: 600,
                              fontSize: 12,
                              padding: "7px 12px",
                              borderRadius: 999,
                              border: active ? "none" : "1px solid #D8DEE6",
                              background: active ? "#0F2A4A" : "#fff",
                              color: active ? "#fff" : "#5C6B7A",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={newEvent.notes}
                      onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                      placeholder="Notities (optioneel)"
                      rows={3}
                      style={{ ...inputStyle, width: "100%", marginBottom: 10, resize: "vertical", fontFamily: FONT_BODY }}
                    />

                    {!newEvent.title.trim() && (
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#C8272A", marginBottom: 8 }}>
                        Vul een titel in om op te slaan.
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={saveEvent}
                        disabled={!newEvent.title.trim() || !newEvent.date}
                        style={{
                          ...smallBtn,
                          background: theme.bg,
                          flex: 1,
                          opacity: !newEvent.title.trim() || !newEvent.date ? 0.5 : 1,
                          cursor: !newEvent.title.trim() || !newEvent.date ? "not-allowed" : "pointer",
                        }}
                      >
                        {editingId ? "Wijzigingen opslaan" : "Afspraak opslaan"}
                      </button>
                      <button
                        onClick={closeEventForm}
                        style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}
                      >
                        Annuleren
                      </button>
                    </div>
                    {editingId && (
                      <>
                        {newEvent.repeat !== "none" && confirmDeleteChoice ? (
                          <div style={{ marginTop: 8, background: "#FFF4F0", border: "1px solid #F3C9BC", borderRadius: 10, padding: 10 }}>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A3B1F", marginBottom: 8 }}>
                              Dit is een herhalende afspraak. Wat wil je verwijderen?
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => removeEventOccurrence(editingId, deleteTargetDate)}
                                style={{ ...smallBtn, background: "#C8272A", flex: 1, fontSize: 12, padding: "8px 10px" }}
                              >
                                Alleen deze
                              </button>
                              <button
                                onClick={() => removeEvent(editingId)}
                                style={{ ...smallBtn, background: "#C8272A", flex: 1, fontSize: 12, padding: "8px 10px" }}
                              >
                                Hele reeks
                              </button>
                              <button
                                onClick={() => setConfirmDeleteChoice(false)}
                                style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6", fontSize: 12, padding: "8px 10px" }}
                              >
                                Annuleren
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => (newEvent.repeat !== "none" ? setConfirmDeleteChoice(true) : removeEvent(editingId))}
                            style={{
                              marginTop: 8,
                              width: "100%",
                              background: "none",
                              border: "none",
                              color: "#C8272A",
                              fontFamily: FONT_BODY,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: 6,
                            }}
                          >
                            Afspraak verwijderen
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      value={newBirthday.name}
                      onChange={(e) => setNewBirthday({ ...newBirthday, name: e.target.value })}
                      placeholder="Naam"
                      style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <select
                        value={newBirthday.day}
                        onChange={(e) => setNewBirthday({ ...newBirthday, day: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                      >
                        <option value="" disabled>
                          Dag
                        </option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <select
                        value={newBirthday.month}
                        onChange={(e) => setNewBirthday({ ...newBirthday, month: e.target.value })}
                        style={{ ...inputStyle, flex: 1.4 }}
                      >
                        <option value="" disabled>
                          Maand
                        </option>
                        {MONTHS_FULL.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        value={newBirthday.year}
                        onChange={(e) => setNewBirthday({ ...newBirthday, year: e.target.value.replace(/\D/g, "") })}
                        placeholder="Jaar"
                        inputMode="numeric"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    {!newBirthday.name.trim() && (
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#C8272A", marginBottom: 8 }}>
                        Vul een naam in om op te slaan.
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={saveBirthday}
                        disabled={!newBirthday.name.trim() || !newBirthday.day || !newBirthday.month}
                        style={{
                          ...smallBtn,
                          flex: 1,
                          background: "#D9A02A",
                          opacity: !newBirthday.name.trim() || !newBirthday.day || !newBirthday.month ? 0.5 : 1,
                          cursor: !newBirthday.name.trim() || !newBirthday.day || !newBirthday.month ? "not-allowed" : "pointer",
                        }}
                      >
                        {editingBirthdayId ? "Wijzigingen opslaan" : "Verjaardag opslaan"}
                      </button>
                      <button
                        onClick={closeEventForm}
                        style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}
                      >
                        Annuleren
                      </button>
                    </div>
                    {editingBirthdayId && (
                      <button
                        onClick={() => removeBirthday(editingBirthdayId)}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          background: "none",
                          border: "none",
                          color: "#C8272A",
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 6,
                        }}
                      >
                        Verjaardag verwijderen
                      </button>
                    )}
                  </>
                )}
              </div>
              </div>
            ) : (
              <button
                onClick={() => openAddEvent(agendaView === "maand" ? selectedDay : cursorDate)}
                style={{
                  marginTop: 14,
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px dashed #B8C2CC",
                  background: "#fff",
                  color: "#5C6B7A",
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={15} /> Afspraak toevoegen
              </button>
            )}
          </>
        )}
      </div>

      {tab === "boodschappen" && (
        <div style={{ position: "absolute", bottom: 62, left: 12, right: 12 }}>
          <div style={{ display: "flex", gap: 8, background: "#fff", padding: 8, borderRadius: 14, boxShadow: "0 -2px 12px rgba(15,42,74,0.10)" }}>
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder={`Toevoegen aan ${activeStore}...`}
              style={{ ...inputStyle, flex: 1, border: "none", background: "#F4F6F8" }}
            />
            <button onClick={addItem} style={{ ...smallBtn, background: theme.bg, width: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}

      <div style={tabBar}>
        <button
          onClick={() => setTab("home")}
          style={tabBtn(tab === "home", theme.bg)}
        >
          <Home size={16} />
          <span>Home</span>
        </button>
        <button
          onClick={() => setTab("boodschappen")}
          style={tabBtn(tab === "boodschappen", theme.bg)}
        >
          <ShoppingCart size={16} />
          <span>Boodschappen</span>
        </button>
        <button
          onClick={() => setTab("klantkaarten")}
          style={tabBtn(tab === "klantkaarten", theme.bg)}
        >
          <CreditCard size={16} />
          <span>Klantkaarten</span>
        </button>
        <button
          onClick={() => setTab("agenda")}
          style={tabBtn(tab === "agenda", theme.bg)}
        >
          <Calendar size={16} />
          <span>Agenda</span>
        </button>
        <button
          onClick={() => setTab("taken")}
          style={tabBtn(tab === "taken", theme.bg)}
        >
          <ListChecks size={16} />
          <span>Taken</span>
        </button>
      </div>

      {openCardId &&
        (() => {
          const c = data.cards.find((x) => x.id === openCardId);
          if (!c) return null;
          return (
            <div
              onClick={() => setOpenCardId(null)}
              style={{
                position: "absolute",
                inset: 0,
                background: c.color,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
                zIndex: 20,
              }}
            >
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  setOpenCardId(null);
                }}
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: "#fff", marginBottom: 6, textAlign: "center" }}>
                {c.store}
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 17, letterSpacing: 2, color: "#fff", opacity: 0.9, marginBottom: 28 }}>
                {c.number}
              </div>
              <div
                onClick={(ev) => ev.stopPropagation()}
                style={{ background: "#fff", borderRadius: 12, padding: "18px 16px", width: "100%", cursor: "default" }}
              >
                <Barcode128 value={c.number} height={90} />
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 24 }}>
                Tik ergens om te sluiten
              </div>
            </div>
          );
        })()}

      {showImport && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#F4F6F8",
            display: "flex",
            flexDirection: "column",
            zIndex: 30,
          }}
        >
          <div style={{ padding: "20px 18px 12px", borderBottom: "1px solid #EDEFF2", background: "#fff" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: "#0F2A4A", marginBottom: 4 }}>
              Agenda importeren
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3" }}>
              {importFileName} · {importParsed.length} items gevonden
            </div>
          </div>

          <div style={{ padding: "12px 18px", background: "#fff", borderBottom: "1px solid #EDEFF2" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#8A96A3", fontWeight: 600, marginBottom: 6 }}>
              Toewijzen aan
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Emile", "Emily", "Samen"].map((o) => {
                const c = OWNER_COLORS[o];
                const active = importOwner === o;
                return (
                  <button
                    key={o}
                    onClick={() => setImportOwner(o)}
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: 12,
                      padding: "7px 12px",
                      borderRadius: 999,
                      border: active ? "none" : "1px solid #D8DEE6",
                      background: active ? c.bg : "#fff",
                      color: active ? c.text : "#5C6B7A",
                      cursor: "pointer",
                    }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
            {importParsed.length === 0 ? (
              <div style={{ fontFamily: FONT_BODY, color: "#A6AEB8", fontSize: 14, padding: "24px 4px" }}>
                Geen afspraken gevonden in dit bestand.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {importParsed.map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      background: "#fff",
                      borderRadius: 12,
                      padding: "10px 12px",
                      border: "1px solid #EDEFF2",
                    }}
                  >
                    <button
                      onClick={() => setImportSelected({ ...importSelected, [i]: !importSelected[i] })}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: importSelected[i] ? "none" : "2px solid #C7CFD8",
                        background: importSelected[i] ? theme.bg : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {importSelected[i] && <Check size={13} color="#fff" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#1E2A38", fontWeight: 500 }}>{ev.title}</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8A96A3", marginTop: 2 }}>
                        {ev.date.startsWith("1604-")
                          ? `${Number(ev.date.slice(8, 10))} ${MONTHS_FULL[Number(ev.date.slice(5, 7)) - 1]}`
                          : dayLabel(ev.date)}
                        {ev.allDay ? " · hele dag" : ev.time ? ` · ${ev.time}` : ""}
                        {ev.repeat !== "none" ? ` · ${REPEAT_LABELS[ev.repeat]}` : ""}
                      </div>
                      {importMode !== "holidays" && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          {[
                            { key: "afspraak", label: "Afspraak" },
                            { key: "verjaardag", label: "Verjaardag" },
                          ].map((t) => {
                            const active = importAsType[i] === t.key;
                            return (
                              <button
                                key={t.key}
                                onClick={() => setImportAsType({ ...importAsType, [i]: t.key })}
                                style={{
                                  fontFamily: FONT_BODY,
                                  fontWeight: 600,
                                  fontSize: 11,
                                  padding: "3px 9px",
                                  borderRadius: 999,
                                  border: active ? "none" : "1px solid #D8DEE6",
                                  background: active ? (t.key === "verjaardag" ? BIRTHDAY_COLOR.bg : theme.bg) : "#fff",
                                  color: active ? "#fff" : "#8A96A3",
                                  cursor: "pointer",
                                }}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "12px 18px 20px", background: "#fff", borderTop: "1px solid #EDEFF2", display: "flex", gap: 8 }}>
            <button
              onClick={confirmImport}
              style={{ ...smallBtn, background: theme.bg, flex: 1 }}
            >
              {Object.values(importSelected).filter(Boolean).length} items importeren
            </button>
            <button onClick={cancelImport} style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6" }}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {confirmRemoveEvent && (
        <div
          onClick={() => setConfirmRemoveEvent(null)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,42,74,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: 24,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 320, boxShadow: "0 12px 40px rgba(15,42,74,0.3)" }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: "#0F2A4A", marginBottom: 6 }}>
              Afspraak verwijderen?
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#5C6B7A", marginBottom: 18 }}>
              Weet je zeker dat je "{confirmRemoveEvent.title}" wilt verwijderen?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmRemoveNow} style={{ ...smallBtn, background: "#C8272A", flex: 1 }}>
                Verwijderen
              </button>
              <button
                onClick={() => setConfirmRemoveEvent(null)}
                style={{ ...smallBtn, background: "#fff", color: "#5C6B7A", border: "1px solid #D8DEE6", flex: 1 }}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const shell = {
  width: "100%",
  maxWidth: 420,
  height: "100dvh",
  margin: "0 auto",
  background: "#F4F6F8",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
  fontFamily: FONT_BODY,
};

const header = {
  background: "linear-gradient(135deg, #0F2A4A, #00539B)",
  padding: "20px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const tabBar = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 62,
  background: "#fff",
  borderTop: "1px solid #EDEFF2",
  display: "flex",
};

const tabBtn = (active, themeColor = "#00539B") => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  background: "none",
  border: "none",
  color: active ? themeColor : "#A6AEB8",
  fontFamily: FONT_BODY,
  fontSize: 9.5,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  padding: "0 2px",
});

const inputStyle = {
  fontFamily: FONT_BODY,
  fontSize: 14,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D8DEE6",
  outline: "none",
  boxSizing: "border-box",
};

const smallBtn = {
  fontFamily: FONT_BODY,
  fontWeight: 600,
  fontSize: 13,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#00539B",
  color: "#fff",
  cursor: "pointer",
};

const navArrow = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid #D8DEE6",
  background: "#fff",
  color: "#5C6B7A",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
