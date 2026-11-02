// 앱 팝업의 링크는 언어 공통이라 모두 /event/로 들어온다
(function () {
  try {
    if (location.protocol === "file:" || /bot|crawl|spider|slurp|yeti|daum\/|lighthouse|headless|facebookexternalhit|kakaotalk-scrap|embedly|preview/i.test(navigator.userAgent)) return;
    var to = localStorage.getItem("jamit-lang");
    if (to !== "ko" && to !== "en" && to !== "ja") {
      var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
      to = langs.some(function (l) { return /^ko\b/i.test(l); }) ? "ko" : /^ja\b/i.test(langs[0]) ? "ja" : "en";
    }
    if (to !== "ko") location.replace("/" + to + "/event/" + location.search + location.hash);
  } catch (e) {}
})();
