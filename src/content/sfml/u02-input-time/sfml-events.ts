import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-events',
  title: 'Events in SFML 3',
  summary: 'Read the event queue with std::optional, is and getIf, use handleEvents with lambdas, and avoid the key-repeat and keyboard-layout traps.',
  minutes: 16,
  objectives: [
    'Drain the event queue correctly with `pollEvent` and test event kinds with `is<T>()` and `getIf<T>()`',
    'Read the data inside the common events: keys, mouse buttons, text, resize and focus',
    'Use `window.handleEvents` with one lambda per event type',
    'Explain key repeat and how `sf::Keyboard::Key` differs from `sf::Keyboard::Scancode`',
    'Use `TextEntered` for typed text instead of key codes',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'What an event is',
      blocks: [
        {
          type: 'p',
          text: 'Your game runs in a loop, but the player acts at unpredictable moments: a key press, a click, a window resize. The operating system collects those into a queue of [[sfml-event|events]] and SFML hands them to you one at a time. Each event is a small object that says *what happened* and carries the details.',
        },
        {
          type: 'p',
          text: 'In SFML 3, `pollEvent()` returns a `std::optional<sf::Event>`. It holds an event if one is waiting, and is empty when the queue has been drained. That is why the loop condition can be the call itself:',
        },
        {
          type: 'code',
          code: `while (const std::optional event = window.pollEvent()) {
    if (event->is<sf::Event::Closed>()) {
        window.close();
    }
    else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
        if (key->code == sf::Keyboard::Key::Escape) {
            window.close();
        }
    }
}`,
          annotations: [
            { lines: 1, text: 'An empty optional converts to `false`, ending the loop. A full one converts to `true` and lets us use `event`.' },
            { lines: 2, text: '`is<T>()` answers a yes/no question: "is this a `Closed` event?". Use it when the event carries no data you need.' },
            { lines: 5, text: '`getIf<T>()` returns a **pointer** to the event\'s data if it is that kind, otherwise `nullptr`. Declaring `key` inside the `if` limits its scope to the branch where it is valid.' },
            { lines: 6, text: 'Now we can read the data: `code` says *which* key.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why std::optional and getIf instead of a struct with a "type" field?',
          text: 'In SFML 2, `sf::Event` was a union of every possible payload (`event.key.code`, `event.mouseButton.x`, ...). Only one member was valid at a time, and reading the wrong one silently gave garbage. SFML 3\'s `sf::Event` is a type-safe [[std-variant]]-style container: you can only get the data for the kind of event it really is, and `getIf` returns `nullptr` when you ask for the wrong one. A whole category of bug becomes impossible.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You need to know **which key** the player pressed. Which call gives you the key code?',
      options: [
        { text: 'event->getIf<sf::Event::KeyPressed>()->code', correct: true, why: '`getIf` returns a pointer to the KeyPressed data, which has the `code` member. (Check it for `nullptr` first, as in an `if` condition.)' },
        { text: 'event->is<sf::Event::KeyPressed>()', why: '`is` only answers true or false. It tells you a key was pressed but not which one.' },
        { text: 'event->code', why: '`sf::Event` itself has no `code` member. The data lives in the specific event type, reached through `getIf`.' },
        { text: 'window.getKey()', why: 'There is no such function. Keys arrive through events or are polled with `sf::Keyboard::isKeyPressed`.' },
      ],
      codeOptions: true,
      explanation: '`is<T>()` is a test; `getIf<T>()` is a test **and** access to the data. Use `getIf` whenever you need the details inside an event.',
    },
    {
      kind: 'concept',
      title: 'The events you will use',
      blocks: [
        {
          type: 'table',
          headers: ['Event', 'Useful members', 'Typical use'],
          rows: [
            ['`Closed`', '(none)', 'Close button clicked: call `window.close()`'],
            ['`Resized`', '`size`', 'Update your camera/view when the window changes'],
            ['`KeyPressed` / `KeyReleased`', '`code`, `scancode`, `alt`, `control`, `shift`, `system`', 'One-shot actions: jump, pause, menu navigation'],
            ['`TextEntered`', '`unicode`', 'Typing a name or chat message'],
            ['`MouseButtonPressed` / `Released`', '`button`, `position`', 'Clicks and drags'],
            ['`MouseMoved`', '`position`', 'Hover effects, aiming'],
            ['`MouseWheelScrolled`', '`delta`, `position`', 'Zoom, scrolling lists'],
            ['`FocusLost` / `FocusGained`', '(none)', 'Pause when the player switches away'],
            ['`JoystickMoved`, `JoystickButtonPressed`', '`joystickId`, `axis`, `position`, `button`', 'Gamepads'],
          ],
        },
        {
          type: 'p',
          text: 'The program below prints a few of them to the console, which is a great way to learn what SFML actually reports:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <iostream>

int main() {
    sf::RenderWindow window(sf::VideoMode({640u, 480u}), "Event logger");
    window.setFramerateLimit(60);

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* r = event->getIf<sf::Event::Resized>()) {
                std::cout << "Resized: " << r->size.x << "x" << r->size.y << '\\n';
            } else if (const auto* k = event->getIf<sf::Event::KeyPressed>()) {
                std::cout << "Key pressed, ctrl held: " << k->control << '\\n';
            } else if (const auto* t = event->getIf<sf::Event::TextEntered>()) {
                if (t->unicode < 128) {
                    std::cout << "Typed: " << static_cast<char>(t->unicode) << '\\n';
                }
            } else if (const auto* m = event->getIf<sf::Event::MouseButtonPressed>()) {
                std::cout << "Click at " << m->position.x << ", " << m->position.y << '\\n';
            }
        }
        window.clear();
        window.display();
    }
}`,
          annotations: [
            { lines: 12, text: 'An `else if` chain with `getIf` in each condition is the classic way to dispatch on event kind.' },
            { lines: 15, text: 'Modifier keys arrive as booleans on the event: `alt`, `control`, `shift`, `system`.' },
            { lines: [17, 18], text: '`TextEntered::unicode` is a 32-bit Unicode code point, not a char. We only print plain ASCII here.' },
            { lines: 21, text: '`position` is a `Vector2i` in window pixels, measured from the top-left.' },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code that closes the window when Escape is released.',
      template: 'if (const auto* key = event->___<sf::Event::___>()) {\n    if (key->code == sf::Keyboard::Key::Escape) {\n        window.close();\n    }\n}',
      blanks: [{ answers: ['getIf'] }, { answers: ['KeyReleased'] }],
      wordBank: ['getIf', 'KeyReleased', 'is', 'KeyPressed', 'Closed'],
      explanation: '`getIf<T>` returns a pointer you can test and then use, here to a `KeyReleased` event. `is` would not give you access to `code`, and `KeyPressed` would trigger on press rather than release.',
    },
    {
      kind: 'concept',
      title: 'handleEvents: one lambda per event',
      blocks: [
        {
          type: 'p',
          text: 'Long `else if` chains get unwieldy. SFML 3 offers an alternative: pass one callable for each event type you care about to `window.handleEvents(...)`. It drains the queue itself and calls the matching callable for each event; events without a handler are skipped.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({640u, 480u}), "handleEvents");
    window.setFramerateLimit(60);

    const auto onClose = [&window](const sf::Event::Closed&) {
        window.close();
    };
    const auto onKey = [&window](const sf::Event::KeyPressed& key) {
        if (key.code == sf::Keyboard::Key::Escape) {
            window.close();
        }
    };

    while (window.isOpen()) {
        window.handleEvents(onClose, onKey);
        window.clear();
        window.display();
    }
}`,
          annotations: [
            { lines: 7, text: 'A [[lambda]] that takes a `const sf::Event::Closed&`. SFML picks the handler by its **parameter type**.' },
            { lines: 10, text: 'The key handler receives the event data directly, a reference rather than a pointer, so there is no `nullptr` check.' },
            { lines: 17, text: 'One call replaces the whole `while (pollEvent())` loop and the `else if` chain.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why would you choose one style over the other?',
          text: '`handleEvents` is shorter and the compiler checks every handler\'s type, which suits small programs and event-driven code. The `pollEvent` loop is more flexible: you can `break` out of it, share local variables with surrounding code, and handle several event kinds in one place. Neither is faster in any way you will measure. Pick what reads best, and be consistent within a project.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If a player holds a key down, SFML sends exactly one `KeyPressed` event until they release it.',
      answer: false,
      explanation: 'By default the operating system\'s **key repeat** sends a stream of `KeyPressed` events while a key is held, just like holding a letter in a text editor. Call `window.setKeyRepeatEnabled(false)` for one-shot actions such as jumping or pausing, or poll the key state in real time for continuous movement (next lesson).',
    },
    {
      kind: 'concept',
      title: 'Two traps: key repeat and keyboard layout',
      blocks: [
        {
          type: 'p',
          text: '**Key repeat.** Left on, the OS repeats `KeyPressed` while a key is held. That is perfect for text boxes and menus, and wrong for "press Space to jump", which would re-trigger every few milliseconds. Switch it off with one call:',
        },
        { type: 'code', code: 'window.setKeyRepeatEnabled(false);   // KeyPressed fires once per physical press' },
        {
          type: 'p',
          text: '**Key vs Scancode.** A `KeyPressed` event reports the key two ways. `code` is the *logical* key: what character the key produces on the player\'s layout. `scancode` is the *physical* key: where it sits on the keyboard, regardless of layout.',
        },
        {
          type: 'table',
          headers: ['Member', 'Meaning', 'Use it for'],
          rows: [
            ['`code` (`sf::Keyboard::Key`)', 'The letter or symbol the key types on this layout', 'Shortcuts the player expects by letter (Ctrl+S)'],
            ['`scancode` (`sf::Keyboard::Scancode`)', 'The physical position on the keyboard', 'Movement keys such as WASD, so they stay under the left hand on any layout'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does this matter for WASD?',
          text: 'On a French AZERTY keyboard the physical keys in the WASD positions type **Z, Q, S, D**. If you bind movement to the logical letters W, A, S, D, a French player must reach across the keyboard. Bind to the physical *scancodes* (`sf::Keyboard::Scancode::W` and friends) and the shape of the cluster is the same on every layout.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'TextEntered is for text',
          text: 'When the player types a name, use `TextEntered`, not key codes. It already handles Shift, caps lock, accents and non-Latin scripts. Key codes can only tell you which physical-ish key moved.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This code should close the window when Escape is pressed, but it will not compile. Tap the faulty line.',
      code: `while (const std::optional event = window.pollEvent()) {
    if (event->is<sf::Event::KeyPressed>()) {
        if (event->code == sf::Keyboard::Key::Escape) {
            window.close();
        }
    }
}`,
      bugLines: [3],
      explanation: '`sf::Event` has no `code` member. The key data lives inside the `KeyPressed` event type, which you reach with `getIf`, not `is`. The fix is `if (const auto* key = event->getIf<sf::Event::KeyPressed>()) { if (key->code == ...) }`.',
    },
    {
      kind: 'mcq',
      prompt: 'A French player on an AZERTY keyboard says your WASD controls feel wrong. Which change fixes it best?',
      options: [
        { text: 'Bind movement to `sf::Keyboard::Scancode::W/A/S/D`, the physical key positions', correct: true, why: 'Scancodes refer to key positions, so the cluster sits under the left hand on any layout.' },
        { text: 'Bind movement to `sf::Keyboard::Key::Z/Q/S/D` for everyone', why: 'That would fix AZERTY and break QWERTY players. You would be hard-coding one layout.' },
        { text: 'Turn off key repeat', why: 'Key repeat affects how often `KeyPressed` fires while held, not which keys are used.' },
        { text: 'Use `TextEntered` events for movement', why: '`TextEntered` is for typing characters. It does not report key releases, so it cannot drive continuous movement.' },
      ],
      explanation: 'The physical position of the movement cluster is what matters for comfort, so use scancodes for gameplay keys and logical key codes for letter-based shortcuts. Some games let the player rebind keys, which solves it for everyone.',
    },
    {
      kind: 'concept',
      title: 'Resize and focus',
      blocks: [
        {
          type: 'p',
          text: 'Two events keep a game polite. `FocusLost` fires when the player clicks another window: pause the game or lower its CPU use. `Resized` fires when they drag the window edge; by default SFML keeps your drawing in **pixel coordinates**, so the picture stays in the corner at its old size instead of scaling. (The Views lesson shows how to scale or letterbox properly.)',
        },
        {
          type: 'code',
          code: `bool paused = false;

// inside the event loop:
if (event->is<sf::Event::FocusLost>()) {
    paused = true;
} else if (event->is<sf::Event::FocusGained>()) {
    paused = false;
}

// in the update step:
if (!paused) {
    updateWorld();
}`,
          annotations: [
            { lines: [4, 8], text: 'Neither event carries data, so `is<T>()` is enough.' },
            { lines: [11, 13], text: 'Skip the update while paused but keep **drawing and handling events**, or the window will appear frozen and unresponsive.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never stop polling events',
          text: 'If the loop stops calling `pollEvent` (for example while a long load runs on the main thread), the OS decides the window has hung and may grey it out or show "Not responding". Keep pumping events, even when paused.',
        },
      ],
    },
  ],
  takeaways: [
    'Events arrive in a queue; drain it every frame with `while (const std::optional event = window.pollEvent())`.',
    'Use `is<T>()` for a yes/no test and `getIf<T>()` when you need the data inside the event.',
    '`window.handleEvents(lambdaA, lambdaB, ...)` is a compact alternative that dispatches on each handler\'s parameter type.',
    'Key repeat sends many `KeyPressed` events while a key is held; use `setKeyRepeatEnabled(false)` for one-shot actions.',
    'Use `scancode` for gameplay keys such as WASD and `TextEntered` for typed text; logical key codes depend on the keyboard layout.',
  ],
  reading: [
    { title: 'Events explained', url: 'https://www.sfml-dev.org/tutorials/3.0/window/events/', source: 'other', note: 'The official reference for every event type and its members.' },
    { title: 'Keyboard, mouse and joysticks', url: 'https://www.sfml-dev.org/tutorials/3.0/window/inputs/', source: 'other', note: 'Covers scancodes and when to use events versus polling.' },
    { title: 'cppreference: std::optional', url: 'https://en.cppreference.com/w/cpp/utility/optional', source: 'cppreference', note: 'The type returned by `pollEvent`.' },
  ],
};
