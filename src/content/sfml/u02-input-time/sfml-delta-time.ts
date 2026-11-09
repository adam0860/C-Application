import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-delta-time',
  title: 'Time, Clocks and Delta Time',
  summary: 'Use sf::Clock and sf::Time so movement runs at the same speed on every computer, handle lag spikes, run timers, and meet the fixed time step.',
  minutes: 18,
  objectives: [
    'Explain why moving "per frame" makes game speed depend on the computer',
    'Measure frame time with `sf::Clock::restart()` and convert it with `asSeconds()`',
    'Write movement and acceleration in units per second using delta time',
    'Build cooldowns and spawn timers with `sf::Time` and an accumulator',
    'Clamp large delta times and describe when a fixed time step is the better design',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The speed-depends-on-the-computer bug',
      blocks: [
        {
          type: 'p',
          text: 'So far we have moved things by a fixed amount **each frame**, for example 5 pixels. That feels fine on your machine, but it quietly ties your game\'s speed to the frame rate. On a 144 Hz monitor the loop runs 144 times a second, so the player moves more than twice as fast as on a 60 Hz one. On a slow laptop that manages 30 frames per second, the game crawls.',
        },
        {
          type: 'table',
          caption: 'A player that moves 5 pixels per frame',
          headers: ['Frame rate', 'Pixels per second', 'Feels like'],
          rows: [
            ['30 FPS', '150', 'Sluggish'],
            ['60 FPS', '300', 'The speed you designed for'],
            ['144 FPS', '720', '2.4 times too fast'],
          ],
        },
        {
          type: 'p',
          text: 'The cure is to stop thinking in "pixels per frame" and think in **pixels per second**. To do that the program needs to know how much real time passed since the last frame. That duration is called **[[delta-time-sfml|delta time]]** (often written `dt`).',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just lock the frame rate to 60?',
          text: '`setFramerateLimit(60)` only sets a **maximum**. A slow machine can still dip below it, and a window being dragged, a hard disk spinning up or another program hogging the CPU can stall any frame. The loop cannot promise how long a frame takes, but it *can* measure it and let the game adapt.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A game moves a ship 4 pixels per frame. How much faster does it move on a 120 FPS machine than on a 60 FPS machine?',
      options: [
        { text: 'Twice as fast', correct: true, why: 'It moves 4 pixels 120 times per second (480 px/s) instead of 60 times (240 px/s).' },
        { text: 'The same speed', why: 'Only true if movement is scaled by delta time. Per-frame movement runs faster whenever there are more frames.' },
        { text: 'Half as fast', why: 'The opposite: more frames per second means more 4-pixel steps per second.' },
        { text: 'It depends on the window size', why: 'Window size does not affect how many frames run per second, nor how far each step goes.' },
      ],
      explanation: 'Distance per second is `pixels per frame × frames per second`. If the second factor changes, so does the speed. Delta time removes the dependence by making the first factor shrink as frames get faster.',
    },
    {
      kind: 'concept',
      title: 'sf::Clock and sf::Time',
      blocks: [
        {
          type: 'p',
          text: '`sf::Clock` measures elapsed time and `sf::Time` is the value it returns. Their key function is `restart()`: it returns the time since the clock was last restarted **and** starts it again from zero in one step. Call it exactly once per frame at the top of the loop and you get delta time:',
        },
        {
          type: 'code',
          code: `sf::Clock clock;
while (window.isOpen()) {
    const sf::Time elapsed = clock.restart();      // time since last frame
    const float dt = elapsed.asSeconds();          // e.g. 0.0166 at 60 FPS
    // ... use dt ...
}`,
          annotations: [
            { lines: 1, text: 'The clock starts counting the moment it is created.' },
            { lines: 3, text: 'Returns the elapsed time **and** resets the clock, so the next call measures the next frame only.' },
            { lines: 4, text: '`asSeconds()` converts to a `float`. At 60 FPS that is about 0.0167; at 144 FPS about 0.0069.' },
          ],
        },
        {
          type: 'table',
          caption: '`sf::Time` conversions and constructors',
          headers: ['Read a time', 'Make a time', 'Type returned'],
          rows: [
            ['`t.asSeconds()`', '`sf::seconds(1.5f)`', '`float`'],
            ['`t.asMilliseconds()`', '`sf::milliseconds(250)`', '`std::int32_t`'],
            ['`t.asMicroseconds()`', '`sf::microseconds(100)`', '`std::int64_t`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is there a separate Time type instead of a plain float?',
          text: 'A bare `float dt` hides its unit: is it seconds or milliseconds? `sf::Time` stores the value as an exact integer count of microseconds internally and makes you pick a unit when you convert, so `sf::seconds(2.f)` and `sf::milliseconds(2000)` are the same thing. Time values can also be added, subtracted and compared directly, with no unit mistakes. (It is similar in spirit to `std::chrono`.)',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not read the elapsed time and restart separately',
          text: 'Calling `getElapsedTime()` and later `restart()` loses the sliver of time between the two calls, and calling `getElapsedTime()` alone **never resets**, so `dt` would grow every frame. Use the value returned by a single `restart()`.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The ship accelerates faster and faster even though speed is a constant. Tap the faulty line.',
      code: `sf::Clock clock;
while (window.isOpen()) {
    const float dt = clock.getElapsedTime().asSeconds();
    ship.move({speed * dt, 0.f});
    window.clear();
    window.draw(ship);
    window.display();
}`,
      bugLines: [3],
      explanation: '`getElapsedTime()` returns the time since the clock was *created*, and it never resets, so `dt` grows without bound and the ship moves further each frame. The fix is `const float dt = clock.restart().asSeconds();`, which returns the time since the last frame and resets for the next one.',
    },
    {
      kind: 'concept',
      title: 'Movement in units per second',
      blocks: [
        {
          type: 'p',
          text: 'Once you have `dt`, every quantity that changes over time is scaled by it. If a speed is 300 **pixels per second**, then in one frame that lasted `dt` seconds the object travels `300 × dt` pixels. Add up the frames and you always get 300 pixels per second, no matter how many frames that took.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Delta time");
    window.setFramerateLimit(60);

    sf::RectangleShape box({50.f, 50.f});
    box.setFillColor(sf::Color::Green);
    box.setPosition({0.f, 275.f});
    float speed = 300.f;   // pixels per SECOND

    sf::Clock clock;
    while (window.isOpen()) {
        const float dt = clock.restart().asSeconds();

        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* key =
                           event->getIf<sf::Event::KeyPressed>()) {
                // Change the frame rate: the speed must NOT change.
                if (key->code == sf::Keyboard::Key::Num1) {
                    window.setFramerateLimit(30);
                } else if (key->code == sf::Keyboard::Key::Num2) {
                    window.setFramerateLimit(60);
                } else if (key->code == sf::Keyboard::Key::Num3) {
                    window.setFramerateLimit(144);
                }
            }
        }

        box.move({speed * dt, 0.f});
        const float right = box.getPosition().x + 50.f;
        if (right > 800.f || box.getPosition().x < 0.f) {
            speed = -speed;
        }

        window.clear(sf::Color(20, 24, 38));
        window.draw(box);
        window.display();
    }
}`,
          annotations: [
            { lines: 10, text: 'The speed is now written in real-world units: pixels per **second**.' },
            { lines: 14, text: 'Measure the frame time **once**, at the top of the frame, and use that single value for everything that frame.' },
            { lines: [21, 28], text: 'Press 1, 2 or 3 to switch between 30, 60 and 144 FPS. The box keeps crossing the window in the same time.' },
            { lines: 32, text: 'The heart of it: distance = speed × time. Faster frames take smaller steps; slower frames take bigger ones.' },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'The same idea in Unreal',
          text: 'Unreal passes `DeltaTime` into every `Tick` function for exactly this reason, and you write `Location += Velocity * DeltaTime;`. The formula is identical.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Check the units like a physicist',
          text: 'pixels/second × seconds = pixels. The seconds cancel, leaving a distance. If you ever wonder whether to multiply or divide by `dt`, write out the units. Acceleration works the same way: `velocity += acceleration * dt` (pixels/s² × s = pixels/s), then `position += velocity * dt`.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the frame-rate independent gravity step.',
      template: 'const float dt = clock.___().asSeconds();\nvelocity.y += gravity * ___;\nplayer.move(velocity * ___);',
      blanks: [{ answers: ['restart'] }, { answers: ['dt'] }, { answers: ['dt'] }],
      wordBank: ['restart', 'dt', 'speed', 'getElapsedTime', 'asSeconds'],
      explanation: '`restart()` gives this frame\'s duration. Gravity is an acceleration (units per second squared), so it changes velocity by `gravity × dt`; velocity is a speed (units per second), so it changes position by `velocity × dt`. Both steps scale by the same `dt`.',
    },
    {
      kind: 'truefalse',
      prompt: 'Calling `window.setFramerateLimit(60)` guarantees that `dt` will always equal 1/60 of a second.',
      answer: false,
      explanation: 'A limit only prevents frames from being *shorter* than 1/60 s. A frame can always take longer: a slow machine, a background task, or dragging the window can stretch one frame to 100 ms or more. That is why you must measure `dt` every frame instead of assuming it.',
    },
    {
      kind: 'concept',
      title: 'Timers, cooldowns and lag spikes',
      blocks: [
        {
          type: 'p',
          text: 'Delta time also drives **timers**: "spawn an enemy every 2 seconds", "the gun can fire every 0.25 s". Accumulate `dt`, and when enough time has built up, act and subtract that interval (rather than resetting to zero, which would lose the leftover fraction):',
        },
        {
          type: 'code',
          code: `const sf::Time spawnInterval = sf::seconds(2.f);
sf::Time spawnTimer = sf::Time::Zero;

// every frame:
spawnTimer += sf::seconds(dt);
while (spawnTimer >= spawnInterval) {
    spawnTimer -= spawnInterval;
    spawnEnemy();
}`,
          annotations: [
            { lines: 5, text: 'Add this frame\'s elapsed time to the running total.' },
            { lines: 6, text: 'A `while`, not an `if`, so a long frame that covers two intervals spawns two enemies.' },
            { lines: 7, text: 'Subtract the interval instead of zeroing, so spare time carries over. Otherwise the timer drifts slow.' },
          ],
        },
        {
          type: 'p',
          text: 'The other danger is a **lag spike**: if the window is dragged or a debugger pauses the game, one frame can last several seconds. With `dt = 3`, a 300 px/s box leaps 900 pixels in one step, possibly right through a wall. The standard fix is to **clamp** the value:',
        },
        {
          type: 'code',
          code: `float dt = clock.restart().asSeconds();
dt = std::min(dt, 0.05f);   // never simulate more than 50 ms at once`,
          annotations: [{ lines: 2, text: 'Games run in slow motion for a moment after a stall instead of teleporting objects. 0.05 s (20 FPS) is a common limit.' }],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is a huge step dangerous?',
          text: 'Collision checks only look at where objects *are* after a move, not the path between. A fast object with a big step can jump clean over a thin obstacle without ever overlapping it. This failure is called **tunnelling**, and it is one reason to clamp `dt` or to use a fixed time step.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The fixed time step',
      blocks: [
        {
          type: 'p',
          text: 'Variable `dt` is simple and works for most 2D games. But physics, replays and networked games want the simulation to advance in **identical, fixed steps** (say 1/60 s each), because results then do not depend on the frame rate at all. The classic recipe collects real time in an **accumulator** and spends it in fixed slices:',
        },
        {
          type: 'code',
          code: `const sf::Time step = sf::seconds(1.f / 60.f);
sf::Time accumulator = sf::Time::Zero;
sf::Clock clock;

while (window.isOpen()) {
    accumulator += clock.restart();
    accumulator = std::min(accumulator, sf::seconds(0.25f));  // spiral guard

    while (accumulator >= step) {
        update(step.asSeconds());   // always the same dt
        accumulator -= step;
    }
    render();
}`,
          annotations: [
            { lines: 6, text: 'Bank the real time that passed.' },
            { lines: 7, text: 'If the game stalls, do not try to "catch up" with hundreds of updates, or the catch-up itself makes the next frame slower still.' },
            { lines: [9, 12], text: 'Spend the banked time in fixed slices. A slow frame runs several updates; a fast frame may run none.' },
            { lines: 13, text: 'Draw once per frame, regardless of how many updates ran.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Which should you use?',
          text: 'Start with variable `dt` plus a clamp. Move to a fixed time step when you add physics that must be deterministic, or you notice behaviour (jump height, collisions) changing with frame rate. The Game Programming Patterns chapter linked below compares both in depth.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A spawn timer uses `if (timer >= interval) { timer = sf::Time::Zero; spawn(); }`. What is the subtle problem?',
      options: [
        { text: 'Any leftover time beyond the interval is thrown away, so enemies spawn slightly slower than intended', correct: true, why: 'If a frame overshoots the interval by 10 ms, resetting to zero discards that 10 ms. Subtract the interval instead so the remainder carries over.' },
        { text: 'The timer can never reach the interval', why: 'It can: `timer` grows by `dt` each frame and eventually passes `interval`.' },
        { text: '`sf::Time::Zero` does not exist', why: '`sf::Time::Zero` is a real, commonly used constant meaning "no time".' },
        { text: 'It spawns an enemy every frame', why: 'The `if` prevents that; `spawn()` only runs when enough time has accumulated.' },
      ],
      explanation: 'Resetting to zero discards the "overshoot", the part of the last frame beyond the interval. Over many spawns, that error accumulates. `timer -= interval` keeps the remainder, so the average rate stays exactly right.',
    },
  ],
  takeaways: [
    'Moving a fixed amount per frame makes game speed depend on frame rate; store speeds in units per second instead.',
    'Get delta time with a single `clock.restart().asSeconds()` per frame, then use `position += velocity * dt`.',
    '`sf::Time` removes unit mistakes: build with `sf::seconds`, `sf::milliseconds`, read with `asSeconds`, `asMilliseconds`.',
    'Run timers by accumulating `dt` and *subtracting* the interval so leftover time carries over.',
    'Clamp `dt` against lag spikes; use a fixed time step with an accumulator when physics must be deterministic.',
  ],
  reading: [
    { title: 'Handling time in SFML', url: 'https://www.sfml-dev.org/tutorials/3.0/system/time/', source: 'other', note: 'The official page on `sf::Time` and `sf::Clock`.' },
    { title: 'Fix Your Timestep!', url: 'https://gafferongames.com/post/fix_your_timestep/', source: 'article', note: 'The classic article behind the accumulator pattern, with the "spiral of death" explained.' },
    { title: 'Game Programming Patterns: Game Loop', url: 'https://gameprogrammingpatterns.com/game-loop.html', source: 'book', note: 'Compares fixed, variable and semi-fixed time steps.' },
  ],
};
