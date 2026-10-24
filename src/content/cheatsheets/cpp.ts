import type { CheatSheet } from '../types';

/*
 * Quick-reference sheets for the C++ course. Dense and practical: every item
 * is a label plus a short snippet, with an optional one-line note.
 */
export const cppCheatSheets: CheatSheet[] = [
  // ------------------------------------------------------------------ basics
  {
    id: 'cpp-basics',
    title: 'Program Skeleton & Basics',
    course: 'cpp',
    icon: '🧱',
    description: 'The shape of a program, fundamental types, literals, initialisation, operators and control flow.',
    sections: [
      {
        title: 'Program skeleton',
        items: [
          {
            label: 'Hello, world',
            code: `#include <iostream>

int main() {
    std::cout << "Hello, world!\\n";
    return 0;   // optional in main only
}`,
          },
          {
            label: 'Compile and run',
            code: `g++ -std=c++20 -Wall -Wextra main.cpp -o game
./game`,
            lang: 'shell',
          },
          {
            label: 'Command-line arguments',
            code: `int main(int argc, char* argv[]) {
    // argv[0] is the program name
    for (int i = 1; i < argc; ++i) {
        std::cout << argv[i] << '\\n';
    }
}`,
          },
          {
            label: 'Exit codes',
            code: `#include <cstdlib>
return EXIT_SUCCESS;   // 0
return EXIT_FAILURE;   // non-zero: something went wrong`,
          },
          {
            label: 'Comments',
            code: `// single line
/* multi-line
   (does not nest) */`,
          },
          {
            label: 'Common headers',
            code: `#include <iostream>   // std::cout, std::cin
#include <string>     // std::string
#include <vector>     // std::vector
#include <algorithm>  // std::sort, std::find...
#include <memory>     // std::unique_ptr...`,
          },
        ],
      },
      {
        title: 'Types & literals',
        items: [
          { label: 'Integers', code: `int lives = 3;          // at least 16 bits, usually 32
long long xp = 5'000'000'000LL; // at least 64 bits`, text: '`\'` is a digit separator (C++14).' },
          { label: 'Unsigned', code: `unsigned int mask = 0xFFu;
std::size_t n = v.size();   // sizes and indices`, text: 'Unsigned arithmetic wraps around; signed overflow is UB.' },
          { label: 'Floating point', code: `double gravity = 9.81;   // default for literals
float speed = 4.5f;       // f suffix = float` },
          { label: 'char and bool', code: `char grade = 'A';        // single quotes
bool alive = true;        // true / false` },
          { label: 'Hex, binary, octal', code: `int a = 0xFF;    // 255
int b = 0b1010;  // 10
int c = 017;     // 15 — leading 0 means octal!` },
          { label: 'Fixed width', code: `#include <cstdint>
std::int32_t gold = 0;
std::uint8_t level = 1;` },
          { label: 'Limits', code: `#include <limits>
int big = std::numeric_limits<int>::max();
double eps = std::numeric_limits<double>::epsilon();` },
          { label: 'Size of a type', code: `sizeof(int)      // usually 4
sizeof(double)   // usually 8` },
        ],
      },
      {
        title: 'Initialisation',
        items: [
          { label: 'Brace (preferred)', code: `int hp{100};
double speed{4.5};`, text: 'Rejects narrowing conversions.' },
          { label: 'Value-initialise to zero', code: `int count{};      // 0
double d{};       // 0.0
int* p{};         // nullptr` },
          { label: 'Narrowing is an error', code: `int a = 9.99;     // compiles: a == 9
int b{9.99};      // error: narrowing` },
          { label: 'Uninitialised local', code: `int x;            // indeterminate: reading it is UB`, text: 'Always give locals an initial value.' },
          { label: 'const and constexpr', code: `const int maxHp = ReadConfig(); // read-only
constexpr int MaxLevel = 50;    // compile-time` },
          { label: 'auto', code: `auto score = 0;       // int
auto ratio = 0.5;     // double
auto name = std::string{"Aria"};` },
          { label: 'Vector: braces vs parens', code: `std::vector<int> a{10};  // one element: 10
std::vector<int> b(10);  // ten zeros` },
        ],
      },
      {
        title: 'Operators',
        items: [
          { label: 'Arithmetic', code: `a + b   a - b   a * b   a / b   a % b` },
          { label: 'Integer division', code: `7 / 2        // 3 (truncates toward zero)
7 / 2.0      // 3.5
-7 % 3       // -1 (sign of left operand)` },
          { label: 'Compound assignment', code: `hp -= 10;  score += 5;  mult *= 2;` },
          { label: 'Increment', code: `++i;   // increment, yields new value
i++;   // increment, yields old value` },
          { label: 'Comparison', code: `==  !=  <  <=  >  >=` },
          { label: 'Logical (short-circuit)', code: `if (p != nullptr && p->IsAlive()) { }
if (dead || stunned) { }
if (!ready) { }` },
          { label: 'Ternary', code: `int dmg = crit ? base * 2 : base;` },
          { label: 'Bitwise', code: `flags |= Burning;          // set
flags &= ~Burning;         // clear
flags ^= Burning;          // toggle
bool on = (flags & Burning) != 0;  // test`, text: '`&` binds looser than `==`: parenthesise tests.' },
          { label: 'Casts', code: `double r = static_cast<double>(kills) / deaths;
int code = static_cast<int>(State::Idle);` },
        ],
      },
      {
        title: 'Control flow',
        items: [
          { label: 'if / else if / else', code: `if (hp <= 0) {
    Die();
} else if (hp < 25) {
    Warn();
} else {
    Regen();
}` },
          { label: 'if with initialiser (C++17)', code: `if (auto it = m.find(key); it != m.end()) {
    Use(it->second);
}` },
          { label: 'switch', code: `switch (state) {
case State::Idle:
    Idle();
    break;
case State::Run:
    Run();
    [[fallthrough]];   // intentional
default:
    break;
}` },
          { label: 'for', code: `for (int i = 0; i < n; ++i) { }` },
          { label: 'Range-based for', code: `for (const auto& e : enemies) { }   // read
for (auto& e : enemies) { }         // modify` },
          { label: 'while / do-while', code: `while (hp > 0) { hp -= poison; }
do { Play(); } while (Again());   // runs at least once` },
          { label: 'break / continue', code: `for (const auto& e : enemies) {
    if (!e.alive) continue;   // next iteration
    if (e.boss) break;        // leave loop
}` },
        ],
      },
    ],
  },
  // --------------------------------------------------------------- strings/io
  {
    id: 'cpp-strings-io',
    title: 'Strings & I/O',
    course: 'cpp',
    icon: '🔤',
    description: 'std::string operations, conversions, string_view, console input/output, files and formatting.',
    sections: [
      {
        title: 'std::string',
        items: [
          { label: 'Create', code: `#include <string>
std::string name = "Aria";
std::string line(10, '-');   // "----------"` },
          { label: 'Concatenate', code: `std::string full = name + " the Brave";
full += '!';` },
          { label: 'Length and emptiness', code: `full.size()     // bytes, not visible characters
full.empty()` },
          { label: 'Access characters', code: `name[0]         // 'A' — unchecked
name.at(10)     // throws std::out_of_range
name.front(); name.back();` },
          { label: 'Substring', code: `name.substr(1, 2)   // "ri" (pos, count)` },
          { label: 'Search', code: `auto pos = full.find("Brave");
if (pos != std::string::npos) { /* found */ }` },
          { label: 'Prefix / suffix (C++20)', code: `full.starts_with("Aria")
full.ends_with('!')` },
          { label: 'Contains (C++23)', code: `full.contains("the")` },
          { label: 'Modify', code: `s.insert(0, "Sir ");
s.erase(0, 4);           // pos, count
s.replace(0, 4, "Lady");
s.clear();` },
          { label: 'Compare', code: `if (a == b) { }          // compares contents
if (a < b) { }           // lexicographic` },
        ],
      },
      {
        title: 'Conversions',
        items: [
          { label: 'Number to string', code: `std::string s = std::to_string(42);` },
          { label: 'String to number', code: `int lv = std::stoi("12");      // throws on bad input
double d = std::stod("2.5");` },
          { label: 'Non-throwing parse', code: `#include <charconv>
int value = 0;
auto [ptr, ec] = std::from_chars(s.data(), s.data() + s.size(), value);
if (ec == std::errc{}) { /* ok */ }` },
          { label: 'char <-> digit', code: `int d = '7' - '0';           // 7
char c = static_cast<char>('0' + 3);  // '3'` },
          { label: 'Upper / lower case', code: `#include <cctype>
char up = static_cast<char>(
    std::toupper(static_cast<unsigned char>(c)));` },
        ],
      },
      {
        title: 'string_view & literals',
        items: [
          { label: 'Read-only parameter', code: `void Greet(std::string_view name);
Greet("Aria");          // no allocation
Greet(someString);      // no copy`, text: 'Never let a view outlive the string it views.' },
          { label: 'C-string for C APIs', code: `std::fopen(path.c_str(), "r");` },
          { label: 'Raw string literal', code: `auto path = R"(C:\\Games\\save.dat)";` },
          { label: 'Escape sequences', code: `"\\n"  "\\t"  "\\\\"  "\\""  '\\''  '\\0'` },
          { label: 'std::string literal', code: `using namespace std::string_literals;
auto s = "hello"s;      // std::string` },
          { label: 'string_view literal', code: `using namespace std::string_view_literals;
auto v = "hello"sv;     // std::string_view` },
        ],
      },
      {
        title: 'Console I/O',
        items: [
          { label: 'Print', code: `std::cout << "HP: " << hp << '\\n';`, text: 'Prefer `\'\\n\'` over `std::endl` (which also flushes).' },
          { label: 'Errors', code: `std::cerr << "Failed to load\\n";   // unbuffered` },
          { label: 'Read a word / number', code: `int level{};
if (std::cin >> level) { /* success */ }` },
          { label: 'Read a whole line', code: `std::string line;
std::getline(std::cin, line);` },
          { label: 'After >> before getline', code: `std::cin >> level;
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');
std::getline(std::cin, line);`, text: '`>>` leaves the newline behind.' },
          { label: 'Recover from bad input', code: `std::cin.clear();   // reset fail state
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');` },
          { label: 'Formatting numbers', code: `#include <iomanip>
std::cout << std::fixed << std::setprecision(2) << 3.14159; // 3.14
std::cout << std::setw(5) << 42;                            // "   42"
std::cout << std::boolalpha << true;                        // true` },
        ],
      },
      {
        title: 'Files, string streams & format',
        items: [
          { label: 'Write a file', code: `#include <fstream>
std::ofstream out{"save.txt"};
out << "level " << 3 << '\\n';` },
          { label: 'Read a file line by line', code: `std::ifstream in{"save.txt"};
if (!in) { /* could not open */ }
std::string line;
while (std::getline(in, line)) { /* use line */ }` },
          { label: 'Build a string', code: `#include <sstream>
std::ostringstream oss;
oss << "HP: " << hp;
std::string text = oss.str();` },
          { label: 'Parse a string', code: `std::istringstream iss{"10 20 30"};
int a, b, c;
iss >> a >> b >> c;` },
          { label: 'std::format (C++20)', code: `#include <format>
std::string s = std::format("{} has {} HP", name, hp);
std::format("{:.2f}", 3.14159);   // "3.14"
std::format("{:>5}", 42);         // "   42"` },
          { label: 'std::print (C++23)', code: `#include <print>
std::println("{} scored {}", name, score);` },
        ],
      },
    ],
  },
  // --------------------------------------------------------------- functions
  {
    id: 'cpp-functions',
    title: 'Functions & Lambdas',
    course: 'cpp',
    icon: '🧩',
    description: 'Declarations, parameter passing, overloading, default arguments and lambdas.',
    sections: [
      {
        title: 'Declaring & defining',
        items: [
          { label: 'Declaration (prototype)', code: `int Add(int a, int b);        // usually in a header` },
          { label: 'Definition', code: `int Add(int a, int b) {
    return a + b;
}` },
          { label: 'No return value', code: `void Log(std::string_view msg) {
    if (msg.empty()) return;   // early exit
    std::cout << msg << '\\n';
}` },
          { label: 'Return several values', code: `struct Hit { bool ok; int damage; };
Hit Roll() { return {true, 12}; }
auto [ok, dmg] = Roll();` },
          { label: 'Trailing return type', code: `auto Scale(int x) -> double { return x * 1.5; }` },
          { label: 'Do not ignore the result', code: `[[nodiscard]] bool TrySpend(int cost);` },
          { label: 'Defined in a header', code: `inline int Twice(int x) { return x * 2; }`, text: '`inline` avoids multiple-definition link errors.' },
          { label: 'Compile-time capable', code: `constexpr int Square(int x) { return x * x; }
static_assert(Square(4) == 16);` },
          { label: 'Static local', code: `int NextId() {
    static int id = 0;   // initialised once
    return ++id;
}` },
        ],
      },
      {
        title: 'Parameters',
        items: [
          { label: 'Cheap types: by value', code: `void SetLevel(int level);
void Move(Vec2 dir);` },
          { label: 'Large, read-only: const&', code: `void Print(const std::vector<Item>& items);` },
          { label: 'Text, read-only', code: `void Greet(std::string_view name);` },
          { label: 'Modify caller\'s object: &', code: `void Heal(int& hp, int amount) { hp += amount; }` },
          { label: 'Optional object: pointer', code: `void Attack(Enemy* target) {
    if (!target) return;
    target->TakeDamage(10);
}` },
          { label: 'Sink: by value + move', code: `class Player {
public:
    void SetName(std::string n) { name = std::move(n); }
private:
    std::string name;
};` },
          { label: 'Default arguments', code: `void Spawn(int count = 1, bool elite = false);
Spawn();  Spawn(3);  Spawn(3, true);`, text: 'Defaults go in the declaration, rightmost parameters only.' },
          { label: 'Overloading', code: `void Print(int v);
void Print(double v);
void Print(std::string_view v);`, text: 'Overloads must differ in parameters, not just return type.' },
        ],
      },
      {
        title: 'Lambdas',
        items: [
          { label: 'Basic', code: `auto add = [](int a, int b) { return a + b; };
int s = add(2, 3);   // 5` },
          { label: 'Capture by value', code: `int bonus = 5;
auto f = [bonus](int d) { return d + bonus; };` },
          { label: 'Capture by reference', code: `int kills = 0;
auto onKill = [&kills] { ++kills; };`, text: 'Dangles if the lambda outlives `kills`.' },
          { label: 'Capture all', code: `[=] { }   // copy everything used
[&] { }   // reference everything used`, text: 'Prefer listing captures explicitly.' },
          { label: 'Init capture (C++14)', code: `auto task = [p = std::make_unique<Job>()] { p->Run(); };` },
          { label: 'mutable', code: `auto counter = [n = 0]() mutable { return ++n; };` },
          { label: 'Generic lambda', code: `auto print = [](const auto& x) { std::cout << x << '\\n'; };` },
          { label: 'As a comparator', code: `std::sort(v.begin(), v.end(),
          [](const Enemy& a, const Enemy& b) { return a.hp < b.hp; });` },
          { label: 'Explicit return type', code: `auto half = [](int x) -> double { return x / 2.0; };` },
          { label: 'Store any callable', code: `#include <functional>
std::function<void(int)> onDamage = [](int d) { /* ... */ };
onDamage(10);`, text: 'Type erasure: flexible, but slower than `auto`.' },
          { label: 'Capture this', code: `auto cb = [this] { Respawn(); };   // pointer, not a copy` },
        ],
      },
    ],
  },
  // -------------------------------------------------------------- containers
  {
    id: 'cpp-containers',
    title: 'Containers',
    course: 'cpp',
    icon: '📦',
    description: 'vector, array, map, unordered_map and set operations, plus complexities and how to choose.',
    sections: [
      {
        title: 'std::vector',
        items: [
          { label: 'Create', code: `#include <vector>
std::vector<int> v;               // empty
std::vector<int> w{1, 2, 3};      // three elements
std::vector<int> z(5, 0);         // five zeros` },
          { label: 'Add at the end', code: `v.push_back(42);
v.emplace_back(42);   // constructs in place` },
          { label: 'Size', code: `v.size()   v.empty()   v.capacity()` },
          { label: 'Access', code: `v[0]        // unchecked: UB if out of range
v.at(0)     // checked: throws std::out_of_range
v.front();  v.back();  v.data();` },
          { label: 'Insert / erase', code: `v.insert(v.begin() + 1, 99);   // O(n)
v.erase(v.begin());            // O(n)
v.pop_back();                  // O(1)
v.clear();` },
          { label: 'Reserve vs resize', code: `v.reserve(100);   // capacity only, size unchanged
v.resize(10);     // size 10, new elements value-initialised` },
          { label: 'Iterate', code: `for (const auto& x : v) { }
for (std::size_t i = 0; i < v.size(); ++i) { }` },
          { label: 'Remove matching (C++20)', code: `std::erase_if(v, [](int x) { return x < 0; });
std::erase(v, 0);    // remove all zeros` },
          { label: 'Remove while iterating', code: `for (auto it = v.begin(); it != v.end(); ) {
    if (*it < 0) it = v.erase(it);
    else ++it;
}` },
          { label: 'Sort / find', code: `std::sort(v.begin(), v.end());
auto it = std::find(v.begin(), v.end(), 42);` },
          { label: '2D grid', code: `std::vector<std::vector<int>> grid(rows, std::vector<int>(cols, 0));
grid[r][c] = 1;` },
        ],
      },
      {
        title: 'Fixed-size sequences',
        items: [
          { label: 'std::array', code: `#include <array>
std::array<int, 3> rgb{255, 128, 0};
rgb.size();      // 3
rgb.fill(0);` },
          { label: 'Built-in array', code: `int scores[5]{};          // five zeros
std::size(scores);        // 5 (C++17)`, text: 'Decays to a pointer when passed to functions.' },
          { label: 'std::span parameter (C++20)', code: `#include <span>
void Sum(std::span<const int> values);
Sum(v);  Sum(rgb);  Sum(scores);`, text: 'Accepts any contiguous sequence without copying.' },
        ],
      },
      {
        title: 'std::map & std::unordered_map',
        items: [
          { label: 'Create', code: `#include <map>
#include <unordered_map>
std::map<std::string, int> sorted{{"Aria", 90}};
std::unordered_map<std::string, int> fast;` },
          { label: 'Insert or update', code: `fast["gold"] = 50;               // inserts if missing
fast.insert_or_assign("gold", 60);` },
          { label: 'Insert only if missing', code: `fast.try_emplace("sword", 1);
auto [it, inserted] = fast.insert({"bow", 1});` },
          { label: 'Look up safely', code: `if (auto it = fast.find("gold"); it != fast.end()) {
    std::cout << it->second;
}
fast.contains("gold");   // C++20
fast.at("gold");         // throws std::out_of_range if missing` },
          { label: 'operator[] pitfall', code: `int n = fast["typo"];   // silently inserts "typo" -> 0`, text: 'Not available on a `const` map; use `find`, `contains` or `at` to read.' },
          { label: 'Erase', code: `fast.erase("gold");
std::erase_if(sorted, [](const auto& kv) { return kv.second == 0; });` },
          { label: 'Iterate', code: `for (const auto& [key, value] : sorted) { }   // sorted by key` },
          { label: 'Count by key', code: `std::unordered_map<std::string, int> counts;
for (const auto& w : words) ++counts[w];` },
          { label: 'Ordered queries (map only)', code: `auto it = sorted.lower_bound("B");   // first key >= "B"` },
        ],
      },
      {
        title: 'std::set & std::unordered_set',
        items: [
          { label: 'Create and insert', code: `#include <set>
std::set<std::string> visited;
visited.insert("Town");` },
          { label: 'Was it new?', code: `auto [it, added] = visited.insert("Town");   // added == false` },
          { label: 'Membership', code: `visited.contains("Cave");   // C++20
visited.count("Cave");      // 0 or 1` },
          { label: 'Erase', code: `visited.erase("Town");` },
          { label: 'Unordered (hash) set', code: `#include <unordered_set>
std::unordered_set<int> ids{3, 1, 2};   // no particular order` },
          { label: 'Allow duplicates', code: `std::multiset<int> rolls{6, 6, 3};` },
        ],
      },
      {
        title: 'Complexity & choosing',
        items: [
          { label: 'std::vector', text: 'Index O(1) · push_back amortised O(1) · insert/erase in the middle O(n) · find O(n). Default choice.' },
          { label: 'std::array', text: 'Like vector but fixed size, no heap allocation.' },
          { label: 'std::map / std::set', text: 'Find, insert, erase O(log n). Sorted iteration. One heap node per element.' },
          { label: 'std::unordered_map / set', text: 'Find, insert, erase O(1) average, O(n) worst. No order. Iteration order can change.' },
          { label: 'std::deque', text: 'push/pop at both ends O(1), index O(1); not contiguous.' },
          { label: 'std::list', text: 'Insert/erase anywhere O(1) given an iterator, but poor cache locality; rarely the best choice.' },
          { label: 'Invalidation', text: 'Vector growth invalidates all iterators, pointers and references. Map/set erase invalidates only the erased element.' },
          { label: 'Unreal equivalents', text: '`TArray` ≈ vector, `TMap` ≈ unordered_map, `TSet` ≈ unordered_set, `TStaticArray` ≈ array.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ memory
  {
    id: 'cpp-memory',
    title: 'Pointers, References & Memory',
    course: 'cpp',
    icon: '🎯',
    description: 'Pointer and reference syntax, const placement, new/delete, smart pointers and the classic memory bugs.',
    sections: [
      {
        title: 'Pointers & references',
        items: [
          { label: 'Pointer', code: `int hp = 100;
int* p = &hp;     // & = address-of
*p = 80;          // * = dereference: hp is now 80` },
          { label: 'Null pointer', code: `Enemy* target = nullptr;
if (target) { target->Attack(); }` },
          { label: 'Member access', code: `p->hp      // same as (*p).hp` },
          { label: 'Reference', code: `int& alias = hp;   // must be initialised
alias = 50;        // hp is now 50`, text: 'A reference cannot be null or re-bound.' },
          { label: 'Re-point vs assign', code: `p = &mana;         // pointer now points elsewhere
alias = mana;      // copies mana's value INTO hp` },
          { label: 'Pass by reference', code: `void Heal(int& hp);           // may modify
void Show(const Player& p);   // read-only, no copy` },
          { label: 'Pointer to array element', code: `int arr[4]{};
int* first = arr;        // array decays to &arr[0]
int* third = arr + 2;    // pointer arithmetic` },
          { label: 'Pointer vs reference', text: 'Use a reference when the object must exist; a pointer when it may be absent (nullptr) or needs re-pointing.' },
        ],
      },
      {
        title: 'const placement',
        items: [
          { label: 'Pointer to const', code: `const int* p = &hp;   // *p = 1;  error
p = &mana;            // OK: can re-point` },
          { label: 'const pointer', code: `int* const p = &hp;   // *p = 1;  OK
// p = &mana;         // error: cannot re-point` },
          { label: 'Both', code: `const int* const p = &hp;` },
          { label: 'Read right to left', code: `int* const p   // p is a const pointer to int
const int* p   // p is a pointer to const int`, text: '`const int*` and `int const*` are the same.' },
          { label: 'const reference', code: `const std::string& name = player.Name();` },
          { label: 'const member function', code: `int GetHp() const { return hp; }   // cannot modify members` },
          { label: 'Smart pointer constness', code: `std::unique_ptr<const Enemy> a;   // pointee is const
const std::unique_ptr<Enemy> b;   // pointer is const` },
        ],
      },
      {
        title: 'new & delete (know it, rarely write it)',
        items: [
          { label: 'Single object', code: `Enemy* e = new Enemy{"Orc", 50};
delete e;
e = nullptr;` },
          { label: 'Array', code: `int* buf = new int[256]{};
delete[] buf;`, text: 'Never mix `new[]` with `delete` or `new` with `delete[]`.' },
          { label: 'Deleting nullptr', code: `int* p = nullptr;
delete p;          // safe no-op` },
          { label: 'Prefer instead', code: `auto e = std::make_unique<Enemy>("Orc", 50);
std::vector<int> buf(256);` },
        ],
      },
      {
        title: 'Smart pointers',
        items: [
          { label: 'unique_ptr: sole owner', code: `#include <memory>
auto sword = std::make_unique<Weapon>("Sword");
sword->Swing();` },
          { label: 'Transfer ownership', code: `auto owner = std::move(sword);   // sword is now null
// auto copy = owner;            // error: not copyable` },
          { label: 'Borrow raw pointer', code: `Weapon* raw = owner.get();       // do not delete it` },
          { label: 'Reset / release', code: `owner.reset();                   // delete now
owner.reset(new Weapon{"Axe"});  // replace
Weapon* p = owner.release();     // give up ownership (you must delete)` },
          { label: 'Dynamic array', code: `auto data = std::make_unique<int[]>(100);
data[0] = 1;` },
          { label: 'Polymorphic ownership', code: `std::vector<std::unique_ptr<Enemy>> enemies;
enemies.push_back(std::make_unique<Orc>());`, text: 'Base class needs a virtual destructor.' },
          { label: 'shared_ptr: shared owner', code: `auto map = std::make_shared<Map>("Arena");
auto alsoMap = map;          // count 2
map.use_count();` },
          { label: 'weak_ptr: observer', code: `std::weak_ptr<Map> watcher = map;
if (auto m = watcher.lock()) { m->Draw(); }   // still alive?` },
          { label: 'Custom deleter', code: `struct FileCloser {
    void operator()(std::FILE* f) const { std::fclose(f); }
};
std::unique_ptr<std::FILE, FileCloser> file{std::fopen("log.txt", "w")};` },
          { label: 'Function parameters', code: `void Use(Weapon& w);                       // just use it
void Use(Weapon* w);                       // may be null
void Take(std::unique_ptr<Weapon> w);      // takes ownership
void Share(std::shared_ptr<Map> m);        // shares ownership` },
        ],
      },
      {
        title: 'Classic bugs',
        items: [
          { label: 'Dangling pointer', code: `int* p = new int{5};
delete p;
*p = 7;            // UB: use-after-free` },
          { label: 'Return address of local', code: `int* Bad() { int x = 5; return &x; }   // dangling` },
          { label: 'Memory leak', code: `void F() {
    auto* e = new Enemy{};
    if (Fail()) return;   // leak
    delete e;
}` },
          { label: 'Double free', code: `int* a = new int{1};
int* b = a;
delete a;
delete b;          // UB` },
          { label: 'Invalidated reference', code: `int& first = v[0];
v.push_back(1);    // may reallocate
first = 2;         // UB if it did` },
          { label: 'Null dereference', code: `Enemy* e = nullptr;
e->Attack();       // UB, usually a crash` },
          { label: 'Find them fast', code: `g++ -g -fsanitize=address,undefined main.cpp`, lang: 'shell', text: 'AddressSanitizer reports the exact line and allocation history.' },
        ],
      },
    ],
  },
  // ----------------------------------------------------------------- classes
  {
    id: 'cpp-classes',
    title: 'Classes & Inheritance',
    course: 'cpp',
    icon: '🏛️',
    description: 'Class anatomy, constructors, special members and the rules of 0/3/5, operator overloading, inheritance and virtual functions.',
    sections: [
      {
        title: 'Class anatomy',
        items: [
          { label: 'Basic class', code: `class Enemy {
public:
    explicit Enemy(int hp) : health{hp} {}
    void TakeDamage(int amount) { health -= amount; }
    bool IsAlive() const { return health > 0; }
private:
    int health;
};` },
          { label: 'Default member initialisers', code: `class Player {
    std::string name = "Hero";
    int health = 100;
};` },
          { label: 'Member initializer list', code: `Enemy(std::string n, int hp)
    : name{std::move(n)}, health{hp} {}`, text: 'Members initialise in declaration order, not list order.' },
          { label: 'Delegating constructor', code: `Enemy() : Enemy{"Grunt", 10} {}` },
          { label: 'Define members in .cpp', code: `// Enemy.cpp
void Enemy::TakeDamage(int amount) {
    health -= amount;
}` },
          { label: 'const member function', code: `int GetHealth() const { return health; }` },
          { label: 'static member', code: `class Enemy {
    inline static int alive = 0;   // C++17
public:
    static int Alive() { return alive; }
};
Enemy::Alive();` },
          { label: 'struct aggregate', code: `struct Vec2 { float x = 0, y = 0; };
Vec2 a{3, 4};
Vec2 b{.x = 1, .y = 2};   // designated (C++20)`, text: '`struct` = `class` with public by default.' },
          { label: 'Access specifiers', code: `public:      // everyone
protected:   // this class + derived classes
private:     // this class (and friends) only` },
          { label: 'friend', code: `class Player {
    friend class SaveSystem;   // may access privates
};` },
        ],
      },
      {
        title: 'Special members & the rules',
        items: [
          { label: 'The six', code: `T();                          // default constructor
~T();                         // destructor
T(const T&);                  // copy constructor
T& operator=(const T&);       // copy assignment
T(T&&) noexcept;              // move constructor
T& operator=(T&&) noexcept;   // move assignment` },
          { label: '= default / = delete', code: `Player() = default;
Player(const Player&) = delete;            // non-copyable
Player& operator=(const Player&) = delete;` },
          { label: 'Rule of zero', code: `class Player {          // writes none of the six
    std::string name;
    std::vector<Item> items;
    std::unique_ptr<Weapon> weapon;
};`, text: 'Let members manage resources. The best default.' },
          { label: 'Rule of three / five', text: 'If you write a destructor, copy constructor or copy assignment, write (or `= delete`) all of them — plus both move operations.' },
          { label: 'Copy-and-swap assignment', code: `T& operator=(T other) noexcept {   // by value = copy
    swap(*this, other);
    return *this;
}` },
          { label: 'Implicit generation', text: 'Any constructor removes the implicit default ctor. A user-declared destructor or copy operation suppresses implicit moves.' },
          { label: 'explicit', code: `explicit Health(int v);
Health h = 50;    // error
Health h{50};     // OK` },
        ],
      },
      {
        title: 'Operator overloading',
        items: [
          { label: 'Comparisons (C++20)', code: `struct Score {
    int value;
    auto operator<=>(const Score&) const = default;
};   // generates ==, !=, <, <=, >, >=` },
          { label: 'Arithmetic', code: `Vec2 operator+(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}
Vec2& Vec2::operator+=(Vec2 o) { x += o.x; y += o.y; return *this; }` },
          { label: 'Stream output', code: `std::ostream& operator<<(std::ostream& os, const Vec2& v) {
    return os << '(' << v.x << ", " << v.y << ')';
}` },
          { label: 'Subscript', code: `Item& operator[](std::size_t i) { return items[i]; }
const Item& operator[](std::size_t i) const { return items[i]; }` },
          { label: 'Call operator', code: `struct ByHp {
    bool operator()(const Enemy& a, const Enemy& b) const {
        return a.hp < b.hp;
    }
};` },
          { label: 'Increment', code: `Counter& operator++();      // prefix
Counter operator++(int);    // postfix (dummy int)` },
          { label: 'Conversion to bool', code: `explicit operator bool() const { return valid; }
if (handle) { }   // OK; handle + 1 is not` },
        ],
      },
      {
        title: 'Inheritance & polymorphism',
        items: [
          { label: 'Derive publicly', code: `class Boss : public Enemy {
public:
    Boss() : Enemy{5000} {}   // call base constructor
};` },
          { label: 'Virtual function + override', code: `struct Enemy {
    virtual ~Enemy() = default;
    virtual void Attack() { }
};
struct Boss : Enemy {
    void Attack() override { }
};` },
          { label: 'Call the base version', code: `void Boss::Attack() {
    Enemy::Attack();   // (Unreal: Super::Attack())
    Stomp();
}` },
          { label: 'Pure virtual / abstract', code: `struct Weapon {
    virtual ~Weapon() = default;
    virtual int Damage() const = 0;   // must override
};` },
          { label: 'Interface', code: `struct IInteractable {
    virtual ~IInteractable() = default;
    virtual void Interact(Player& p) = 0;
};
class Chest : public IInteractable { /* ... */ };` },
          { label: 'final', code: `class Dragon final : public Enemy { };   // no subclasses
void Attack() final;                     // no further overrides` },
          { label: 'Use through base pointer/reference', code: `std::vector<std::unique_ptr<Enemy>> enemies;
for (auto& e : enemies) e->Attack();   // dynamic dispatch` },
          { label: 'Checked downcast', code: `if (auto* boss = dynamic_cast<Boss*>(enemy)) {
    boss->Enrage();
}` },
          { label: 'Avoid slicing', code: `void Fight(Enemy e);    // copies only the Enemy part!
void Fight(Enemy& e);   // keeps the dynamic type` },
          { label: 'Bring base overloads back', code: `struct Boss : Enemy {
    using Enemy::Attack;           // un-hide base overloads
    void Attack(int power);
};` },
          { label: 'Virtual destructor rule', text: 'A class with any virtual function (or deleted through a base pointer) needs a public virtual destructor.' },
        ],
      },
    ],
  },
  // --------------------------------------------------------------- templates
  {
    id: 'cpp-templates',
    title: 'Templates & Concepts',
    course: 'cpp',
    icon: '🧬',
    description: 'Function and class templates, specialisation, compile-time branching, concepts and variadic templates.',
    sections: [
      {
        title: 'Function templates',
        items: [
          { label: 'Basic', code: `template <typename T>
T Max(T a, T b) { return a < b ? b : a; }
Max(3, 7);          // T deduced as int` },
          { label: 'Explicit argument', code: `Max<double>(3, 2.5);   // avoids deduction conflict` },
          { label: 'Several parameters', code: `template <typename A, typename B>
auto Add(A a, B b) { return a + b; }` },
          { label: 'Abbreviated (C++20)', code: `void Print(const auto& value) { std::cout << value; }` },
          { label: 'Non-type parameter', code: `template <int N>
int Times(int x) { return x * N; }
Times<3>(5);   // 15` },
          { label: 'Default template argument', code: `template <typename T = int>
T Zero() { return T{}; }` },
          { label: 'Templates live in headers', text: 'The compiler needs the full definition at every point of use to instantiate it.' },
        ],
      },
      {
        title: 'Class templates',
        items: [
          { label: 'Basic', code: `template <typename T>
class Pool {
public:
    void Add(T item) { items.push_back(std::move(item)); }
private:
    std::vector<T> items;
};
Pool<Enemy> enemies;` },
          { label: 'Member defined outside', code: `template <typename T>
void Pool<T>::Add(T item) { items.push_back(std::move(item)); }` },
          { label: 'Value parameter', code: `template <typename T, std::size_t N>
struct Ring { std::array<T, N> data{}; };
Ring<float, 60> frameTimes;` },
          { label: 'CTAD (C++17)', code: `std::pair p{1, 2.5};       // std::pair<int, double>
std::vector v{1, 2, 3};     // std::vector<int>` },
          { label: 'Alias template', code: `template <typename T>
using Grid = std::vector<std::vector<T>>;
Grid<int> heights;` },
          { label: 'Compile-time check', code: `template <typename T>
class Stack {
    static_assert(std::is_copy_constructible_v<T>, "T must be copyable");
};` },
        ],
      },
      {
        title: 'Specialisation & compile-time logic',
        items: [
          { label: 'Full specialisation', code: `template <typename T> struct Name { static constexpr auto v = "?"; };
template <> struct Name<int> { static constexpr auto v = "int"; };` },
          { label: 'Partial specialisation', code: `template <typename T> struct Name<T*> { static constexpr auto v = "ptr"; };`, text: 'Classes only; overload function templates instead.' },
          { label: 'if constexpr', code: `template <typename T>
std::string Describe(const T& x) {
    if constexpr (std::is_integral_v<T>) return "integer";
    else return "other";
}` },
          { label: 'Type traits', code: `#include <type_traits>
std::is_same_v<T, int>
std::is_floating_point_v<T>
std::remove_cvref_t<T>` },
          { label: 'decltype', code: `decltype(a + b) sum = a + b;` },
          { label: 'Specialise std::hash', code: `template <>
struct std::hash<GridPos> {
    std::size_t operator()(const GridPos& p) const noexcept {
        return std::hash<int>{}(p.x) ^ (std::hash<int>{}(p.y) << 1);
    }
};` },
        ],
      },
      {
        title: 'Concepts (C++20)',
        items: [
          { label: 'Standard concepts', code: `#include <concepts>
std::integral  std::floating_point  std::same_as<T, U>
std::copyable  std::totally_ordered  std::invocable<F, Args...>` },
          { label: 'Constrained parameter', code: `template <std::integral T>
T Half(T x) { return x / 2; }` },
          { label: 'Constrained auto', code: `void Heal(std::integral auto amount);` },
          { label: 'requires clause', code: `template <typename T>
    requires std::integral<T> || std::floating_point<T>
T Abs(T x) { return x < 0 ? -x : x; }` },
          { label: 'Define a concept', code: `template <typename T>
concept Damageable = requires(T t, int n) {
    t.TakeDamage(n);
    { t.IsAlive() } -> std::convertible_to<bool>;
};` },
          { label: 'Overload on concepts', code: `void Hit(Damageable auto& t) { t.TakeDamage(10); }
void Hit(auto&) { /* fallback: less constrained */ }` },
        ],
      },
      {
        title: 'Variadic templates',
        items: [
          { label: 'Parameter pack', code: `template <typename... Args>
void Log(const Args&... args) {
    (std::cout << ... << args) << '\\n';   // fold expression
}
Log("HP: ", 42, '/', 100);` },
          { label: 'Count the pack', code: `sizeof...(Args)` },
          { label: 'Perfect forwarding', code: `template <typename T, typename... Args>
std::unique_ptr<T> Make(Args&&... args) {
    return std::make_unique<T>(std::forward<Args>(args)...);
}` },
          { label: 'Fold over operator', code: `template <typename... Ts>
auto Sum(Ts... xs) { return (xs + ... + 0); }` },
        ],
      },
    ],
  },
];
