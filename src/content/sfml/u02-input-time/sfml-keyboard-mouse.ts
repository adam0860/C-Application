import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-keyboard-mouse',
  title: 'Keyboard, Mouse and Real-Time Input',
  summary: 'Poll the keyboard, mouse and gamepad each frame, build a normalised movement vector, and keep input in one place.',
  minutes: 17,
  objectives: [
    'Choose between events and real-time polling for a given kind of input',
    'Read keyboard, mouse and joystick state with `sf::Keyboard`, `sf::Mouse` and `sf::Joystick`',
    'Build a movement direction from several keys and normalise it so diagonals are not faster',
    'Convert mouse pixel positions into world coordinates with `mapPixelToCoords`',
    'Apply a dead zone to analogue sticks and collect input into a single struct',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Events say "it happened"; polling says "it is happening"',
      blocks: [
        {
          type: 'p',
          text: 'There are two ways to learn what the player is doing. **Events** tell you about a *moment*: a key went down, a button was clicked. **Polling** asks about a *state* right now: is the left arrow down at this instant? Both are useful, and choosing the wrong one is a classic source of sluggish or double-firing controls.',
        },
        {
          type: 'table',
          headers: ['Style', 'Tool', 'Best for'],
          rows: [
            ['Events', '`KeyPressed`, `MouseButtonPressed`', 'One-shot actions: jump, shoot once, pause, menu clicks'],
            ['Polling', '`sf::Keyboard::isKeyPressed`, `sf::Mouse::isButtonPressed`, `sf::Joystick::getAxisPosition`', 'Continuous actions: walking, steering, holding fire'],
          ],
        },
        {
          type: 'code',
          code: `// Continuous: true on every frame the key is held.
if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Left)) {
    player.move({-5.f, 0.f});
}

// Physical-position version (layout independent):
if (sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::A)) {
    player.move({-5.f, 0.f});
}`,
          annotations: [
            { lines: 2, text: '`isKeyPressed` is a plain function that returns `true` or `false`. There is no window argument, because it reads the keyboard globally.' },
            { lines: 7, text: 'The same function also accepts a `Scancode` (the physical key), which keeps WASD in the same place on every keyboard layout.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Polling ignores window focus',
          text: '`isKeyPressed` reads the keyboard for the whole system. If the player switches to a browser and types, your game would still see those keys. Guard continuous input with `window.hasFocus()`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have both?',
          text: 'Events come from a queue, so you never miss a quick tap even if it ends between two frames. Polling only sees the instant you ask, so a tap shorter than one frame can be missed, but it gives you the held state with no bookkeeping. Taps want events, holds want polling.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which input approach best suits "hold the right arrow to run"?',
      options: [
        { text: 'Poll `sf::Keyboard::isKeyPressed` every frame', correct: true, why: 'Running is a continuous state. Polling tells you "is it held?" each frame without extra bookkeeping.' },
        { text: 'Use a `KeyPressed` event and move once per event', why: 'You would depend on the OS\'s key-repeat rate, which has an initial delay and varies by system.' },
        { text: 'Use `TextEntered` events', why: '`TextEntered` is for typed characters, not for held keys.' },
        { text: 'Use `waitEvent()` so the loop sleeps until the key changes', why: 'Blocking on events would freeze the rest of the game between inputs. Games must keep updating every frame.' },
      ],
      explanation: 'Use polling for actions that last as long as a key is held. Use events for actions that should happen **once** per press, such as a jump or opening a menu.',
    },
    {
      kind: 'concept',
      title: 'Movement from several keys',
      blocks: [
        {
          type: 'p',
          text: 'Build a **direction vector** from whatever keys are down, then move along it. Pressing W subtracts 1 from y (up is negative), S adds 1, A subtracts 1 from x, and D adds 1. Holding W and D together gives `{1, -1}`: up and right.',
        },
        {
          type: 'p',
          text: 'There is a catch. `{1, -1}` has length √2 ≈ 1.41, so diagonal movement would be **41% faster** than straight movement. The fix is to **normalise** the vector (scale it to length 1) before multiplying by the speed.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "WASD");
    window.setFramerateLimit(60);

    sf::RectangleShape player({40.f, 40.f});
    player.setFillColor(sf::Color::Cyan);
    player.setPosition({380.f, 280.f});
    const float speed = 5.f;   // pixels per frame, for now

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }

        sf::Vector2f direction{0.f, 0.f};
        if (window.hasFocus()) {
            using Scan = sf::Keyboard::Scancode;
            if (sf::Keyboard::isKeyPressed(Scan::W)) { direction.y -= 1.f; }
            if (sf::Keyboard::isKeyPressed(Scan::S)) { direction.y += 1.f; }
            if (sf::Keyboard::isKeyPressed(Scan::A)) { direction.x -= 1.f; }
            if (sf::Keyboard::isKeyPressed(Scan::D)) { direction.x += 1.f; }
        }
        if (direction.lengthSquared() > 0.f) {
            player.move(direction.normalized() * speed);
        }

        window.clear(sf::Color(25, 25, 35));
        window.draw(player);
        window.display();
    }
}`,
          annotations: [
            { lines: 19, text: 'Start every frame with "no movement" and let each held key add its contribution.' },
            { lines: 20, text: 'Only read the keyboard when our window is the active one.' },
            { lines: [22, 25], text: 'Opposite keys cancel out: holding W and S together leaves `y` at zero.' },
            { lines: 27, text: '`lengthSquared()` is cheaper than `length()` (no square root) and is all we need to ask "is there any input?".' },
            { lines: 28, text: '`normalized()` returns a vector of length 1 pointing the same way. Multiplying by `speed` gives the same speed in every direction.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why check lengthSquared() before normalising?',
          text: 'Normalising divides by the length. A zero vector (no keys pressed) has length zero, so there is no direction to preserve. SFML asserts on it in debug builds, and in release builds you would get invalid numbers (NaN) that make the player vanish. Always guard `normalized()` with a "length is not zero" test.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The player sprite disappears (its position becomes NaN) whenever no key is held. Tap the faulty line.',
      code: `sf::Vector2f direction{0.f, 0.f};
if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::D)) {
    direction.x += 1.f;
}
if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::A)) {
    direction.x -= 1.f;
}
player.move(direction.normalized() * speed);`,
      bugLines: [8],
      explanation: 'When neither key is held, `direction` is `{0, 0}`, and normalising a zero-length vector divides by zero. Guard the call: `if (direction.lengthSquared() > 0.f) { player.move(direction.normalized() * speed); }`.',
    },
    {
      kind: 'truefalse',
      prompt: 'If you add up the direction from W+D without normalising, moving diagonally is faster than moving straight.',
      answer: true,
      explanation: 'The diagonal direction `{1, -1}` has length √2 (about 1.41), so each frame moves 41% farther than the straight direction `{1, 0}` of length 1. Normalising makes every direction length 1, so speed no longer depends on how many keys are held.',
    },
    {
      kind: 'concept',
      title: 'The mouse, and pixels versus the world',
      blocks: [
        {
          type: 'p',
          text: 'Mouse position and buttons can also be polled. `sf::Mouse::getPosition(window)` gives the cursor position in **window pixels** (a `Vector2i`). Always pass the window: without it you get the position on the whole desktop.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Mouse");
    window.setFramerateLimit(60);

    sf::CircleShape marker(20.f);
    marker.setOrigin({20.f, 20.f});
    marker.setFillColor(sf::Color::Yellow);

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* click =
                           event->getIf<sf::Event::MouseButtonPressed>()) {
                if (click->button == sf::Mouse::Button::Left) {
                    marker.setFillColor(sf::Color::Red);
                } else if (click->button == sf::Mouse::Button::Right) {
                    marker.setFillColor(sf::Color::Yellow);
                }
            }
        }

        const sf::Vector2i pixel = sf::Mouse::getPosition(window);
        marker.setPosition(window.mapPixelToCoords(pixel));

        window.clear(sf::Color(20, 20, 30));
        window.draw(marker);
        window.display();
    }
}`,
          annotations: [
            { lines: 8, text: 'Setting the origin to the circle\'s centre means `setPosition` places the **centre**, not the top-left corner.' },
            { lines: [15, 17], text: 'Clicks are one-shot, so we use an event. The event tells us **which** button and where.' },
            { lines: 25, text: 'Polling: where is the cursor right now, relative to this window?' },
            { lines: 26, text: '`mapPixelToCoords` converts window pixels into **world coordinates**, the space your shapes live in.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother converting pixels to coordinates?',
          text: 'Right now the two spaces are identical, so the conversion looks pointless. But the moment you add a camera (scrolling, zooming or resizing, covered in the Views lesson), a pixel on screen no longer matches the same point in the world. `mapPixelToCoords` accounts for the current view, so clicks land on the right object. Writing it now means your input code keeps working when the camera arrives.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A camera scrolls the world to the right. A player clicks the screen at pixel (400, 300). Which gives the **world** point they clicked?',
      options: [
        { text: 'window.mapPixelToCoords({400, 300})', correct: true, why: 'It applies the current view\'s position, zoom and rotation to the pixel, returning the matching world point.' },
        { text: 'sf::Vector2f(400.f, 300.f)', why: 'That treats pixels and world as the same, which is only true with the default, unmoved view.' },
        { text: 'sf::Mouse::getPosition()', why: 'Without a window argument you get the position on the whole desktop, not even window pixels.' },
        { text: 'window.getSize() / 2u', why: 'That is the window\'s centre pixel, not where the player clicked.' },
      ],
      explanation: 'Pixels are screen positions; world coordinates are where objects actually are. With a moving camera they differ, and `mapPixelToCoords` is the bridge between them.',
    },
    {
      kind: 'concept',
      title: 'Gamepads, dead zones and one input struct',
      blocks: [
        {
          type: 'p',
          text: 'Gamepads work through `sf::Joystick`. Check that one is connected, then read each axis as a number from **-100 to 100**. Analogue sticks never rest at exactly zero, so ignore small values with a **dead zone**:',
        },
        {
          type: 'code',
          code: `float axisX = 0.f;
float axisY = 0.f;
if (sf::Joystick::isConnected(0)) {
    axisX = sf::Joystick::getAxisPosition(0, sf::Joystick::Axis::X);
    axisY = sf::Joystick::getAxisPosition(0, sf::Joystick::Axis::Y);
}
const float deadZone = 15.f;
if (std::abs(axisX) < deadZone) { axisX = 0.f; }
if (std::abs(axisY) < deadZone) { axisY = 0.f; }`,
          annotations: [
            { lines: 3, text: 'Joysticks are numbered from 0. Always check, because the player may have no gamepad at all.' },
            { lines: [4, 5], text: 'Each axis reports a value in the range -100 to 100, where 0 is centred.' },
            { lines: [7, 9], text: 'A stick that reads 3 while untouched would otherwise make the player drift. Treat small values as zero.' },
          ],
        },
        {
          type: 'p',
          text: 'As a game grows, scatter-shot `isKeyPressed` calls spread through your update code become a maintenance problem. Instead, read **all** devices once per frame into a small struct, and let the rest of the game use that struct:',
        },
        {
          type: 'code',
          code: `struct Input {
    sf::Vector2f move{0.f, 0.f};   // already normalised
    bool fire = false;
    bool pause = false;
};

Input readInput(const sf::RenderWindow& window);   // keyboard + gamepad`,
          annotations: [
            { lines: 2, text: 'One movement vector, no matter whether it came from WASD, arrow keys or a stick.' },
            { lines: 7, text: 'All device-specific code lives in this one function. The game just asks what the player **wants to do**.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why wrap input in a struct?',
          text: 'Key rebinding, gamepad support, replaying a recording and automated tests all become easy when game code reads a plain `Input` value instead of calling the keyboard directly. It is the same idea Unreal formalises as Enhanced Input actions: gameplay reacts to *intent*, not to specific keys.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Fill in the blanks to build a safe, normalised movement vector.',
      template: 'if (direction.___() > 0.f) {\n    player.move(direction.___() * speed);\n}',
      blanks: [{ answers: ['lengthSquared', 'length'] }, { answers: ['normalized'] }],
      wordBank: ['lengthSquared', 'normalized', 'getPosition', 'length', 'setRotation'],
      explanation: 'Check that the vector has some length first, then `normalized()` scales it to length 1 so the speed is the same in every direction. `lengthSquared()` is the cheaper way to ask whether the vector is non-zero.',
    },
  ],
  takeaways: [
    'Use events for one-shot actions and polling (`isKeyPressed`, `isButtonPressed`) for held states.',
    'Polling reads the whole system, so guard it with `window.hasFocus()`.',
    'Build a direction vector from the held keys, check `lengthSquared() > 0`, then `normalized() * speed` so diagonals are not faster.',
    'Use `window.mapPixelToCoords` to turn mouse pixels into world coordinates, so clicks stay correct once you add a camera.',
    'Apply a dead zone to analogue sticks and read all devices into one `Input` struct each frame.',
  ],
  reading: [
    { title: 'Keyboard, mouse and joysticks', url: 'https://www.sfml-dev.org/tutorials/3.0/window/inputs/', source: 'other', note: 'The official page on real-time input, scancodes and joystick axes.' },
    { title: 'Controlling the 2D camera with views', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/view/', source: 'other', note: 'Explains why pixel and world coordinates differ and how to convert between them.' },
  ],
};
