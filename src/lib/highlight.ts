import type { CodeLang } from '../content/types';

/*
 * A small, dependency-free syntax highlighter tuned for teaching C++ and
 * Unreal Engine C++. It understands Unreal's reflection macros (UCLASS,
 * UPROPERTY…) and type prefixes (AActor, FVector, TArray…), which generic
 * highlighters don't.
 */

export type TokenKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'type'
  | 'function'
  | 'macro'
  | 'preproc'
  | 'operator'
  | 'punct'
  | 'namespace'
  | 'attr';

export interface Token {
  text: string;
  kind: TokenKind;
}

const CPP_KEYWORDS = new Set(
  (
    'alignas alignof and asm break case catch class co_await co_return co_yield concept const consteval constexpr ' +
    'constinit const_cast continue decltype default delete do dynamic_cast else enum explicit export extern false ' +
    'final for friend goto if import inline module mutable namespace new noexcept not nullptr operator or override ' +
    'private protected public register reinterpret_cast requires return sizeof static static_assert static_cast ' +
    'struct switch template this thread_local throw true try typedef typeid typename union using virtual volatile while xor'
  ).split(' '),
);

const CPP_TYPES = new Set(
  (
    'auto bool char char8_t char16_t char32_t double float int long short signed unsigned void wchar_t size_t ' +
    'ptrdiff_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t intptr_t uintptr_t ' +
    'int8 int16 int32 int64 uint8 uint16 uint32 uint64 TCHAR ANSICHAR WIDECHAR UTF8CHAR'
  ).split(' '),
);

const UE_MACROS = new Set(
  (
    'UCLASS UPROPERTY UFUNCTION USTRUCT UENUM UINTERFACE UMETA UPARAM GENERATED_BODY GENERATED_UCLASS_BODY ' +
    'GENERATED_USTRUCT_BODY GENERATED_IINTERFACE_BODY UE_LOG UE_LOGFMT UE_VLOG UE_VLOG_SEGMENT TEXT LOCTEXT NSLOCTEXT ' +
    'check checkf checkSlow checkNoEntry checkNoReentry verify verifyf ensure ensureMsgf ensureAlways ensureAlwaysMsgf ' +
    'unimplemented DOREPLIFETIME DOREPLIFETIME_CONDITION DOREPLIFETIME_CONDITION_NOTIFY IMPLEMENT_PRIMARY_GAME_MODULE ' +
    'IMPLEMENT_MODULE DEFINE_LOG_CATEGORY DEFINE_LOG_CATEGORY_STATIC DECLARE_LOG_CATEGORY_EXTERN UE_DEFINE_GAMEPLAY_TAG ' +
    'UE_DECLARE_GAMEPLAY_TAG_EXTERN UE_DEFINE_GAMEPLAY_TAG_STATIC GET_MEMBER_NAME_CHECKED MoveTemp INDEX_NONE ' +
    'UE_PI UE_SMALL_NUMBER KINDA_SMALL_NUMBER SMALL_NUMBER FORCEINLINE CastChecked'
  ).split(' '),
);

const CSHARP_KEYWORDS = new Set(
  (
    'using namespace public private protected internal class struct new return if else for foreach while true false ' +
    'null void string bool int static readonly override base this var get set'
  ).split(' '),
);

const CMAKE_COMMANDS = /^(cmake_minimum_required|project|add_executable|add_library|target_link_libraries|target_include_directories|target_compile_features|target_compile_options|set|find_package|add_subdirectory|include|option|if|else|endif|message|install|enable_testing|add_test|FetchContent_Declare|FetchContent_MakeAvailable)$/i;

