import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-resource-management',
  title: 'Resource Management',
  summary: 'Load each texture, font and sound once, share it safely through a cache, fail with a clear message, and make sure your assets are next to the executable.',
  minutes: 18,
  objectives: [
    'Explain why loading a resource per object wastes time and memory',
    'Write a `ResourceCache` template that loads on first use and hands out references',
    'Explain why a `std::map` can hand out stable references and a `std::vector` cannot',
    'Handle a missing asset with a clear error instead of a blank screen',
    'Copy assets next to the executable with CMake',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The problem: every object loads its own',
      blocks: [
        {
          type: 'p',
          text: 'You learned that sprites point at textures, fonts back texts and buffers back sounds. The easiest first design is to let each object load what it needs, in its constructor. It works, then falls apart in the first level that has fifty enemies:',
        },
        {
          type: 'code',
          code: `class Enemy {
public:
    Enemy()
        : m_texture("assets/enemy.png")   // reads the file from disk
        , m_sprite(m_texture) {}

private:
    sf::Texture m_texture;                // its own copy in graphics memory
    sf::Sprite  m_sprite;
};`,
          annotations: [
            { lines: 4, text: 'Every enemy hits the disk and decodes the PNG again. Fifty enemies means fifty identical reads, and a hitch every time one spawns.' },
            { lines: 5, text: 'The sprite points at `m_texture`. If an `Enemy` is ever copied or moved, the new sprite may still point at the **old** texture.' },
            { lines: 8, text: 'Every enemy also keeps **its own copy** of the same pixels in graphics memory. Fifty enemies, fifty copies.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is sharing so much better?',
          text: 'A texture is data, and enemies only need to *read* it. One texture shared by every enemy sprite costs one disk read, one slot of graphics memory, and, because sprites that share a texture can be drawn together efficiently, fewer draw calls too. The sprites are tiny objects that point at it. Sharing also removes the lifetime puzzle: there is exactly one owner, and it lives for the whole game.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'You already met the lifetime rule',
          text: 'Back in the textures lesson a [[sfml-sprite]] only **points at** its [[sfml-texture]]. A resource manager is the standard way to meet that rule: one long-lived owner of the pixels, and lots of cheap things that borrow them.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A game spawns 200 bullets per level, and each `Bullet` constructor loads `"assets/bullet.png"` into its own `sf::Texture`. What is the main cost?',
      options: [
        { text: '200 disk reads and 200 copies of the same pixels in graphics memory.', correct: true, why: 'The same file is decoded and uploaded each time, wasting time at spawn and memory for the whole level.' },
        { text: 'The sprites cannot be rotated.', why: 'Rotation does not depend on how the texture was loaded.' },
        { text: 'The compiler will refuse to build it.', why: 'It compiles fine; the cost is at run time.' },
        { text: 'There is no cost; SFML detects the duplicates.', why: 'SFML does not deduplicate textures for you. Sharing them is your job.' },
      ],
      explanation: 'Textures are heavy and read-only, so they should be loaded once and shared. Sprites are the cheap things that vary per object.',
    },
    {
      kind: 'concept',
      title: 'A resource cache',
      blocks: [
        {
          type: 'p',
          text: 'The fix is a small class that loads a file the **first time** it is asked for, remembers it, and hands out a reference after that. Textures, sound buffers and fonts can share one template. The only snag is that fonts load with `openFromFile`, while the rest use `loadFromFile`, so a tiny overloaded function hides the difference:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Audio.hpp>
#include <SFML/Graphics.hpp>
#include <filesystem>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>

inline bool loadResource(sf::Texture& t, const std::string& path)     { return t.loadFromFile(path); }
inline bool loadResource(sf::SoundBuffer& b, const std::string& path) { return b.loadFromFile(path); }
inline bool loadResource(sf::Font& f, const std::string& path)        { return f.openFromFile(path); }

template <typename Resource>
class ResourceCache {
public:
    explicit ResourceCache(std::string folder) : m_folder(std::move(folder)) {}

    const Resource& get(const std::string& name) {
        auto [slot, isNew] = m_items.try_emplace(name);
        if (isNew && !loadResource(slot->second, m_folder + "/" + name)) {
            m_items.erase(slot);
            throw std::runtime_error("Could not load " + m_folder + "/" + name);
        }
        return slot->second;
    }

private:
    std::string m_folder;
    std::map<std::string, Resource> m_items;
};

int main() {
    try {
        // Make an example asset so this program is self-contained.
        std::filesystem::create_directories("assets");
        const sf::Image block(sf::Vector2u(32u, 32u), sf::Color(200, 80, 80));
        if (!block.saveToFile("assets/block.png")) {
            std::cerr << "Could not write the example asset\\n";
            return 1;
        }

        ResourceCache<sf::Texture> textures("assets");
        const sf::Texture& first  = textures.get("block.png");
        const sf::Texture& second = textures.get("block.png");
        std::cout << std::boolalpha << "Same object: " << (&first == &second) << '\\n';

        sf::RenderWindow window(sf::VideoMode({320u, 200u}), "Resource cache");
        sf::Sprite left(first);
        sf::Sprite right(second);
        left.setPosition({80.f, 80.f});
        right.setPosition({200.f, 80.f});

        while (window.isOpen()) {
            while (const std::optional event = window.pollEvent()) {
                if (event->is<sf::Event::Closed>()) {
                    window.close();
                }
            }
            window.clear(sf::Color(25, 25, 40));
            window.draw(left);
            window.draw(right);
            window.display();
        }
    } catch (const std::exception& error) {
        std::cerr << "Fatal: " << error.what() << '\\n';
        return 1;
    }
}`,
          annotations: [
            { lines: [9, 11], text: '**Overloads** pick the right loading function for each type at compile time. Adding a new resource type means adding one line here.' },
            { lines: 14, text: 'One template serves every resource type. `Resource` becomes `sf::Texture`, `sf::SoundBuffer` or `sf::Font`.' },
            { lines: 19, text: '`try_emplace` inserts an empty resource only if the name is new, and tells us whether it did. The loaded object lives **inside the map**, so it is never copied or moved.' },
            { lines: [20, 23], text: 'First request for this name: load it. If loading fails, remove the empty entry (so a later call retries) and throw with the file name in the message.' },
            { lines: 24, text: 'Both new and old names end here: return a reference to the one stored copy.' },
            { lines: 29, text: 'A `std::map` never moves its elements when others are inserted, so references handed out earlier stay valid. That is the property the whole design depends on.' },
            { lines: [43, 45], text: 'The second request returns the same object, so both sprites point at one texture. The line prints `true`.' },
            { lines: [64, 67], text: 'A `catch` at the top turns a missing file into a readable message. `sf::Exception` is a kind of `std::runtime_error`, so this also catches SFML\'s own load failures.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does a std::map keep references valid, and a vector does not?',
          text: 'A `std::map` stores each element in its own node, and inserting another node never moves the existing ones. A `std::vector` keeps its elements in one contiguous block, and when it grows it allocates a bigger block and **moves everything**, leaving earlier references pointing at freed memory. So a cache must use a node-based container (`std::map` or `std::unordered_map`). A vector of textures with references into it would be a [[dangling-reference]] waiting to happen.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not put sf::Music in the cache',
          text: '`sf::Music` is a stream tied to an open file and is not copyable, and you rarely have more than one track playing. Keep a single `sf::Music` (or a small music player class) as a member of your audio system instead of caching it by name.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'It is safe to hold a reference to an element of a `std::vector<sf::Texture>` while you keep calling `push_back` on that vector.',
      answer: false,
      explanation: '`push_back` may reallocate and move every element, so earlier references dangle. Use a node-based container such as `std::map` (or store `std::unique_ptr<sf::Texture>`) when references must stay valid.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the declaration so that references to textures stay valid however many more are loaded.',
      template: 'std::___<std::string, sf::Texture> m_items;',
      blanks: [{ answers: ['map', 'unordered_map'] }],
      wordBank: ['map', 'unordered_map', 'vector', 'array', 'deque'],
      explanation: 'Both `map` and `unordered_map` keep elements in nodes that never move once inserted, and they match the `<string, Texture>` shape. A `vector` or `array` is not keyed by string.',
    },
    {
      kind: 'concept',
      title: 'When files go missing, and shipping assets',
      blocks: [
        {
          type: 'p',
          text: 'The most common run-time failure in an SFML game is a file that is not where the program looks. Two habits remove most of the pain. First, **load early and fail loudly**: preload what a level needs before it starts (so there are no disk hitches mid-fight) and let a missing file stop the game with a message that includes the path. Second, **put the assets where the executable can find them**, because relative paths depend on the [[working-directory]].',
        },
        {
          type: 'code',
          lang: 'cmake',
          code: `add_executable(game src/main.cpp)
target_link_libraries(game PRIVATE SFML::Graphics SFML::Audio)

# Copy the assets folder next to the executable after every build.
add_custom_command(TARGET game POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy_directory
            \${CMAKE_SOURCE_DIR}/assets
            $<TARGET_FILE_DIR:game>/assets)`,
          annotations: [
            { lines: 2, text: '`SFML::Audio` is needed as soon as you use sounds or music, in addition to `SFML::Graphics`.' },
            { lines: [5, 8], text: '`POST_BUILD` runs after the executable is linked. It copies the whole `assets` folder into the folder that holds the built program, so `"assets/..."` paths work however you launch it.' },
            { lines: 8, text: '`$<TARGET_FILE_DIR:game>` is a generator expression: the folder of the built `game` program, which differs per configuration (Debug, Release) and per generator.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why load everything before the level starts?',
          text: 'Reading and decoding a file can take milliseconds to hundreds of milliseconds, far longer than a 16 ms frame. If the first shot of the level loads its sound then, the game visibly freezes at that moment, and it is different every run depending on disk speed. Loading up front (behind a loading bar if need be) moves all of that to a place where players expect a wait.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A debug checklist for "my image does not show"',
          text: 'Print the path you are loading and `std::filesystem::current_path()`. Check the file really exists at that path, with the right extension and case (Linux is case-sensitive). Check the load result or exception message. Finally check the draw: a texture that loaded but a sprite whose position is off-screen looks exactly like a load failure.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Sprites that were created from textures returned by this function sometimes show garbage after more textures are loaded. Tap the line that returns the dangling reference.',
      code: `const sf::Texture& load(const std::string& path) {
    sf::Texture texture(path);
    m_textures.push_back(std::move(texture));
    return m_textures.back();
}`,
      bugLines: [4],
      explanation: '`m_textures` is a `std::vector`. The next `push_back` may reallocate it and move every texture, leaving the reference this function handed out pointing at freed memory. Store textures in a `std::map` (or `unordered_map`), whose elements never move.',
    },
    {
      kind: 'order',
      prompt: 'Put the steps of `ResourceCache::get` in the right order.',
      lines: [
        'Look up (or insert an empty slot for) the name',
        'If it is new, load the file into that slot',
        'If loading fails, erase the slot and throw',
        'Return a reference to the stored resource',
      ],
      linesAreCode: false,
      explanation: 'Find or create the slot first, load only when it is new, undo and report failure if loading fails, and finally hand back the single stored copy.',
    },
    {
      kind: 'concept',
      title: 'Handing resources to the things that need them',
      blocks: [
        {
          type: 'p',
          text: 'Once the caches exist, the question is how an `Enemy` gets at one. The tidy answer is to **pass it in**. Group the caches into one `Resources` object created in `main`, and give each entity the specific texture it needs when you build it. The entity then never knows about files at all:',
        },
        {
          type: 'code',
          code: `struct Resources {
    ResourceCache<sf::Texture>     textures{"assets/textures"};
    ResourceCache<sf::SoundBuffer> sounds{"assets/sounds"};
    ResourceCache<sf::Font>        fonts{"assets/fonts"};
};

class Enemy {
public:
    explicit Enemy(const sf::Texture& texture) : m_sprite(texture) {}

private:
    sf::Sprite m_sprite;
};

Resources resources;
Enemy grunt(resources.textures.get("grunt.png"));`,
          annotations: [
            { lines: [1, 5], text: 'One owner for everything loaded. It is created early and destroyed last, after every sprite and sound that borrows from it.' },
            { lines: 9, text: 'The enemy asks for a **texture**, not a file name. It cannot fail to load, and it is easy to test with any texture.' },
            { lines: 16, text: 'The caller decides which texture, and the cache makes sure it is loaded only once.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not make the cache a global or a singleton?',
          text: 'A global cache is easy to reach from anywhere, which is exactly the problem: every file in the program quietly depends on it, you cannot tell which code touches it, it is created before `main` in an order you do not control, and you cannot have a second one (for a test, or a level editor). Passing the cache or the individual resource keeps the dependency visible in the function signature, and tells you at a glance which code needs files.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Declare owners before borrowers',
          text: 'Members and locals are destroyed in the **reverse** of the order they are declared. Put `Resources resources;` above any object whose sprites or sounds borrow from it, so the borrowers are destroyed first and never see a dead texture.',
        },
      ],
    },
  ],
  takeaways: [
    'Loading a texture, font or sound per object wastes disk time and graphics memory; load once and share.',
    'A `ResourceCache<T>` keyed by file name loads on first request and returns a reference to the one stored copy.',
    'Use a node-based container (`std::map`) for the cache; a `std::vector` moves its elements as it grows and dangles earlier references.',
    'Throw an exception with the file path when a load fails, and preload a level\'s assets before it starts.',
    'Copy the assets folder next to the executable at build time so relative paths work wherever the game is launched from.',
  ],
  reading: [
    { title: 'Loading resources from files', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/sprite/', source: 'other', note: 'The lifetime rules for textures and sprites.' },
    { title: 'Playing sounds and music', url: 'https://www.sfml-dev.org/tutorials/3.0/audio/sounds/', source: 'other', note: 'Why buffers and streams differ, and how long each must live.' },
  ],
};
