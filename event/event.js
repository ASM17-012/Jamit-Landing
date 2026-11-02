const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "https://api-stg.jamit.kr"
  : "https://api.jamit.kr";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const LANG = ["en", "ja"].includes(document.documentElement.lang) ? document.documentElement.lang : "ko";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 서버가 주는 악기 이름은 요청 언어와 무관하게 한국어라 en·ja에서는 쓰지 않는다
const TEXT = {
  ko: {
    status: { PENDING: "심사 중", APPROVED: "확정", REJECTED: "반려" },
    length: "닉네임은 1~12자예요.",
    retry: "잠시 뒤에 다시 시도해 주세요.",
    errors: {
      RF_001: "지금 진행 중인 응모권 이벤트가 없어요.",
      RF_002: "그 닉네임을 찾을 수 없어요. 앱 프로필의 닉네임을 그대로 넣어 주세요(대소문자 구분).",
      RF_003: "조회가 너무 잦아요. 1분 뒤에 다시 해 주세요.",
      RF_014: "지금은 응모권 확인을 잠시 닫았어요.",
    },
    notReviewed: "추첨 전 심사 못 함",
    kind: (t) => (t.targetType === "TRACK" ? (t.instrument ? t.instrument + " " : "") + "연주" : "잇츠"),
    untitled: "제목 없음",
    date: (m, d, time) => m + "월 " + d + "일 " + time,
    eligible: (pending, when) => (pending ? "확정되면 " : "") + when + "부터 추첨 대상이에요",
    none: (drawn) => (drawn ? "응모권이 없어요" : "아직 응모권이 없어요"),
    approved: (n) => "확정 " + n + "장",
    pending: (n) => "심사 중 " + n + "장",
    rejected: (n) => "반려 " + n + "장",
    period: (from, to) => "응모 기간 " + from + " ~ " + to,
    loading: "조회 중…",
    again: "다시 조회",
  },
  en: {
    status: { PENDING: "Under review", APPROVED: "Confirmed", REJECTED: "Rejected" },
    length: "Enter a nickname of 1–12 characters.",
    retry: "Please try again in a moment.",
    errors: {
      RF_001: "There’s no raffle event running right now.",
      RF_002: "We couldn’t find that nickname. Enter it exactly as it appears on your profile in the app (case-sensitive).",
      RF_003: "Too many lookups. Please try again in a minute.",
      RF_014: "Ticket lookup is paused for now.",
    },
    notReviewed: "Not reviewed before the draw",
    kind: (t) => (t.targetType === "TRACK" ? "Track" : "Its"),
    untitled: "Untitled",
    date: (m, d, time) => MONTHS[m - 1] + " " + d + ", " + time,
    eligible: (pending, when) => (pending ? "Once confirmed, eligible for the draw from " : "Eligible for the draw from ") + when + " (KST)",
    none: (drawn) => (drawn ? "No tickets" : "No tickets yet"),
    approved: (n) => n + " confirmed",
    pending: (n) => n + " under review",
    rejected: (n) => n + " rejected",
    period: (from, to) => "Entry period: " + from + " – " + to + " (KST)",
    loading: "Checking…",
    again: "Check again",
  },
  ja: {
    status: { PENDING: "審査中", APPROVED: "確定", REJECTED: "不承認" },
    length: "ニックネームは1〜12文字です。",
    retry: "しばらくしてからもう一度お試しください。",
    errors: {
      RF_001: "現在開催中の応募券イベントはありません。",
      RF_002: "そのニックネームが見つかりません。アプリのプロフィールに表示されているニックネームをそのまま入力してください（大文字・小文字を区別します）。",
      RF_003: "確認の回数が多すぎます。1分後にもう一度お試しください。",
      RF_014: "応募券の確認は一時的に停止しています。",
    },
    notReviewed: "審査が間に合わず",
    kind: (t) => (t.targetType === "TRACK" ? "トラック" : "Its"),
    untitled: "タイトルなし",
    date: (m, d, time) => m + "月" + d + "日 " + time,
    eligible: (pending, when) => (pending ? "確定すれば、" : "") + when + "（韓国時間）から抽選対象になります",
    none: (drawn) => (drawn ? "応募券はありません" : "まだ応募券はありません"),
    approved: (n) => "確定 " + n + "枚",
    pending: (n) => "審査中 " + n + "枚",
    rejected: (n) => "不承認 " + n + "枚",
    period: (from, to) => "応募期間（韓国時間） " + from + " 〜 " + to,
    loading: "確認中…",
    again: "もう一度確認",
  },
}[LANG];