const ident = /^[A-Za-z_][A-Za-z0-9_]*/;
const number = /^(0[xX][0-9a-fA-F']+|0[bB][01']+|(\d[\d']*\.?[\d']*|\.\d[\d']*)([eE][+-]?\d+)?)[uUlLfFzZ]*/;

function isUnrealType(word: string) {
  // AActor, UObject, FVector, TArray, EWeaponType, IInteractable, SWidget …
  return /^[AUFTEIS][A-Z][A-Za-z0-9]*$/.test(word) && word.length > 2 && !/^[A-Z0-9_]+$/.test(word);
}

const TYPE_INTRODUCERS = new Set(['class', 'struct', 'enum', 'typename', 'new', 'concept', 'union', 'public', 'protected', 'private']);
const STD_TYPES = new Set(
  (
    'string string_view vector array map unordered_map set unordered_set multimap list deque span unique_ptr shared_ptr ' +
    'weak_ptr optional variant expected unexpected pair tuple function thread jthread mutex shared_mutex lock_guard ' +
    'scoped_lock unique_lock condition_variable atomic future promise ostream istream ifstream ofstream fstream ' +
    'stringstream ostringstream istringstream exception runtime_error logic_error out_of_range invalid_argument ' +
    'bad_alloc byte size_t nullopt_t initializer_list reference_wrapper stop_token chrono'
  ).split(' '),
);

function tokenizeCpp(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let lineStart = true;
  let prevWord = '';
  const push = (text: string, kind: TokenKind) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind && (kind === 'plain' || kind === 'punct')) last.text += text;
    else out.push({ text, kind });
  };
  while (i < code.length) {
    const rest = code.slice(i);
    const c = code[i];
    if (c === '\n') {
      push('\n', 'plain');
      i++;
      lineStart = true;
      continue;
    }
    if (c === ' ' || c === '\t') {
      const m = /^[ \t]+/.exec(rest)![0];
      push(m, 'plain');
      i += m.length;
      continue;
    }
    // Preprocessor directive (#include <x>, #define …)
    if (c === '#' && lineStart) {
      const m = /^#\s*[a-z_]+/.exec(rest);
      if (m) {
        push(m[0], 'preproc');
        i += m[0].length;
        const inc = /^(\s*)(<[^>\n]*>|"[^"\n]*")/.exec(code.slice(i));
        if (inc && /include|import/.test(m[0])) {
          push(inc[1], 'plain');
          push(inc[2], 'string');
          i += inc[0].length;
        }
        lineStart = false;
        continue;
      }
    }
    lineStart = false;
    if (rest.startsWith('//')) {
      const end = code.indexOf('\n', i);
      const text = end === -1 ? rest : code.slice(i, end);
      push(text, 'comment');
      i += text.length;
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = code.indexOf('*/', i + 2);
      const text = end === -1 ? rest : code.slice(i, end + 2);
      // Keep newlines inside block comments as separate tokens so lines split cleanly.
      text.split('\n').forEach((part, idx) => {
        if (idx > 0) push('\n', 'plain');
        if (part) push(part, 'comment');
      });
      i += text.length;
      continue;
    }
    if (rest.startsWith('[[') && /^\[\[\s*[a-z_:]+/.test(rest)) {
      const end = code.indexOf(']]', i);
      if (end !== -1 && end - i < 60) {
        push(code.slice(i, end + 2), 'attr');
        i = end + 2;
        continue;
      }
    }
    // Raw string literal R"delim( … )delim"
    const raw = /^(u8|u|U|L)?R"([^(\s]*)\(/.exec(rest);
    if (raw) {
      const close = `)${raw[2]}"`;
      const end = code.indexOf(close, i + raw[0].length);
      const text = end === -1 ? rest : code.slice(i, end + close.length);
      text.split('\n').forEach((part, idx) => {
        if (idx > 0) push('\n', 'plain');
        if (part) push(part, 'string');
      });
      i += text.length;
      continue;
    }
    const str = /^(u8|u|U|L)?"(\\.|[^"\\\n])*"?(sv|s)?/.exec(rest);
    if (str && (c === '"' || /^(u8|u|U|L)"/.test(rest))) {
      push(str[0], 'string');
      i += str[0].length;
      continue;
    }
    const chr = /^(u8|u|U|L)?'(\\.|[^'\\\n])+'/.exec(rest);
    if (chr && (c === "'" || /^(u8|u|U|L)'/.test(rest))) {
      push(chr[0], 'string');
      i += chr[0].length;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] ?? ''))) {
      const m = number.exec(rest);
      if (m) {
        push(m[0], 'number');
        i += m[0].length;
        continue;
      }
    }
    const id = ident.exec(rest);
    if (id) {
      const word = id[0];
      i += word.length;
      const after = code.slice(i);
      const upper = /^[A-Z]/.test(word);
      let kind: TokenKind = 'plain';
      if (CPP_KEYWORDS.has(word)) kind = 'keyword';
      else if (CPP_TYPES.has(word)) kind = 'type';
      else if (UE_MACROS.has(word) || /^(DECLARE_|UE_|DEFINE_)/.test(word)) kind = 'macro';
      else if (/^::/.test(after)) kind = upper ? 'type' : 'namespace';
      else if (TYPE_INTRODUCERS.has(prevWord)) kind = 'type';
      else if (prevWord === 'std' && STD_TYPES.has(word)) kind = 'type';
      else if (/^\s*\(/.test(after)) kind = isUnrealType(word) ? 'type' : 'function';
      else if (isUnrealType(word)) kind = 'type';
      else if (upper && /^\s*<[^;(){}]*>/.test(after)) kind = 'type';
      else if (upper && /^(\s*[*&]+\s*|\s+)[A-Za-z_]/.test(after) && !/^\s+(and|or|not)\b/.test(after)) kind = 'type';
      push(word, kind);
      prevWord = word;
      continue;
    }
    if (/[+\-*/%=<>!&|^~?:]/.test(c)) {
      const m = /^(<=>|<<=|>>=|->\*|->|::|\+\+|--|<<|>>|<=|>=|==|!=|&&|\|\||[+\-*/%&|^]=|[+\-*/%=<>!&|^~?:])/.exec(rest)!;
      push(m[0], m[0] === '::' ? 'punct' : 'operator');
      i += m[0].length;
      continue;
    }
    push(c, 'punct');
    i++;
  }
  return out;
}

