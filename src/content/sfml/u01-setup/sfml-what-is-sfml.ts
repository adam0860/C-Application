import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-what-is-sfml',
  title: 'What SFML Is (and What Changed in SFML 3)',
  summary: 'The five SFML modules, how a library differs from an engine, and the SFML 3 changes that make most old tutorials misleading.',
  minutes: 13,
  objectives: [
    'Name the five SFML modules and say what each one is for',
    'Explain the difference between a library and an engine, and who owns the main loop in each',
    'Recognise the shape of a minimal SFML program',
    'Spot SFML 2 code in an old tutorial and translate it to SFML 3',
    'Describe SFML\'s 2D coordinate system',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'A library, not an engine',
      blocks: [
        {
          type: 'p',
          text: '[[sfml]] stands for *Simple and Fast Multimedia Library*. It is a C++ library that gives you the building blocks every 2D game needs: a window to draw in, keyboard and mouse input, 2D graphics, sound, and basic networking. It does **not** give you a level editor, a physics simulation, an entity system or a scene graph. Those you write yourself, using the C++ you have already learned.',
        },
        {
          type: 'p',
          text: 'That is a feature, not a gap. Because SFML stays out of your way, every game you build with it teaches you how games are actually put together: how the loop runs, how time is measured, how objects are updated and drawn. Those lessons transfer directly to larger engines, including the Unreal Engine course in this app.',
        },
        {
          type: 'table',
          caption: 'The five SFML modules',
          headers: ['Module', 'Header', 'What it gives you'],
          rows: [
            ['System', '`<SFML/System.hpp>`', 'Vectors, time and clocks, angles, threads, file streams'],
            ['Window', '`<SFML/Window.hpp>`', 'Windows, events, keyboard, mouse, joysticks, OpenGL context'],
            ['Graphics', '`<SFML/Graphics.hpp>`', 'Shapes, sprites, textures, text, views, shaders. Includes System and Window.'],
            ['Audio', '`<SFML/Audio.hpp>`', 'Sound effects, streamed music, recording'],
            ['Network', '`<SFML/Network.hpp>`', 'TCP/UDP sockets, packets, HTTP and FTP clients'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is it split into modules?',
          text: 'Each module is a separate library file you link only if you need it. A command-line server can use just System and Network, with no graphics code at all. The modules also form a dependency chain (Graphics needs Window, Window needs System), so including `<SFML/Graphics.hpp>` quietly gives you the other two as well.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which SFML module would you use to draw a sprite on screen?',
      options: [
        { text: 'Graphics', correct: true, why: 'Sprites, textures, shapes and text all live in the Graphics module.' },
        { text: 'Window', why: 'The Window module creates the window and delivers events. It knows nothing about sprites; drawing is Graphics\' job.' },
        { text: 'System', why: 'System holds vectors, clocks and threads, the basics that every other module builds on.' },
        { text: 'Audio', why: 'Audio plays sound. It has no drawing functions at all.' },
      ],
      explanation: 'Window gives you a place to draw; Graphics provides the things you draw with. Because Graphics depends on Window, one include of `<SFML/Graphics.hpp>` is enough for most games.',
    },
    {
      kind: 'concept',
      title: 'Who owns the loop?',
      blocks: [
        {
          type: 'p',
          text: 'The big difference between a library and an engine is *who is in charge*. With a library, **your** `main()` is in charge and calls the library when it needs something. With an engine, the engine runs the show and calls **your** code at the moments it chooses. Programmers call that second arrangement [[inversion-of-control]].',
        },
        {
          type: 'compare',
          left: {
            title: 'SFML (library)',
            tone: 'neutral',
            code: `int main() {
    sf::RenderWindow window(...);
    while (window.isOpen()) {
        // YOU write the loop
        // YOU decide the order
    }
}`,
            text: 'You write the [[game-loop]]. You decide when to read input, update the world and draw.',
          },
          right: {
            title: 'Engine (e.g. Unreal)',
            tone: 'neutral',
            code: `void AEnemy::Tick(float DeltaTime) {
    // The engine calls YOU,
    // once per frame
}`,
            text: 'The engine owns the loop and calls your `Tick` function. You fill in behaviour.',
          },
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'You will meet this loop again',
          text: 'Everything an Unreal actor does in `Tick` is the "update" step of a game loop that SFML makes you write by hand. Understanding it here makes the engine\'s `Tick` and `DeltaTime` feel obvious later.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why learn with a library first?',
          text: 'An engine hides the loop, the clock and the resource handling behind editors and macros. SFML shows you the bare machinery in a few hundred lines. When you later use an engine you will know what it is doing for you, and what it costs.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'SFML includes a built-in physics engine, so you do not need to write your own collision code.',
      answer: false,
      explanation: 'SFML deliberately has no physics or collision system beyond tiny helpers such as `sf::FloatRect::findIntersection`. You write movement and collision yourself (Unit 5), or add a separate library such as Box2D.',
    },
    {
      kind: 'concept',
      title: 'The smallest SFML program',
      blocks: [
        {
          type: 'p',
          text: 'Here is a complete SFML 3 program. It opens an 800×600 window and keeps it open until you close it. Do not worry about every detail yet. The next lessons take it apart. Notice the shape: **create a window, then loop while it is open**.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Hello SFML");

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }

        window.clear(sf::Color::Black);
        window.display();
    }
}`,
          annotations: [
            { lines: 1, text: 'One include pulls in the Graphics module, plus Window and System, which it depends on.' },
            { lines: 4, text: 'Creates the window. `sf::VideoMode({800u, 600u})` is the size in pixels. In SFML 3 sizes and positions are passed as a single vector, not two separate numbers.' },
            { lines: 6, text: 'The game loop: keep going for as long as the window is open.' },
            { lines: 7, text: 'Ask the operating system for the next pending event. `pollEvent()` returns a `std::optional`, which is empty when there is nothing left to handle.' },
            { lines: 8, text: 'Check which kind of event arrived. `is<sf::Event::Closed>()` asks "was this the close button?".' },
            { lines: 13, text: 'Fill the whole window with a colour, erasing last frame\'s picture.' },
            { lines: 14, text: 'Show what we drew. Nothing appears on screen until `display()` is called.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why isn\'t this marked runnable?',
          text: 'Most C++ examples in this app are compiled and run for you. SFML programs open real windows, so instead they are checked against the real SFML 3 headers to prove every call exists. You will run them on your own machine after the next lesson.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the steps of one pass through a game loop in a sensible order.',
      lines: ['Handle events and input', 'Update the game world', 'Clear the window', 'Draw everything', 'Display the finished frame'],
      explanation: 'Input comes first so the update can react to it. The world is updated before it is drawn so the picture matches the latest state. Clear, draw and display always come last, in that order: wipe the old frame, paint the new one, then show it.',
    },
    {
      kind: 'concept',
      title: 'SFML 3 is not SFML 2',
      blocks: [
        {
          type: 'p',
          text: 'SFML 3.0 (released in late 2024) modernised the whole API. It requires C++17 and uses features such as `std::optional`, `enum class` and strongly typed values. The upside is safer, clearer code. The downside is that **a lot of tutorials, videos and Stack Overflow answers still show SFML 2**, and that code will not compile.',
        },
        {
          type: 'table',
          caption: 'Common SFML 2 code and its SFML 3 replacement',
          headers: ['SFML 2', 'SFML 3'],
          rows: [
            ['`sf::VideoMode(800, 600)`', '`sf::VideoMode({800u, 600u})`'],
            ['`sf::Event e; while (window.pollEvent(e))`', '`while (const std::optional e = window.pollEvent())`'],
            ['`e.type == sf::Event::Closed`', '`e->is<sf::Event::Closed>()`'],
            ['`sf::Keyboard::Escape`', '`sf::Keyboard::Key::Escape`'],
            ['`shape.setPosition(10.f, 20.f)`', '`shape.setPosition({10.f, 20.f})`'],
            ['`shape.setRotation(45.f)`', '`shape.setRotation(sf::degrees(45.f))`'],
            ['`sf::Sprite s; s.setTexture(t);`', '`sf::Sprite s(t);`'],
            ['`sf::Text t; t.setFont(f);`', '`sf::Text t(f);`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why break everyone\'s code?',
          text: 'SFML 2 was designed before C++11 existed. Types like `sf::Event` were a union you had to remember to check; `setRotation(45.f)` never said whether 45 meant degrees or radians; a `Sprite` with no texture was legal but drew nothing. SFML 3 makes those mistakes hard to write: the compiler now enforces what used to be a convention. Major versions are the only place a library can make that trade.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'How to spot SFML 2 code',
          text: 'If you see `sf::Event event;` declared before the loop, `event.type ==`, two-argument `setPosition(x, y)`, or a bare number passed to `setRotation`, it is SFML 2. When in doubt, check the version in the tutorial\'s URL (`/tutorials/2.6/` vs `/tutorials/3.0/`) and prefer the official SFML 3 documentation.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This loop was copied from an old SFML 2 tutorial. Tap one line that will not compile with SFML 3.',
      code: `sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Game");
sf::Event event;
while (window.isOpen()) {
    while (window.pollEvent(event)) {
        if (event.type == sf::Event::Closed) {
            window.close();
        }
    }
}`,
      bugLines: [2, 4, 5],
      explanation: 'Three lines are SFML 2 leftovers. In SFML 3 an `sf::Event` is built from a specific event kind (so line 2 cannot declare an empty one), `pollEvent()` takes no argument and returns a `std::optional<sf::Event>` (line 4), and `event.type` no longer exists (line 5). Fixing one means rewriting the whole loop, which in SFML 3 reads `while (const std::optional event = window.pollEvent()) { if (event->is<sf::Event::Closed>()) ... }`.',
    },
    {
      kind: 'concept',
      title: 'The 2D coordinate system',
      blocks: [
        {
          type: 'p',
          text: 'SFML positions everything in **pixels**, measured from the **top-left corner** of the window. The x axis grows to the right, and, unlike the graphs you drew in maths class, the y axis grows **downward**. So `{0, 0}` is the top-left corner and `{800, 600}` would be the bottom-right corner of an 800×600 window.',
        },
        {
          type: 'list',
          items: [
            '**Moving up** means making y smaller; **moving down** means making y larger.',
            'Positions, sizes and velocities are `sf::Vector2f`: two `float`s named `x` and `y`.',
            'Window sizes and pixel counts are `sf::Vector2u` (unsigned) or `sf::Vector2i` (signed), depending on the function.',
            'Rotation is an `sf::Angle`, created with `sf::degrees(...)` or `sf::radians(...)`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does y point down?',
          text: 'Screens are read like text: left to right, top to bottom. Early display hardware scanned out memory in exactly that order, so "row 0" was the top line, and graphics APIs ever since have numbered rows the same way. It feels backwards for a while, then becomes second nature. Remember it and you will avoid a classic bug: gravity being a *positive* y velocity.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A player sprite is at position `{100.f, 300.f}`. To move it **up** the screen by 10 pixels, what should its new position be?',
      options: [
        { text: '{100.f, 290.f}', correct: true, why: 'Up means smaller y, so subtract 10 from the y coordinate.' },
        { text: '{100.f, 310.f}', why: 'That moves it **down**. Remember that y grows downward in SFML.' },
        { text: '{90.f, 300.f}', why: 'Changing x moves a sprite left or right, not up or down.' },
        { text: '{110.f, 300.f}', why: 'Changing x moves a sprite sideways, not vertically.' },
      ],
      codeOptions: true,
      explanation: 'The origin is at the top-left and y increases downward, so decreasing y moves things toward the top. This is the opposite of a maths graph, and it is behind the common mistake of making things fall upward.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the include so this file can use `sf::RenderWindow` and `sf::Sprite`.',
      template: '#include <SFML/___.hpp>',
      blanks: [{ answers: ['Graphics'] }],
      wordBank: ['Graphics', 'Audio', 'Network', 'System'],
      explanation: '`RenderWindow` and `Sprite` both belong to the Graphics module. Graphics already includes Window and System, so this single include is all you need for windows, shapes, sprites and text.',
    },
  ],
  takeaways: [
    'SFML is a multimedia library with five modules (System, Window, Graphics, Audio, Network), not a game engine.',
    'With a library you own `main()` and the game loop; with an engine the engine calls your code.',
    'Every SFML program follows the same shape: create a window, then loop on events, update, draw and display.',
    'SFML 3 requires C++17 and replaces many SFML 2 patterns (`std::optional` events, vector arguments, `sf::Angle`), so check the version of any tutorial you follow.',
    'Coordinates are pixels from the top-left, with y increasing downward.',
  ],
  reading: [
    { title: 'Migrating from SFML 2 to SFML 3', url: 'https://www.sfml-dev.org/tutorials/3.0/getting-started/migrate/', source: 'other', note: 'The official list of every breaking change. Skim it now and come back when old code will not compile.' },
    { title: 'SFML 3.0 tutorials', url: 'https://www.sfml-dev.org/tutorials/3.0/', source: 'other', note: 'The official tutorial index. These pages match the API taught in this course.' },
    { title: 'Game Programming Patterns: Game Loop', url: 'https://gameprogrammingpatterns.com/game-loop.html', source: 'book', note: 'A clear explanation of why every game needs a loop and the main ways to run it.' },
  ],
};
