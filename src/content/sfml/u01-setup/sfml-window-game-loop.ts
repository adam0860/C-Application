import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-window-game-loop',
  title: 'Your First Window and the Game Loop',
  summary: 'Create a window, understand clear, draw and display, cap the frame rate, and build a loop you will reuse in every project.',
  minutes: 16,
  objectives: [
    'Create an `sf::RenderWindow` with a size, title, style and optional fullscreen state',
    'Explain what `clear`, `draw` and `display` each do and why they come in that order',
    'Explain double buffering and why `display()` is needed',
    'Limit the frame rate with `setFramerateLimit` or vertical sync, and say why you should',
    'Close the window cleanly from the close button and the Escape key',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Creating the window',
      blocks: [
        {
          type: 'p',
          text: '`sf::RenderWindow` is both a window on your desktop **and** a surface you can draw on. Its constructor takes a [[video-mode]] (the size in pixels), a title, and optionally a style and a state:',
        },
        {
          type: 'code',
          code: `// Size and title: the common case.
sf::RenderWindow window(sf::VideoMode({1280u, 720u}), "My Game");

// No resize or maximise button: fixed-size window.
sf::RenderWindow fixed(sf::VideoMode({800u, 600u}), "Fixed",
                       sf::Style::Titlebar | sf::Style::Close);

// Fullscreen at the desktop's own resolution.
sf::RenderWindow full(sf::VideoMode::getDesktopMode(), "Full",
                      sf::State::Fullscreen);`,
          annotations: [
            { lines: 2, text: '`{1280u, 720u}` is an `sf::Vector2u`: width and height in pixels. The `u` suffix makes them unsigned, matching the type.' },
            { lines: [5, 6], text: 'Style flags combine with `|`. The default is `Titlebar | Resize | Close`. A fixed-size window leaves out `Resize`.' },
            { lines: [9, 10], text: 'Fullscreen is a **state**, not a style, in SFML 3. `getDesktopMode()` asks the OS for the screen\'s current size so the picture is not stretched.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is fullscreen a separate "state"?',
          text: 'In SFML 2, `sf::Style::Fullscreen` was one of the style bits, but it is mutually exclusive with all of them: you could write `Fullscreen | Resize` and the result made no sense. SFML 3 gives it its own `enum class sf::State { Windowed, Fullscreen }`, so the compiler no longer lets you combine ideas that cannot be combined.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Windowed size is a request, not a promise',
          text: 'The OS may give you a window slightly different from what you asked for (for example when a desktop scaling setting is on). Always read the real size back with `window.getSize()` instead of assuming the number you passed in.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which line correctly creates a **fullscreen** SFML 3 window?',
      options: [
        { text: 'sf::RenderWindow w(sf::VideoMode::getDesktopMode(), "Game", sf::State::Fullscreen);', correct: true, why: 'Fullscreen is chosen with the `sf::State` argument in SFML 3.' },
        { text: 'sf::RenderWindow w(sf::VideoMode({800u, 600u}), "Game", sf::Style::Fullscreen);', why: '`sf::Style::Fullscreen` existed in SFML 2 but was removed. Fullscreen is now a state, not a style bit.' },
        { text: 'sf::RenderWindow w("Game", sf::VideoMode(800, 600), true);', why: 'The parameters are in the wrong order and there is no boolean fullscreen flag. The video mode always comes first.' },
        { text: 'sf::RenderWindow w(sf::VideoMode({0u, 0u}), "Game");', why: 'A zero-sized video mode does not mean "fullscreen". It would give you an invalid window.' },
      ],
      codeOptions: true,
      explanation: 'The constructor order is video mode, title, then either a style bitmask or a `sf::State`. A fullscreen window should normally use the desktop mode so the display is not forced to change resolution.',
    },
    {
      kind: 'concept',
      title: 'Anatomy of the loop: clear, draw, display',
      blocks: [
        {
          type: 'p',
          text: 'Every frame of an SFML game repeats the same five beats: **handle events, update, clear, draw, display**. The last three have an exact meaning:',
        },
        {
          type: 'steps',
          items: [
            { title: 'window.clear(color)', text: 'Fills the hidden drawing surface with one colour, wiping whatever was there. The default colour is black.' },
            { title: 'window.draw(thing)', text: 'Paints a shape, sprite or text onto the hidden surface. Later draws appear on top of earlier ones, so **draw order is layer order**.' },
            { title: 'window.display()', text: 'Swaps the finished hidden surface onto the screen so the player sees the whole frame at once.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do we need display() at all? (double buffering)',
          text: 'If SFML drew straight onto the visible window, you would sometimes catch a frame half-painted: the background drawn but the player not yet, so things flicker. Instead SFML keeps **two** surfaces (this is called [[double-buffering]]). You draw on the hidden *back buffer*, and `display()` swaps it with the visible *front buffer* in one step. The player only ever sees completed frames.',
        },
        {
          type: 'code',
          code: `window.clear(sf::Color(30, 30, 46));   // dark blue-grey
window.draw(background);                // bottom layer
window.draw(player);                    // above the background
window.draw(scoreText);                 // top layer: the HUD
window.display();                       // show the finished frame`,
          annotations: [
            { lines: 1, text: 'You can build a colour from red, green and blue values from 0 to 255, or use presets such as `sf::Color::Black`.' },
            { lines: [2, 4], text: 'Painter\'s algorithm: the last thing drawn is on top.' },
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The player never appears on screen. Tap the line that is out of order.',
      code: `while (window.isOpen()) {
    window.clear();
    window.draw(background);
    window.display();
    window.draw(player);
}`,
      bugLines: [4, 5],
      explanation: '`player` is drawn **after** `display()`, so it goes onto the back buffer that the next `clear()` immediately wipes. It is never on a surface that gets displayed. Every `draw` call must happen between `clear()` and `display()`.',
    },
    {
      kind: 'concept',
      title: 'Taming the frame rate',
      blocks: [
        {
          type: 'p',
          text: 'A loop with nothing to wait on will run as fast as the CPU allows, thousands of frames per second, using a whole core and making your laptop fan roar for no visible benefit. A **frame rate limit** makes the loop wait so that it runs at a sensible, steady speed. SFML offers two tools:',
        },
        {
          type: 'table',
          headers: ['Call', 'How it works', 'Notes'],
          rows: [
            ['`window.setFramerateLimit(60)`', 'SFML sleeps at the end of each frame so it lasts at least 1/60 s', 'Simple and predictable; accuracy is a little coarse'],
            ['`window.setVerticalSyncEnabled(true)`', '`display()` waits for the monitor\'s refresh', 'Matches the monitor exactly and prevents tearing. A 144 Hz display gives 144 FPS'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Pick one, not both',
          text: 'Using vertical sync *and* a frame limit together makes the two timers fight and can produce uneven frames. Choose one. For most games, vertical sync is the better default, and `setFramerateLimit(60)` is a good fallback.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Capping the rate is not the same as being frame-rate independent',
          text: 'A limit makes the loop *tend* to run at 60 FPS, but on a slow machine it can still dip to 30, and with vertical sync a fast monitor may run at 144. Game speed must not depend on either. The next unit shows how to use **delta time** so movement is the same on every computer.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Calling `window.draw(shape)` immediately makes the shape visible on screen.',
      answer: false,
      explanation: '`draw` paints onto a hidden back buffer. The shape only becomes visible when `display()` swaps that buffer onto the screen. That is why a frame is always `clear`, then every `draw`, then one `display`.',
    },
    {
      kind: 'concept',
      title: 'A loop to keep: bouncing ball',
      blocks: [
        {
          type: 'p',
          text: 'Here is the whole lesson in one program. A ball bounces around the window. Press **Escape** or click the close button to quit. This is a good template to copy for every new project.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Bouncing ball");
    window.setFramerateLimit(60);

    sf::CircleShape ball(25.f);
    ball.setFillColor(sf::Color::Yellow);
    ball.setPosition({100.f, 100.f});
    sf::Vector2f velocity{4.f, 3.f};   // pixels per frame

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
                if (key->code == sf::Keyboard::Key::Escape) {
                    window.close();
                }
            }
        }

        ball.move(velocity);
        const sf::Vector2f pos = ball.getPosition();
        const float diameter = ball.getRadius() * 2.f;
        const sf::Vector2f area(window.getSize());
        if (pos.x < 0.f || pos.x + diameter > area.x) {
            velocity.x = -velocity.x;
        }
        if (pos.y < 0.f || pos.y + diameter > area.y) {
            velocity.y = -velocity.y;
        }

        window.clear(sf::Color(20, 24, 38));
        window.draw(ball);
        window.display();
    }
}`,
          annotations: [
            { lines: 5, text: 'Cap the loop at 60 frames per second. The ball\'s speed below is "per frame", so it only works because of this limit. Fixing that is the next unit\'s job.' },
            { lines: 10, text: 'Velocity is a vector: 4 pixels right and 3 pixels down **every frame**.' },
            { lines: 12, text: 'The outer loop is the game loop. It runs once per frame.' },
            { lines: 13, text: 'The inner loop drains every event that arrived since last frame. Always loop here, not `if`, or events pile up.' },
            { lines: 16, text: '`getIf<T>()` returns a pointer to the event\'s data if it is that kind, otherwise `nullptr`. We use it to read *which* key was pressed.' },
            { lines: 23, text: 'UPDATE: move the ball by its velocity.' },
            { lines: 26, text: 'Convert the `Vector2u` window size into a `Vector2f` so we can compare it with float positions.' },
            { lines: [27, 32], text: 'Bounce: when the ball crosses an edge, flip that velocity component.' },
            { lines: [34, 36], text: 'RENDER: clear, draw, display, always in this order.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the inner event loop use while, not if?',
          text: 'Between two frames, many events can queue up: several key presses, mouse moves, a resize. If you handled only one per frame, the queue would grow, and input would lag further and further behind. `while (pollEvent())` empties the whole queue each frame so you always react to the latest state.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Fill in the missing pieces of the game loop.',
      template: 'while (window.___()) {\n    // handle events and update\n    window.___(sf::Color::Black);\n    window.draw(player);\n    window.___();\n}',
      blanks: [{ answers: ['isOpen'] }, { answers: ['clear'] }, { answers: ['display'] }],
      wordBank: ['isOpen', 'clear', 'display', 'close', 'update', 'flip'],
      explanation: 'The loop runs while the window `isOpen()`. Each frame wipes the back buffer with `clear`, draws, then `display` shows the finished frame. `close()` is what *ends* the loop by making `isOpen()` return false.',
    },
    {
      kind: 'mcq',
      prompt: 'What happens if you remove the `window.clear()` call from the loop but keep `draw` and `display`?',
      options: [
        { text: 'Each frame is drawn over whatever was left in the buffer, so moving objects leave smeared trails or flicker', correct: true, why: 'Nothing erases the old picture, and with two swapping buffers you may even see two older frames alternate.' },
        { text: 'The program crashes because there is no background', why: 'Skipping `clear` is legal. It is a logic problem, not a crash.' },
        { text: 'The window turns white and nothing can be drawn', why: 'Drawing still works. Without clearing you simply never remove old pixels.' },
        { text: 'Nothing changes; `clear` is optional decoration', why: 'It is only optional when every pixel is repainted each frame. With moving shapes you will see ghosts.' },
      ],
      explanation: '`clear` resets the back buffer so each frame starts from a known picture. If you skip it and only repaint part of the window, stale pixels (and with double buffering, pixels from two frames ago) show through.',
    },
  ],
  takeaways: [
    'Create a window with `sf::RenderWindow window(sf::VideoMode({w, h}), "Title")`; add `sf::State::Fullscreen` for fullscreen.',
    'Each frame: handle events, update, `clear`, `draw`, `display`. Draw order is layer order.',
    'Drawing happens on a hidden back buffer and `display()` swaps it to the screen. This is double buffering and it prevents half-drawn frames.',
    'Use `setFramerateLimit` or vertical sync (not both) so the loop does not run flat out.',
    'Drain events with `while (pollEvent())`, and close the window with `window.close()`.',
  ],
  reading: [
    { title: 'Opening and managing an SFML window', url: 'https://www.sfml-dev.org/tutorials/3.0/window/window/', source: 'other', note: 'Covers window styles, fullscreen, vertical sync, and frame limits.' },
    { title: 'Drawing 2D stuff', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/draw/', source: 'other', note: 'The official explanation of clear, draw and display.' },
    { title: 'Game Programming Patterns: Game Loop', url: 'https://gameprogrammingpatterns.com/game-loop.html', source: 'book', note: 'Compares fixed, variable and semi-fixed time steps; useful before the delta-time lesson.' },
  ],
};
