const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "https://api-stg.jamit.kr"
  : "https://api.jamit.kr";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const STATUS = {
  PENDING: { label: "심사 중", cls: "pending" },
  APPROVED: { label: "확정", cls: "approved" },
  REJECTED: { label: "반려", cls: "rejected" },
};

const LENGTH_MESSAGE = "닉네임은 1~12자예요.";
const RETRY_MESSAGE = "잠시 뒤에 다시 시도해 주세요.";
const ERROR_MESSAGES = {
  RF_001: "지금 진행 중인 응모권 이벤트가 없어요.",
  RF_002: "그 닉네임을 찾을 수 없어요. 앱 프로필의 닉네임을 그대로 넣어 주세요(대소문자 구분).",
  RF_003: "조회가 너무 잦아요. 1분 뒤에 다시 해 주세요.",
  RF_014: "지금은 응모권 확인을 잠시 닫았어요.",
  GE_001: LENGTH_MESSAGE,
};

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
  return Number(kst.slice(5, 7)) + "월 " + Number(kst.slice(8, 10)) + "일 " + kst.slice(11, 16);
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function isMediaUrl(url) {
  return typeof url === "string" &&
    (url.startsWith("https://media.jamit.kr/") || url.startsWith("https://media-stg.jamit.kr/"));
}

function thumb(url) {
  const frame = el("div", "ticket__thumb");
  frame.append(el("span", "ticket__play"));
  if (isMediaUrl(url)) {
    const img = el("img", "ticket__img");
    img.alt = "";
    img.addEventListener("load", () => img.classList.add("ticket__img--on"));
    img.src = url;
    frame.append(img);
  }
  return frame;
}

function ticketCard(ticket, drawn) {
  const status = Object.prototype.hasOwnProperty.call(STATUS, ticket.status)
    ? STATUS[ticket.status]
    : { label: ticket.status, cls: "pending" };
  const isTrack = ticket.targetType === "TRACK";
  const label = ticket.status === "PENDING" && drawn ? "추첨 전 심사 못 함" : status.label;

  const card = el("li", "ticket");
  if (!isTrack) card.append(thumb(ticket.thumbnailUrl));

  const body = el("div", "ticket__body");
  if (isTrack) body.append(el("p", "ticket__kind", (ticket.instrument ? ticket.instrument + " " : "") + "연주"));
  body.append(el("p", "ticket__title", ticket.title || "제목 없음"));

  const meta = el("div", "ticket__meta");
  meta.append(el("span", "ticket__time", kstText(parseKst(ticket.uploadedAt))));
  meta.append(el("span", "badge badge--" + status.cls, label));
  body.append(meta);

  if (!drawn && ticket.eligibleFrom) {
    const from = parseKst(ticket.eligibleFrom);
    const prefix = ticket.status === "PENDING" ? "확정되면 " : "";
    if (from > Date.now()) body.append(el("p", "ticket__eligible", prefix + kstText(from) + "부터 추첨 대상이에요"));
  }

  if (ticket.status === "REJECTED") {
    const why = el("ul", "ticket__why");
    for (const reason of ticket.rejectReasons) why.append(el("li", null, reason));
    body.append(why);
  }

  card.append(body);
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
    summary.textContent = event.drawn ? "응모권이 없어요" : "아직 응모권이 없어요";
  } else {
    const parts = ["확정 " + data.approvedCount + "장"];
    if (!event.drawn) parts.push("심사 중 " + data.pendingCount + "장");
    if (data.rejectedCount > 0) parts.push("반려 " + data.rejectedCount + "장");
    summary.textContent = parts.join(" · ");
  }

  period.textContent = "응모 기간 " + kstText(parseKst(event.startsAt)) + " ~ " + kstText(parseKst(event.endsAt) - 60 * 1000);
  list.replaceChildren(...tickets.map((ticket) => ticketCard(ticket, event.drawn)));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = input.value;
  // 서버는 strip() 뒤 NFC로 세고 원문·NFC·NFD를 모두 찾는다. strip()은 trim()보다 좁아(NBSP 등)
  // 여기서 잘라 보내면 다른 닉네임이 되므로 원문을 보낸다
  const length = [...nickname.trim().normalize("NFC")].length;
  if (length < 1 || length > 12) {
    showMessage(LENGTH_MESSAGE);
    return;
  }

  button.disabled = true;
  button.textContent = "조회 중…";
  try {
    const res = await fetch(API_BASE + "/api/v1/raffle/tickets?nickname=" + encodeURIComponent(nickname));
    const body = await res.json();
    if (res.ok) showResult(body.data);
    else if (Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, body.code)) showMessage(ERROR_MESSAGES[body.code]);
    else showMessage(RETRY_MESSAGE);
  } catch {
    showMessage(RETRY_MESSAGE);
  } finally {
    button.disabled = false;
    button.textContent = "다시 조회";
  }
});