function tokenizeSimple(code: string, lang: CodeLang): Token[] {
  const out: Token[] = [];
  const lines = code.split('\n');
  lines.forEach((line, li) => {
    if (li > 0) out.push({ text: '\n', kind: 'plain' });
    if (lang === 'ini') {
      if (/^\s*[;#]/.test(line)) out.push({ text: line, kind: 'comment' });
      else if (/^\s*\[.*\]\s*$/.test(line)) out.push({ text: line, kind: 'keyword' });
      else {
        const m = /^(\s*[+\-.!]?[\w.]+)(\s*=\s*)(.*)$/.exec(line);
        if (m) {
          out.push({ text: m[1], kind: 'type' }, { text: m[2], kind: 'operator' }, { text: m[3], kind: 'string' });
        } else out.push({ text: line, kind: 'plain' });
      }
      return;
    }
    const commentStart = lang === 'shell' || lang === 'cmake' ? /(^|\s)#/ : lang === 'csharp' ? /\/\// : null;
    let body = line;
    let comment = '';
    if (commentStart) {
      const m = commentStart.exec(line);
      if (m && !(lang === 'shell' && /^\s*#!/.test(line) && li === 0)) {
        const at = m.index + (m[1]?.length ?? 0);
        body = line.slice(0, at);
        comment = line.slice(at);
      }
    }
    const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\s+)|([A-Za-z_][\w.-]*)|(-{1,2}[\w=-]+)|(\d+(?:\.\d+)?)|(.)/g;
    let m: RegExpExecArray | null;
    let first = true;
    while ((m = re.exec(body))) {
      const [t, s, ws, word, flag, num] = m;
      if (s) out.push({ text: t, kind: 'string' });
      else if (ws) out.push({ text: t, kind: 'plain' });
      else if (word) {
        let kind: TokenKind = 'plain';
        if (lang === 'shell' && first) kind = 'function';
        else if (lang === 'csharp' && CSHARP_KEYWORDS.has(word)) kind = 'keyword';
        else if (lang === 'csharp' && /^[A-Z]/.test(word)) kind = 'type';
        else if (lang === 'cmake' && CMAKE_COMMANDS.test(word)) kind = 'function';
        else if (lang === 'cmake' && /^[A-Z_]{3,}$/.test(word)) kind = 'keyword';
        else if (lang === 'json' && word.match(/^(true|false|null)$/)) kind = 'keyword';
        out.push({ text: t, kind });
        first = false;
      } else if (flag && lang === 'shell') out.push({ text: t, kind: 'attr' });
      else if (num) out.push({ text: t, kind: 'number' });
      else out.push({ text: t, kind: /[{}()[\];,]/.test(t) ? 'punct' : 'operator' });
      if (!ws && !word) first = lang === 'shell' && (t === '|' || t === '&' || t === ';') ? true : first;
    }
    if (comment) out.push({ text: comment, kind: 'comment' });
  });
  return out;
}

/** Tokenize and split into lines (each line is an array of tokens). */
export function highlightLines(code: string, lang: CodeLang = 'cpp'): Token[][] {
  const tokens = lang === 'cpp' ? tokenizeCpp(code) : lang === 'text' ? [{ text: code, kind: 'plain' as const }] : tokenizeSimple(code, lang);
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split('\n');
    parts.forEach((p, idx) => {
      if (idx > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ text: p, kind: t.kind });
    });
  }
  return lines;
}

export function parseLineSpec(spec: number | string | number[]): number[] {
  if (typeof spec === 'number') return [spec];
  if (Array.isArray(spec)) return spec;
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(spec.trim());
  if (m) {
    const out: number[] = [];
    for (let i = +m[1]; i <= +m[2]; i++) out.push(i);
    return out;
  }
  const n = Number(spec);
  return Number.isInteger(n) ? [n] : [];
}
