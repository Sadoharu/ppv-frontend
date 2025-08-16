// src/utils/slugify.ts
export type SlugifyOptions = {
  separator?: string;   // за замовчуванням "-"
  lower?: boolean;      // true: до нижнього регістру
  maxLength?: number;   // максимум символів (за кодпоінтами), напр. 80
  transliterate?: boolean; // true: робити транслітерацію
  allowedChars?: string;   // ASCII-символи, які дозволено зберегти (крім a-z0-9), напр. "._"
};

const DEFAULTS: Required<SlugifyOptions> = {
  separator: "-",
  lower: true,
  maxLength: 80,
  transliterate: true,
  allowedChars: ""
};

const SPECIAL_REPLACEMENTS: Record<string, string> = {
  "&": " and ",
  "@": " at ",
  "%": " percent ",
  "+": " plus ",
  "№": " no ",
};

// базова діакритика/латиниця (ß, Ø, Æ тощо)
const LATIN_EXTRAS: Record<string, string> = {
  "ß": "ss",
  "æ": "ae", "Æ": "ae",
  "ø": "o",  "Ø": "o",
  "đ": "d",  "Đ": "d",
  "ł": "l",  "Ł": "l",
  "ð": "d",  "Ð": "d",
  "þ": "th", "Þ": "th",
};

// Транслітерація кирилиці → латиниця (спрощена, дружня до URL)
// Орієнтована на укр, з фолбеком на rus-літери.
// Є/Ї/Ю/Я — контекстно: на початку слова => ye/yi/yu/ya, інакше => ie/i/iu/ia
function transliterateCyrillic(input: string): string {
  let s = input;

  // прибрати апострофи/м’який/твердий знаки, щоб не заважали
  s = s.replace(/[’'`ʼ]/g, ""); // апострофи
  s = s.replace(/[ьЬ]/g, "");   // м'який знак
  s = s.replace(/[ъЪ]/g, "");   // твердий знак

  // позиційні правила для є/ї/ю/я (та рос. ё)
  // слово-старт: (^|[^A-Za-z0-9])
  s = s
    // українські
    .replace(/(^|[^A-Za-z0-9])є/gi, (_, p1) => p1 + "ye")
    .replace(/(^|[^A-Za-z0-9])ї/gi, (_, p1) => p1 + "yi")
    .replace(/(^|[^A-Za-z0-9])ю/gi, (_, p1) => p1 + "yu")
    .replace(/(^|[^A-Za-z0-9])я/gi, (_, p1) => p1 + "ya")
    // російська "ё" на початку слова
    .replace(/(^|[^A-Za-z0-9])ё/gi, (_, p1) => p1 + "yo");

  // решта є/ї/ю/я/ё всередині слова
  s = s
    .replace(/є/gi, "ie")
    .replace(/ї/gi, "i")
    .replace(/ю/gi, "iu")
    .replace(/я/gi, "ia")
    .replace(/ё/gi, "io");

  // багатосимвольні відповідники (укр/рус)
  s = s
    .replace(/щ/gi, "shch")
    .replace(/ш/gi, "sh")
    .replace(/ч/gi, "ch")
    .replace(/ж/gi, "zh")
    .replace(/х/gi, "kh")
    .replace(/ц/gi, "ts");

  // базові однолітерні відповідники
  const map: Record<string, string> = {
    // укр
    "а":"a","б":"b","в":"v","г":"h","ґ":"g","д":"d","е":"e","з":"z","и":"y",
    "і":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r",
    "с":"s","т":"t","у":"u","ф":"f","ь":"", // safety
    // рус/спільні
    "ъ":"","э":"e","ы":"y",
    // білоруські часті
    "ў":"u",
  };

  s = s.replace(/[А-Яа-яЁёЄєІіЇїҐґЪъЫыЭэЎў]/g, ch => {
    const lower = ch.toLowerCase();
    const repl =
      map[lower] ??
      lower;
    return repl;
  });

  return s;
}

// видалення діакритики (NFKD + combining marks)
function stripDiacritics(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(input: string, opts: SlugifyOptions = {}): string {
  const o = { ...DEFAULTS, ...opts };
  const sep = o.separator;

  if (!input) return "n-a";

  let s = String(input).trim();

  // зручні текстові заміни (&, @, №, +, % …)
  for (const [k, v] of Object.entries(SPECIAL_REPLACEMENTS)) {
    s = s.split(k).join(v);
  }

  // транслітерація
  if (o.transliterate) {
    s = transliterateCyrillic(s);
    for (const [k, v] of Object.entries(LATIN_EXTRAS)) {
      s = s.split(k).join(v);
    }
  }

  // зняти діакритику
  s = stripDiacritics(s);

  // до нижнього регістру
  if (o.lower) s = s.toLowerCase();

  // усе, що не a-z0-9 або з allowedChars — прибираємо/міняємо на сепаратор
  const allow = o.allowedChars ? escapeRegExp(o.allowedChars) : "";
  const reNotAllowed = new RegExp(`[^a-z0-9${allow}]+`, "g");
  s = s.replace(reNotAllowed, sep);

  // схлопнути повтори сепаратора
  const reMultiSep = new RegExp(`${escapeRegExp(sep)}{2,}`, "g");
  s = s.replace(reMultiSep, sep);

  // обрізати сепаратори з країв
  s = s.replace(new RegExp(`^${escapeRegExp(sep)}|${escapeRegExp(sep)}$`, "g"), "");

  // обмежити довжину за кодпоінтами (щоб не різати surrogate pairs)
  if (o.maxLength > 0) {
    const arr = Array.from(s);
    if (arr.length > o.maxLength) s = arr.slice(0, o.maxLength).join("");
    // повторно підчистити крайні сепаратори
    s = s.replace(new RegExp(`^${escapeRegExp(sep)}|${escapeRegExp(sep)}$`, "g"), "");
  }

  return s || "n-a";
}