const STATUS_CLASS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" };
const ERROR_MESSAGES = { ...TEXT.errors, GE_001: TEXT.length };

const form = document.getElementById("form");
const input = document.getElementById("nickname");
const button = document.getElementById("submit");
const message = document.getElementById("message");
const result = document.getElementById("result");
const drawnNotice = document.getElementById("drawn");
const whoName = document.getElementById("who-name");
const summary = document.getElementById("summary");
const period = document.getElementById("period");
const rule = document.getElementById("rule");
const list = document.getElementById("list");

// 오프셋 없는 문자열은 브라우저 시간대로 읽힌다. 앞 16자(분)만 쓰는 건 소수 초를 떼려는 것
const parseKst = (s) => Date.parse(s.slice(0, 16) + ":00+09:00");

const kstText = (ms) => {
  const kst = new Date(ms + KST_OFFSET_MS).toISOString();
  return TEXT.date(Number(kst.slice(5, 7)), Number(kst.slice(8, 10)), kst.slice(11, 16));
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function ticketCard(ticket, drawn) {
  const known = Object.prototype.hasOwnProperty.call(STATUS_CLASS, ticket.status);
  const status = known
    ? { label: TEXT.status[ticket.status], cls: STATUS_CLASS[ticket.status] }
    : { label: ticket.status, cls: "pending" };
  const label = ticket.status === "PENDING" && drawn ? TEXT.notReviewed : status.label;

  const card = el("li", "ticket");
  card.append(el("p", "ticket__kind", TEXT.kind(ticket)));
  card.append(el("p", "ticket__title", ticket.title || TEXT.untitled));

  const meta = el("div", "ticket__meta");
  meta.append(el("span", "ticket__time", kstText(parseKst(ticket.uploadedAt))));
  meta.append(el("span", "badge badge--" + status.cls, label));
  card.append(meta);

  if (!drawn && ticket.eligibleFrom) {
    const from = parseKst(ticket.eligibleFrom);
    if (from > Date.now()) card.append(el("p", "ticket__eligible", TEXT.eligible(ticket.status === "PENDING", kstText(from))));
  }

  if (ticket.status === "REJECTED") {
    // 반려 문장은 서버가 한국어로만 준다
    const why = el("ul", "ticket__why");
    why.lang = "ko";
    for (const reason of ticket.rejectReasons) why.append(el("li", null, reason));
    card.append(why);
  }

  return card;
}

function showMessage(text) {
  message.textContent = text;
  message.hidden = false;
  result.hidden = true;
}

function showResult(data) {
  const { event, tickets } = data;
  // 요약 줄이 라이브 영역이라 먼저 드러내야 바뀐 글을 읽어 준다
  message.hidden = true;
  result.hidden = false;

  whoName.textContent = data.nickname;
  drawnNotice.hidden = !event.drawn;
  rule.hidden = event.drawn;

  if (tickets.length === 0) {
    summary.textContent = TEXT.none(event.drawn);
  } else {
    const parts = [TEXT.approved(data.approvedCount)];
    if (!event.drawn) parts.push(TEXT.pending(data.pendingCount));
    if (data.rejectedCount > 0) parts.push(TEXT.rejected(data.rejectedCount));
    summary.textContent = parts.join(" · ");
  }

  period.textContent = TEXT.period(kstText(parseKst(event.startsAt)), kstText(parseKst(event.endsAt) - 60 * 1000));
  list.replaceChildren(...tickets.map((ticket) => ticketCard(ticket, event.drawn)));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = input.value;
  // 서버는 strip() 뒤 NFC로 세고 원문·NFC·NFD를 모두 찾는다. strip()은 trim()보다 좁아(NBSP 등)
  // 여기서 잘라 보내면 다른 닉네임이 되므로 원문을 보낸다
  const length = [...nickname.trim().normalize("NFC")].length;
  if (length < 1 || length > 12) {
    showMessage(TEXT.length);
    return;
  }

  button.disabled = true;
  button.textContent = TEXT.loading;
  try {
    const res = await fetch(API_BASE + "/api/v1/raffle/tickets?nickname=" + encodeURIComponent(nickname));
    const body = await res.json();
    if (res.ok) showResult(body.data);
    else if (Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, body.code)) showMessage(ERROR_MESSAGES[body.code]);
    else showMessage(TEXT.retry);
  } catch {
    showMessage(TEXT.retry);
  } finally {
    button.disabled = false;
    button.textContent = TEXT.again;
  }
});

document.querySelectorAll(".lang a").forEach((a) => {
  a.addEventListener("click", () => {
    try { localStorage.setItem("jamit-lang", a.lang); } catch {}
  });
});
