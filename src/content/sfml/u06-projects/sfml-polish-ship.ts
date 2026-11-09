import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-polish-ship',
  title: 'Polish, Performance and Shipping',
  summary: 'Add screen shake, hit flashes and particles for game feel, measure frame time before optimising, and package a Release build that runs on another machine.',
  minutes: 24,
  objectives: [
    'Add cheap effects (screen shake, flash, particles) that make a game feel better',
    'Draw many particles with a single batched `sf::VertexArray`',
    'Measure frame time in milliseconds and decide whether performance is a problem',
    'Explain the difference between Debug and Release builds for speed',
    'Package a game with its libraries and assets and test it like a player would',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Juice: small effects, big feel',
      blocks: [
        {
          type: 'p',
          text: 'Two games can have identical rules and feel completely different. The difference is usually **game feel**, sometimes called *juice*: the small, cheap reactions that tell the player "that mattered". Nearly all of them are a few lines each, and they all work the same way: a value jumps up when something happens, then decays back to rest over a fraction of a second.',
        },
        {
          type: 'table',
          caption: 'Cheap effects, and what each costs.',
          headers: ['Effect', 'How', 'Cost'],
          rows: [
            ['Screen shake', 'Offset the camera by a random amount that decays', '3 lines and a float'],
            ['Hit flash', 'Draw white for 0.05 to 0.1 seconds', 'A timer and a colour'],
            ['Particles', 'Spawn short-lived dots with random velocities', 'A small class'],
            ['Sound variation', 'Random pitch within 5% (Audio lesson)', 'One call'],
            ['Hit-stop', 'Freeze updates for 2 or 3 frames on a big hit', 'A counter'],
          ],
        },
        {
          type: 'code',
          code: `// When something big happens:
trauma = std::min(1.f, trauma + 0.6f);

// Every frame:
trauma = std::max(0.f, trauma - dt * 1.5f);
const float shake = trauma * trauma * 14.f;     // pixels

sf::View view = window.getDefaultView();
view.move({unit(rng) * shake, unit(rng) * shake});
window.setView(view);`,
          annotations: [
            { lines: 2, text: 'When a big event happens, add to a **trauma** value between 0 and 1, capped at 1.' },
            { lines: [5, 6], text: 'Trauma drains away over time. Squaring it before turning it into pixels means small amounts barely shake and large amounts shake hard.' },
            { lines: [8, 10], text: 'Apply the shake as a temporary offset to a **copy** of the default view, so the real camera or HUD view is untouched.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why square the trauma?',
          text: 'If shake were proportional to trauma, a small hit at 0.2 would still jiggle the screen at a fifth of the maximum, which looks like a bug rather than an effect. Squaring gives a curve that stays gentle for small values (0.2 becomes 0.04) and builds quickly near the top (0.9 becomes 0.81). Hits then feel proportionate, and you can stack several small hits into one big shake.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Effects should never decide the game',
          text: 'Shake, flash and particles are for the eye only. Keep them out of the rules: do not use the shaken view for collision or mouse aiming, and let players turn the shake down or off, because strong camera movement bothers some people.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'The shake offset is `trauma * trauma * 14.f` instead of `trauma * 14.f`. What does squaring achieve?',
      options: [
        { text: 'Small amounts of trauma give almost no shake, while large amounts shake strongly, which feels proportionate.', correct: true, why: 'Squaring a number between 0 and 1 makes it smaller, and more so for small values, so the response curve bends upward.' },
        { text: 'It makes the shake last longer.', why: 'Duration is set by how fast trauma decays, not by squaring it.' },
        { text: 'It makes the result an integer number of pixels.', why: 'Squaring does not round anything.' },
        { text: 'It keeps the value from going negative, which would crash.', why: 'Trauma is already clamped at 0, and a negative value would not crash.' },
      ],
      explanation: 'Squaring reshapes the response, so tiny hits are subtle and big hits are dramatic.',
    },
    {
      kind: 'concept',
      title: 'Particles in one draw call',
      blocks: [
        {
          type: 'p',
          text: 'A burst of sparks is a few dozen tiny short-lived objects. Each one needs a position, a velocity and a remaining life. A particle is a plain struct, a `std::vector` holds them, and removing the expired ones uses the same erase-remove idiom as the entity list:',
        },
        {
          type: 'code',
          code: `void update(float dt) {
    const float drag = std::pow(0.05f, dt);
    for (Particle& p : m_particles) {
        p.position += p.velocity * dt;
        p.velocity *= drag;
        p.life -= dt;
    }
    m_particles.erase(std::remove_if(m_particles.begin(), m_particles.end(),
                                     [](const Particle& p) { return p.life <= 0.f; }),
                      m_particles.end());
}`,
          annotations: [
            { lines: 2, text: 'Drag as `0.05^dt`: after one second only 5% of the speed is left, and it comes out the same at any frame rate. (A plain `v *= 0.95f` per frame would not.)' },
            { lines: [3, 7], text: 'Move, slow down and age every particle.' },
            { lines: [8, 10], text: 'Erase the ones whose life has run out, in one pass at the end.' },
          ],
        },
        {
          type: 'p',
          text: 'Drawing them is where the vertex array lesson pays off. Instead of one shape and one draw call per particle, build **one** triangle list and draw it once. The array is rebuilt each frame because the number of particles keeps changing, which is cheap:',
        },
        {
          type: 'code',
          code: `void draw(sf::RenderTarget& target, sf::RenderStates states) const override {
    sf::VertexArray quads(sf::PrimitiveType::Triangles, m_particles.size() * 6);
    std::size_t v = 0;
    for (const Particle& p : m_particles) {
        const float fade = p.life / p.maxLife;
        const sf::Color colour(255, static_cast<std::uint8_t>(210.f * fade), 60,
                               static_cast<std::uint8_t>(255.f * fade));
        const float h = 1.5f + 2.5f * fade;
        const sf::Vector2f tl = p.position + sf::Vector2f(-h, -h);
        const sf::Vector2f tr = p.position + sf::Vector2f(h, -h);
        const sf::Vector2f bl = p.position + sf::Vector2f(-h, h);
        const sf::Vector2f br = p.position + sf::Vector2f(h, h);
        for (const sf::Vector2f corner : {tl, tr, bl, bl, tr, br}) {
            quads[v++] = sf::Vertex{corner, colour};
        }
    }
    target.draw(quads, states);
}`,
          annotations: [
            { lines: 2, text: 'Six vertices per particle (two triangles), allocated up front for the exact number alive.' },
            { lines: [5, 8], text: 'Fade from yellow-white to red and from opaque to transparent as the particle ages, and shrink it a little too.' },
            { lines: [9, 12], text: 'Work out the four corners of a small square around the particle.' },
            { lines: [13, 15], text: 'Append the six vertices of the two triangles that make the square, reusing two corners.' },
            { lines: 17, text: 'One draw call, however many particles there are.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why rebuild the vertex array every frame?',
          text: 'Particles move and fade every frame, so every vertex changes anyway. Rebuilding costs a loop over the live particles, which for a few hundred is trivial, and it avoids having to track which slot in a fixed array belongs to which particle. The expensive thing was never the arithmetic, it was the number of draw calls, and that stays at one.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'A particle system needs one `sf::Sprite` or shape and one `window.draw` call for every particle.',
      answer: false,
      explanation: 'Particles can all be written into one `sf::VertexArray` and drawn with a single call. Per-particle draw calls are the slow way, and are what batching removes.',
    },
    {
      kind: 'concept',
      title: 'Measure first: frame time, not FPS',
      blocks: [
        {
          type: 'p',
          text: 'Most games run fine without any tuning, so the first question is whether there is a problem at all, and the second is where. Count the time **per frame in milliseconds**. It is the number that adds up: a 60 frames-per-second game has 16.7 ms to do everything, and each part you add takes a slice of it.',
        },
        {
          type: 'code',
          code: `++fpsFrames;
fpsTimer += dt;
if (fpsTimer >= 0.5f) {
    const float ms = 1000.f * fpsTimer / static_cast<float>(fpsFrames);
    window.setTitle("Space = hit   |   " + std::to_string(ms).substr(0, 4) + " ms per frame");
    fpsTimer = 0.f;
    fpsFrames = 0;
}`,
          annotations: [
            { lines: 1, text: 'Count the frames drawn and the time that passed.' },
            { lines: 4, text: 'Every half second, divide the time by the number of frames to get the average milliseconds per frame.' },
            { lines: 5, text: 'Show it in the window title, so the game needs no font to report it.' },
          ],
        },
        {
          type: 'table',
          caption: 'The same-looking FPS drops are very different in cost.',
          headers: ['Change', 'Frame time before', 'Frame time after', 'Extra cost'],
          rows: [
            ['60 to 55 FPS', '16.7 ms', '18.2 ms', '1.5 ms'],
            ['1000 to 950 FPS', '1.00 ms', '1.05 ms', '0.05 ms'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why milliseconds and not frames per second?',
          text: 'FPS is the **reciprocal** of frame time, so it bends: the same extra cost looks like a huge drop at high FPS and a tiny one at low FPS. Frame time is linear, so costs add: if physics takes 2 ms and drawing takes 6 ms, together they take 8 ms. That is the arithmetic you need to find out what to fix.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Check the build type first',
          text: 'A **Debug** build has no optimisation and extra checking, and can be many times slower than **Release**. Judging performance from a Debug build, or fixing a slowdown that only exists there, is the most common wasted afternoon. Always measure a Release build.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'V-sync or a frame limit: pick one',
          text: '`window.setVerticalSyncEnabled(true)` ties the frame rate to the monitor, and `window.setFramerateLimit(n)` sleeps to hit a number. Either stops the game from running flat out. Using both is redundant, so choose one. With either on, the frame time you read is the *limit*, so to see real cost turn both off while profiling.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Dropping from 1000 FPS to 950 FPS costs about as much time per frame as dropping from 60 FPS to 55 FPS.',
      answer: false,
      explanation: '60 to 55 FPS is about 1.5 ms extra per frame, while 1000 to 950 is only about 0.05 ms. FPS compresses small costs at high rates, so compare frame times in milliseconds instead.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the average frame time in milliseconds.',
      template: 'const float ms = 1000.f * ___ / static_cast<float>(___);',
      blanks: [{ answers: ['fpsTimer'] }, { answers: ['fpsFrames'] }],
      wordBank: ['fpsTimer', 'fpsFrames', 'dt', 'trauma', 'flash'],
      explanation: 'Total seconds divided by the number of frames is seconds per frame; multiplying by 1000 turns it into milliseconds.',
    },
    {
      kind: 'concept',
      title: 'Fixing what you measured',
      blocks: [
        {
          type: 'p',
          text: 'When the frame time really is too high, the cause in a small SFML game is nearly always one of a few things. A profiler (the Visual Studio Performance Profiler on Windows, or `perf` on Linux) tells you which, and the usual suspects are:',
        },
        {
          type: 'list',
          items: [
            '**Loading inside the loop.** Reading a file or building a texture every frame (or when something spawns). Load once, up front, and share it (Resource Management).',
            '**Too many draw calls.** Thousands of separate sprites or shapes. Batch into a vertex array (Vertex Arrays and Tilemaps).',
            '**Rebuilding text every frame.** `setString` regenerates geometry, so only call it when the value changes (Text and Fonts).',
            '**Copies where references would do.** Passing a `std::vector` or a string by value to a function every frame. Use `const&`.',
            '**Quadratic loops.** Comparing every object with every other. Use a grid when the count grows (Collision Detection).',
            '**Debug builds.** Not a code problem, as covered above.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why measure before changing code?',
          text: 'Programmers are notoriously bad at guessing where time goes. The part that looks slow is often negligible, and the real cost is a line nobody suspected. Optimising unmeasured code adds complexity and risk for no gain, while a five-minute profile points straight at the one function responsible for most of the time.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The game runs at 12 FPS in Release even though the scene is tiny. Tap the line causing the slowdown.',
      code: `while (window.isOpen()) {
    sf::Texture texture("assets/hit.png");
    sf::Sprite sprite(texture);
    window.clear();
    window.draw(sprite);
    window.display();
}`,
      bugLines: [2],
      explanation: 'The texture is read from disk and uploaded to the graphics card **every frame**. Load it once before the loop (or through a resource cache) and let the sprite borrow it.',
    },
    {
      kind: 'concept',
      title: 'Preparing a Release build',
      blocks: [
        {
          type: 'p',
          text: 'Shipping means giving someone a folder they can run on a computer that has none of your tools. Start with a **Release** configuration, then make sure everything the program needs is in that folder: the SFML libraries (if you linked them dynamically), the assets, and nothing that only exists on your machine.',
        },
        {
          type: 'code',
          lang: 'cmake',
          code: `add_executable(game WIN32 src/main.cpp)
target_link_libraries(game PRIVATE
    SFML::Graphics SFML::Audio
    $<$<PLATFORM_ID:Windows>:SFML::Main>)

set_target_properties(game PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY \${CMAKE_BINARY_DIR}/dist)

add_custom_command(TARGET game POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy_directory
            \${CMAKE_SOURCE_DIR}/assets
            $<TARGET_FILE_DIR:game>/assets)`,
          annotations: [
            { lines: [1, 4], text: '`WIN32` makes the program a windowed application on Windows, so no console window opens behind the game (other platforms ignore it). It then needs `SFML::Main`, which supplies the Windows entry point that calls your normal `main`, so your code stays as it is.' },
            { lines: 3, text: 'Link every SFML module you use, here Graphics and Audio.' },
            { lines: 4, text: 'A generator expression: link `SFML::Main` only on Windows, where it exists.' },
            { lines: [6, 7], text: 'Put the built program in a `dist` folder, to keep what you ship apart from build files.' },
            { lines: [9, 12], text: 'The same asset-copy step as in the resources lesson, so the assets always sit next to the program.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does a program that works for you fail on another machine?',
          text: 'On your machine the SFML DLLs, assets and the right Visual C++ runtime are found because your development tools put them there, or put them on the search path. A clean machine has none of that. With dynamic linking the `.exe` needs the SFML DLLs next to it, and builds made with Visual Studio also need the matching Microsoft Visual C++ runtime installed (or linked statically). Testing in a clean folder, or on a different computer, is the only reliable way to find out what you forgot.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Static or dynamic?',
          text: 'Linking SFML **statically** puts its code inside your `.exe`, so there are fewer files to ship. Linking **dynamically** keeps `sfml-*.dll` files beside it. CMake chooses between them with the standard `BUILD_SHARED_LIBS` option, so check your output folder: if you see `sfml-*.dll` files you linked dynamically, and they must travel with the game.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Small touches for a finished feel',
          text: 'Set a window icon with `window.setIcon(image)`. On laptops with two graphics chips, put `SFML_DEFINE_DISCRETE_GPU_PREFERENCE` in one source file (at global scope) so the driver can pick the faster one. Catch exceptions in `main` and show a clear message, as in the resources lesson, rather than letting the program vanish.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'A shipping checklist',
      blocks: [
        {
          type: 'steps',
          items: [
            { title: 'Build in Release', text: 'Switch the configuration to Release (or `-DCMAKE_BUILD_TYPE=Release`) and rebuild everything, not just your files.' },
            { title: 'Collect the files', text: 'Put the executable, any `sfml-*.dll` files, and the `assets` folder together in a new, empty folder.' },
            { title: 'Check the licences', text: 'Confirm you may distribute every font, sound and image. Keep a text file crediting the sources where licences require it.' },
            { title: 'Run it from that folder', text: 'Launch it by double-clicking, not from the IDE, so the working directory and search path are the same as a player\'s.' },
            { title: 'Test on another machine', text: 'Try a computer with no development tools. A missing DLL, runtime or asset shows up immediately.' },
            { title: 'Zip it', text: 'Archive the folder with a clear name and version, such as `MyGame-1.0-windows.zip`, and include a short readme with the controls.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why run it outside the IDE?',
          text: 'An IDE launches your game with its own settings: a working directory (often the project folder), extra search paths and environment variables. A game that finds its assets and DLLs only because of those settings will fail the moment a player double-clicks it. Running the packed folder by itself reproduces what the player will actually experience.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The whole demo',
      blocks: [
        {
          type: 'p',
          text: 'This program pulls the effects and the frame-time counter together. Press **Space** to hit the blue block: the screen shakes, the block flashes white and a burst of sparks flies out. The window title shows the average milliseconds per frame.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <optional>
#include <random>
#include <string>
#include <vector>

struct Particle {
    sf::Vector2f position;
    sf::Vector2f velocity;
    float life;
    float maxLife;
};

class ParticleSystem : public sf::Drawable {
public:
    void emit(sf::Vector2f origin, int count, std::mt19937& rng) {
        std::uniform_real_distribution<float> angle(0.f, 6.2831853f);
        std::uniform_real_distribution<float> speed(60.f, 260.f);
        std::uniform_real_distribution<float> lifetime(0.4f, 0.9f);
        for (int i = 0; i < count; ++i) {
            const float a = angle(rng);
            const float s = speed(rng);
            const float life = lifetime(rng);
            m_particles.push_back({origin, {std::cos(a) * s, std::sin(a) * s}, life, life});
        }
    }

    void update(float dt) {
        const float drag = std::pow(0.05f, dt);
        for (Particle& p : m_particles) {
            p.position += p.velocity * dt;
            p.velocity *= drag;
            p.life -= dt;
        }
        m_particles.erase(std::remove_if(m_particles.begin(), m_particles.end(),
                                         [](const Particle& p) { return p.life <= 0.f; }),
                          m_particles.end());
    }

private:
    void draw(sf::RenderTarget& target, sf::RenderStates states) const override {
        sf::VertexArray quads(sf::PrimitiveType::Triangles, m_particles.size() * 6);
        std::size_t v = 0;
        for (const Particle& p : m_particles) {
            const float fade = p.life / p.maxLife;
            const sf::Color colour(255, static_cast<std::uint8_t>(210.f * fade), 60,
                                   static_cast<std::uint8_t>(255.f * fade));
            const float h = 1.5f + 2.5f * fade;
            const sf::Vector2f tl = p.position + sf::Vector2f(-h, -h);
            const sf::Vector2f tr = p.position + sf::Vector2f(h, -h);
            const sf::Vector2f bl = p.position + sf::Vector2f(-h, h);
            const sf::Vector2f br = p.position + sf::Vector2f(h, h);
            for (const sf::Vector2f corner : {tl, tr, bl, bl, tr, br}) {
                quads[v++] = sf::Vertex{corner, colour};
            }
        }
        target.draw(quads, states);
    }

    std::vector<Particle> m_particles;
};

int main() {
    sf::RenderWindow window(sf::VideoMode({640u, 480u}), "Juice");
    window.setVerticalSyncEnabled(true);

    std::mt19937 rng{std::random_device{}()};
    std::uniform_real_distribution<float> unit(-1.f, 1.f);

    sf::RectangleShape target({120.f, 120.f});
    target.setOrigin({60.f, 60.f});
    target.setPosition({320.f, 240.f});

    ParticleSystem particles;
    float trauma = 0.f;
    float flash = 0.f;

    float fpsTimer = 0.f;
    int fpsFrames = 0;

    sf::Clock clock;
    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
                if (key->code == sf::Keyboard::Key::Space) {
                    trauma = std::min(1.f, trauma + 0.6f);
                    flash = 0.08f;
                    particles.emit(target.getPosition(), 40, rng);
                }
            }
        }

        const float dt = std::min(clock.restart().asSeconds(), 0.05f);
        trauma = std::max(0.f, trauma - dt * 1.5f);
        flash = std::max(0.f, flash - dt);
        particles.update(dt);

        ++fpsFrames;
        fpsTimer += dt;
        if (fpsTimer >= 0.5f) {
            const float ms = 1000.f * fpsTimer / static_cast<float>(fpsFrames);
            window.setTitle("Space = hit   |   " + std::to_string(ms).substr(0, 4) + " ms per frame");
            fpsTimer = 0.f;
            fpsFrames = 0;
        }

        const float shake = trauma * trauma * 14.f;
        sf::View view = window.getDefaultView();
        view.move({unit(rng) * shake, unit(rng) * shake});
        window.setView(view);

        target.setFillColor(flash > 0.f ? sf::Color::White : sf::Color(70, 130, 220));

        window.clear(sf::Color(14, 16, 28));
        window.draw(target);
        window.draw(particles);
        window.display();
    }
}`,
          annotations: [
            { lines: [17, 29], text: 'Emitting: each particle gets a random angle, speed and lifetime, and starts at the hit point.' },
            { lines: [31, 41], text: 'Updating: drag, move, age, then erase the expired.' },
            { lines: [44, 61], text: 'Drawing all particles with one vertex array and one draw call.' },
            { lines: 91, text: 'A hit raises the trauma, starts the flash and emits the sparks.' },
            { lines: [103, 110], text: 'The frame-time counter, refreshed every half second.' },
            { lines: [112, 115], text: 'The shake is applied to a copy of the default view.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Where to use it',
          text: 'Drop the `ParticleSystem` into either project: emit a burst where a shooter enemy dies, or where the Pong ball hits a paddle. Add the shake on damage, play a varied sound from the Audio lesson, and you will see how much of a game\'s feel comes from effects that take minutes to write.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the steps of preparing a release in order.',
      lines: [
        'Rebuild everything in a Release configuration',
        'Copy the executable, DLLs and assets into a clean folder',
        'Run it from that folder by double-clicking',
        'Test it on a computer with no development tools',
        'Zip it with a version number and a readme',
      ],
      linesAreCode: false,
      explanation: 'Build first, then gather exactly what is needed, then test as the player will run it (in the folder, then on another machine), and package only after it works.',
    },
  ],
  takeaways: [
    'Game feel comes from cheap, decaying effects: screen shake from a squared trauma value, hit flashes and particles, never allowed to affect the rules.',
    'Draw particles in one `sf::VertexArray` and one draw call, and remove expired ones with erase-remove.',
    'Measure frame time in milliseconds in a Release build before optimising; FPS hides the real cost of small changes.',
    'Common SFML slowdowns: loading in the loop, too many draw calls, rebuilding text, copies, and quadratic loops.',
    'Ship a Release build with its libraries and assets in one folder, and test it by double-clicking on a different machine.',
  ],
  reading: [
    { title: 'Game Programming Patterns: Game Loop', url: 'https://gameprogrammingpatterns.com/game-loop.html', source: 'article', note: 'Frame time, fixed and variable steps, and why they matter.' },
    { title: 'Designing your own entities with vertex arrays', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/vertex-array/', source: 'other', note: 'Includes a particle system built on a vertex array.' },
  ],
};
