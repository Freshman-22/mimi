// 한국 사용자를 위한 한글 발음 표기: 번역 서비스가 주는 로마자(일본어)·병음(중국어)을 한글로 바꾼다.
// 따라 말하기용이라 실제 소리에 가깝게 적는다 (예: Toire wa doko desu ka → 토이레 와 도코 데스 카).
(function () {
  const BASE = 0xac00;
  // 초성·중성·종성 번호 (유니코드 한글 조합 순서)
  const CHO = { "ㄱ": 0, "ㄲ": 1, "ㄴ": 2, "ㄷ": 3, "ㄸ": 4, "ㄹ": 5, "ㅁ": 6, "ㅂ": 7, "ㅃ": 8, "ㅅ": 9, "ㅆ": 10, "ㅇ": 11, "ㅈ": 12, "ㅉ": 13, "ㅊ": 14, "ㅋ": 15, "ㅌ": 16, "ㅍ": 17, "ㅎ": 18 };
  const JUNG = { "ㅏ": 0, "ㅑ": 2, "ㅓ": 4, "ㅔ": 5, "ㅕ": 6, "ㅖ": 7, "ㅗ": 8, "ㅘ": 9, "ㅛ": 12, "ㅜ": 13, "ㅝ": 14, "ㅞ": 15, "ㅟ": 16, "ㅠ": 17, "ㅡ": 18, "ㅣ": 20 };
  const JONG = { "": 0, "ㄴ": 4, "ㄹ": 8, "ㅅ": 19, "ㅇ": 21 };
  const syl = (cho, jung, jong = "") => String.fromCharCode(BASE + (CHO[cho] * 21 + JUNG[jung]) * 28 + JONG[jong]);

  // 앞 글자에 받침을 붙인다 (っ → ㅅ, ん → ㄴ). 붙일 수 없으면 받침 글자를 그대로 둔다
  function addFinal(out, jong) {
    const code = out.charCodeAt(out.length - 1);
    if (code >= BASE && code <= 0xd7a3 && (code - BASE) % 28 === 0) {
      return out.slice(0, -1) + String.fromCharCode(code + JONG[jong]);
    }
    return out + (jong === "ㄴ" ? "응" : "");
  }
  const stripMarks = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  /* ---------- 일본어: 헵번식 로마자 → 한글 ---------- */
  const JA = {
    a: "아", i: "이", u: "우", e: "에", o: "오",
    ka: "카", ki: "키", ku: "쿠", ke: "케", ko: "코", ga: "가", gi: "기", gu: "구", ge: "게", go: "고",
    sa: "사", shi: "시", si: "시", su: "스", se: "세", so: "소", za: "자", ji: "지", zi: "지", zu: "즈", ze: "제", zo: "조",
    ta: "타", chi: "치", ti: "티", tsu: "츠", tu: "투", te: "테", to: "토", da: "다", di: "디", du: "두", de: "데", do: "도",
    na: "나", ni: "니", nu: "누", ne: "네", no: "노", ha: "하", hi: "히", fu: "후", hu: "후", he: "헤", ho: "호",
    ba: "바", bi: "비", bu: "부", be: "베", bo: "보", pa: "파", pi: "피", pu: "푸", pe: "페", po: "포",
    ma: "마", mi: "미", mu: "무", me: "메", mo: "모", ya: "야", yu: "유", yo: "요", ye: "예",
    ra: "라", ri: "리", ru: "루", re: "레", ro: "로", wa: "와", wo: "오", wi: "위", we: "웨",
    kya: "캬", kyu: "큐", kyo: "쿄", gya: "갸", gyu: "규", gyo: "교", sha: "샤", shu: "슈", sho: "쇼", she: "셰",
    ja: "자", ju: "주", jo: "조", je: "제", cha: "차", chu: "추", cho: "초", che: "체", nya: "냐", nyu: "뉴", nyo: "뇨",
    hya: "햐", hyu: "휴", hyo: "효", bya: "뱌", byu: "뷰", byo: "뵤", pya: "퍄", pyu: "퓨", pyo: "표",
    mya: "먀", myu: "뮤", myo: "묘", rya: "랴", ryu: "류", ryo: "료", fa: "파", fi: "피", fe: "페", fo: "포", va: "바", vu: "부", tsa: "차",
  };
  function japanese(romaji) {
    const w = stripMarks(romaji).toLowerCase();
    let out = "", i = 0;
    while (i < w.length) {
      const c = w[i], next = w[i + 1] || "";
      if (!/[a-z]/.test(c)) { out += c === "'" ? "" : c; i++; continue; }
      // ん: 모음·y가 이어지지 않는 n
      if (c === "n" && !/[aiueoy]/.test(next)) { out = addFinal(out, "ㄴ"); i++; continue; }
      // っ: 같은 자음이 겹치거나 tch
      if (/[bcdfghjkmprstwz]/.test(c) && (next === c || (c === "t" && next === "c" && w[i + 2] === "h"))) {
        out = addFinal(out, "ㅅ"); i++; continue;
      }
      const m = [3, 2, 1].map((n) => w.substr(i, n)).find((s) => JA[s]);
      if (m) { out += JA[m]; i += m.length; } else { out += c; i++; }
    }
    return out;
  }

  /* ---------- 중국어: 병음 → 한글 ---------- */
  const INITIAL = { b: "ㅂ", p: "ㅍ", m: "ㅁ", f: "ㅍ", d: "ㄷ", t: "ㅌ", n: "ㄴ", l: "ㄹ", g: "ㄱ", k: "ㅋ", h: "ㅎ",
                    j: "ㅈ", q: "ㅊ", x: "ㅅ", zh: "ㅈ", ch: "ㅊ", sh: "ㅅ", r: "ㄹ", z: "ㅉ", c: "ㅊ", s: "ㅆ", "": "ㅇ" };
  // 운모 → [중성, 받침] 음절들 (첫 음절에 성모를 붙이고, 이어지는 음절은 ㅇ으로 시작)
  const FINAL = {
    a: [["ㅏ"]], o: [["ㅗ"]], e: [["ㅓ"]], ai: [["ㅏ"], ["ㅣ"]], ei: [["ㅔ"], ["ㅣ"]], ao: [["ㅏ"], ["ㅗ"]], ou: [["ㅓ"], ["ㅜ"]],
    an: [["ㅏ", "ㄴ"]], en: [["ㅓ", "ㄴ"]], ang: [["ㅏ", "ㅇ"]], eng: [["ㅓ", "ㅇ"]], ong: [["ㅗ", "ㅇ"]], er: [["ㅓ", "ㄹ"]],
    i: [["ㅣ"]], u: [["ㅜ"]], v: [["ㅟ"]],
    ia: [["ㅑ"]], ie: [["ㅣ"], ["ㅔ"]], iao: [["ㅑ"], ["ㅗ"]], iu: [["ㅣ"], ["ㅜ"]], ian: [["ㅣ"], ["ㅔ", "ㄴ"]],
    in: [["ㅣ", "ㄴ"]], iang: [["ㅑ", "ㅇ"]], ing: [["ㅣ", "ㅇ"]], iong: [["ㅠ", "ㅇ"]],
    ua: [["ㅘ"]], uo: [["ㅝ"]], uai: [["ㅘ"], ["ㅣ"]], ui: [["ㅜ"], ["ㅣ"]], uan: [["ㅘ", "ㄴ"]], un: [["ㅜ", "ㄴ"]], uang: [["ㅘ", "ㅇ"]],
    ve: [["ㅞ"]], van: [["ㅟ"], ["ㅏ", "ㄴ"]], vn: [["ㅟ", "ㄴ"]],
  };
  // y·w로 시작하는 음절은 그대로 표에서 찾는다
  const YW = {
    yi: "이", ya: "야", yao: "야오", ye: "예", you: "여우", yan: "옌", yin: "인", yang: "양", ying: "잉", yong: "융",
    yu: "위", yue: "웨", yuan: "위안", yun: "윈", wu: "우", wa: "와", wo: "워", wai: "와이", wei: "웨이", wan: "완",
    wen: "원", wang: "왕", weng: "웡",
  };
  function splitSyllable(s) {
    if (YW[s]) return { yw: YW[s] };
    const ini = ["zh", "ch", "sh"].find((x) => s.startsWith(x)) ?? (INITIAL[s[0]] && s[0] !== "" && !/[aeiouv]/.test(s[0]) ? s[0] : "");
    let fin = s.slice(ini.length);
    if (/^[jqx]/.test(ini)) fin = fin.replace(/^u/, "v");   // j·q·x 뒤의 u는 ü
    if (fin === "ue" && /^[ln]$/.test(ini)) fin = "ve";
    return FINAL[fin] ? { ini, fin } : null;
  }
  function pinyinSyllable(s) {
    const p = splitSyllable(s);
    if (!p) return null;
    if (p.yw) return p.yw;
    // zh·ch·sh·r·z·c·s 뒤의 i는 '으'
    const parts = p.fin === "i" && /^(zh|ch|sh|r|z|c|s)$/.test(p.ini) ? [["ㅡ"]] : FINAL[p.fin];
    return parts.map(([v, f = ""], k) => syl(k === 0 ? INITIAL[p.ini] : "ㅇ", v, f)).join("");
  }
  function chinese(pinyin) {
    // 성조 부호를 떼기 전에 ü(ǖ ǘ ǚ ǜ 포함)를 v로 바꿔 둔다
    const text = pinyin.normalize("NFD").replace(/u\u0308/gi, "v").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return text.replace(/[a-z']+/g, (word) => word.split("'").map((w) => {
      let out = "", i = 0;
      while (i < w.length) {
        // 가장 긴 올바른 음절부터 잘라 읽는다
        let hit = null;
        for (let n = Math.min(6, w.length - i); n > 0; n--) {
          const h = pinyinSyllable(w.substr(i, n));
          if (h) { hit = [h, n]; break; }
        }
        if (hit) { out += hit[0]; i += hit[1]; }
        else if (w[i] === "r" && out) { out = addFinal(out, "ㄹ"); i++; }   // 儿化: nǎr → 날
        else { out += w[i]; i++; }
      }
      return out;
    }).join(""));
  }

  window.MimiPron = {
    // lang: 번역된 언어, roman: 번역 서비스가 준 로마자 표기. 바꿀 수 없으면 빈 문자열
    toHangul(lang, roman) {
      if (!roman) return "";
      if (lang === "ja") return japanese(roman);
      if (lang === "zh-CN") return chinese(roman);
      return "";
    },
  };
})();
