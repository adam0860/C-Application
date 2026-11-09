import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-project-pong',
  title: 'Project: Pong',
  summary: 'Build a complete two-paddle Pong with an AI opponent, angle-controlled bounces, serving, scoring and a win screen, using only what the course has taught so far.',
  minutes: 30,
  objectives: [
    'Break a game into data, input, update, collision, scoring and drawing',
    'Build clamped paddles and an AI paddle that is fast but beatable',
    'Bounce a ball so the hit position controls the angle, with a capped speed-up',
    'Use a phase enum for serving, playing and game over',
    'Draw score digits from rectangles so the game needs no font or image files',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Plan the game before you type it',
      blocks: [
        {
          type: 'p',
          text: 'Pong is the classic first game because it is small but contains every part of a real one: input, movement, collision, scoring and a few rules about what happens next. The trick is to build it as a list of **small features**, each of which you can run and see working, rather than writing everything and then debugging all of it at once. Almost every feature below comes from a lesson you have already done.',
        },
        {
          type: 'table',
          caption: 'The feature list, and where each skill came from.',
          headers: ['Feature', 'What it needs', 'From'],
          rows: [
            ['Window and loop', '`RenderWindow`, event loop, clamped delta time', 'Window and game loop, Delta time'],
            ['Paddles', 'Rectangle shapes, keyboard input, clamping', 'Shapes, Keyboard and mouse'],
            ['Ball bounce', 'Velocity, wall and paddle collision', 'Collision detection'],
            ['Serving and scoring', 'A phase enum and a timer', 'Game states'],
            ['Score display', 'Rectangles instead of a font', 'Shapes and transforms'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why build in small steps?',
          text: 'When a small feature breaks, you know exactly which few lines are responsible, because you only just wrote them. If you write 150 lines before the first run, a blank window could mean any of 150 things. Getting a paddle on screen, then moving it, then adding the ball is slower per line but far faster overall, and every step leaves you with a game that runs.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Put the tunable numbers at the top',
          text: 'Paddle speed, serve speed, maximum speed and the winning score are **design decisions**, not logic. Give each a named `constexpr` constant so you can tune how the game feels by changing one line, instead of hunting for the magic number `420.f` somewhere in the update code.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Paddles, input and a beatable AI',
      blocks: [
        {
          type: 'p',
          text: 'A paddle is a rectangle plus one rule: it can move up and down but never leave the window. Keeping that rule inside the paddle itself (rather than in the main loop) means the player and the AI can share it.',
        },
        {
          type: 'code',
          code: `struct Paddle {
    sf::RectangleShape shape{{14.f, 90.f}};

    explicit Paddle(float x) {
        shape.setOrigin(shape.getSize() / 2.f);
        shape.setPosition({x, kHeight / 2.f});
    }

    void move(float dy) {
        const float half = shape.getSize().y / 2.f;
        const float y = std::clamp(shape.getPosition().y + dy, half, kHeight - half);
        shape.setPosition({shape.getPosition().x, y});
    }
};`,
          annotations: [
            { lines: 2, text: 'The paddle is a `RectangleShape` that owns its size. Everything else about it is set up in the constructor.' },
            { lines: 5, text: 'Origin at the **centre**, so `setPosition` and the clamp below both talk about the middle of the paddle.' },
            { lines: [9, 12], text: '`move` clamps the centre to `[half, height - half]`, so the edges of the paddle stop exactly at the top and bottom of the window.' },
          ],
        },
        {
          type: 'p',
          text: 'The main loop then feeds it two kinds of movement: the keyboard for the player, and a clamped chase for the computer.',
        },
        {
          type: 'code',
          code: `        const float dt = std::min(clock.restart().asSeconds(), 0.05f);

        float direction = 0.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::W)) direction -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::S)) direction += 1.f;
        left.move(direction * kPaddleSpeed * dt);

        const float gap = ball.shape.getPosition().y - right.shape.getPosition().y;
        const float reach = kPaddleSpeed * 0.8f * dt;
        right.move(std::clamp(gap, -reach, reach));`,
          annotations: [
            { lines: 1, text: 'Clamp the frame time at 50 ms. If the window is dragged or the game stalls, the next frame would otherwise be a huge step and objects could jump through each other.' },
            { lines: [3, 6], text: 'W moves up and S moves down. Pressing both cancels out.' },
            { lines: 8, text: 'How far the ball is above or below the AI paddle.' },
            { lines: 9, text: 'The AI may move at only **80%** of the player\'s speed. That is what makes it beatable.' },
            { lines: 10, text: '`clamp(gap, -reach, reach)` moves toward the ball by at most `reach` this frame, and never past it, so the paddle does not jitter when it is lined up.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must the AI be slower than the player?',
          text: 'If the computer paddle can match the ball\'s vertical speed exactly, it never misses and the game is impossible to win. Limiting its speed means a steep angle off the edge of your paddle gets past it, which is exactly the skill the game rewards. Difficulty in Pong is mostly one number: how fast the AI is allowed to move.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The ball: bouncing with control',
      blocks: [
        {
          type: 'p',
          text: 'The ball moves by its velocity each frame. The interesting part is what happens at the walls and paddles. A boring Pong simply reverses the direction; a good one lets the player **aim** by hitting the ball with a different part of the paddle, and gets faster as a rally goes on.',
        },
        {
          type: 'code',
          code: `            ball.shape.move(ball.velocity * dt);

            const sf::Vector2f p = ball.shape.getPosition();
            const float radius = ball.shape.getSize().y / 2.f;
            if (p.y < radius) {
                ball.shape.setPosition({p.x, radius});
                ball.velocity.y = std::abs(ball.velocity.y);
            } else if (p.y > kHeight - radius) {
                ball.shape.setPosition({p.x, kHeight - radius});
                ball.velocity.y = -std::abs(ball.velocity.y);
            }

            for (Paddle* paddle : {&left, &right}) {
                if (!ball.shape.getGlobalBounds().findIntersection(paddle->shape.getGlobalBounds())) {
                    continue;
                }
                const bool isLeft = paddle == &left;
                const float sign = isLeft ? 1.f : -1.f;
                const float contactX = paddle->shape.getPosition().x +
                                       sign * (paddle->shape.getSize().x + ball.shape.getSize().x) / 2.f;
                ball.shape.setPosition({contactX, ball.shape.getPosition().y});

                const float offset = (ball.shape.getPosition().y - paddle->shape.getPosition().y) /
                                     (paddle->shape.getSize().y / 2.f);
                const float speed = std::min(ball.velocity.length() * 1.06f, kMaxSpeed);
                const float angle = std::clamp(offset, -1.f, 1.f) * 0.9f;
                ball.velocity = {std::cos(angle) * speed * sign, std::sin(angle) * speed};
            }`,
          annotations: [
            { lines: 1, text: 'Move by velocity × delta time, as in every movement lesson.' },
            { lines: [5, 7], text: 'Hit the top wall: put the ball back inside, and set its y velocity to **point down** with `abs`.' },
            { lines: [8, 10], text: 'Hit the bottom wall: the same, but `-abs` forces it to point up.' },
            { lines: 13, text: 'Check both paddles with one loop. `&left` and `&right` are pointers to the two paddle objects.' },
            { lines: [14, 16], text: 'Skip any paddle the ball is not touching, using the global-bounds overlap test from the collision lesson.' },
            { lines: [17, 18], text: '`sign` is the x direction the ball should travel **after** the bounce: right (+1) off the left paddle, left (-1) off the right one.' },
            { lines: [19, 21], text: 'Push the ball out so its edge just touches the paddle\'s face. Without this it could stay overlapped for several frames.' },
            { lines: [23, 24], text: 'Where on the paddle it hit: -1 at the very top, 0 in the middle, +1 at the very bottom.' },
            { lines: 25, text: 'Speed up by 6% on every hit, but never beyond `kMaxSpeed`.' },
            { lines: 26, text: 'Turn the offset into an angle of up to 0.9 radians (about 52 degrees) up or down.' },
            { lines: 27, text: 'Build the new velocity from the angle and speed. Multiplying x by `sign` **forces** the ball away from the paddle.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why set the direction with abs and sign instead of negating?',
          text: 'The obvious bounce is `velocity.y = -velocity.y`. But the ball may still be beyond the wall (or inside the paddle) on the **next** frame, so the test fires again and flips it back, and the ball vibrates against the wall or gets stuck inside the paddle. Setting the direction to a definite value (`abs`, or `sign`) means repeating the bounce is harmless: it is already heading the right way, so it simply leaves.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Speeding up needs a cap',
          text: 'Each hit makes the ball 6% faster. Without `kMaxSpeed`, a long rally ends with a ball that moves further in one frame than the paddle and ball are thick together, so it passes through the paddle between two frames without ever overlapping it. That is [[tunnelling]], the same problem as a fast bullet through a thin wall.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'The top-wall bounce sets `ball.velocity.y = std::abs(ball.velocity.y)`. Why not just `ball.velocity.y = -ball.velocity.y`?',
      options: [
        { text: 'If the ball is still outside the wall next frame, negating again would flip it back and it would stick; `abs` always sends it downward.', correct: true, why: 'Forcing a definite direction makes a repeated bounce harmless.' },
        { text: '`abs` runs faster than negation.', why: 'The speed difference is irrelevant. The reason is correctness.' },
        { text: 'Negation does not work on `float` values.', why: 'It works perfectly well; it just has the repeat-bounce problem.' },
        { text: '`abs` makes the ball go faster after the bounce.', why: '`abs` only removes the sign. The speed is unchanged.' },
      ],
      explanation: 'A bounce that can fire on consecutive frames must be **idempotent**: doing it twice gives the same result as doing it once. Setting the direction explicitly achieves that.',
    },
    {
      kind: 'bug',
      prompt: 'After this change the ball sometimes jitters against the top and bottom walls. Tap the line that causes it.',
      code: `if (p.y < radius || p.y > kHeight - radius) {
    ball.velocity.y = -ball.velocity.y;
}`,
      bugLines: [2],
      explanation: 'Negating the velocity flips it **every frame** the ball is outside the walls, so after a slow or lagging frame it can flip twice and head back out. Set the direction explicitly instead: `abs` at the top wall, `-abs` at the bottom, and move the ball back inside.',
    },
    {
      kind: 'concept',
      title: 'Serving, scoring and phases',
      blocks: [
        {
          type: 'p',
          text: 'Between points the ball should wait in the middle for a moment, and after the last point the game should stop. That is three situations, so use a small `enum class Phase { Serving, Playing, GameOver }`, exactly as in the game states lesson, instead of a pile of flags.',
        },
        {
          type: 'code',
          code: `if (phase == Phase::Serving) {
    serveTimer -= dt;
    if (serveTimer <= 0.f) {
        ball.serve(serveToRight, rng);
        phase = Phase::Playing;
    }
}

if (ball.shape.getPosition().x < 0.f || ball.shape.getPosition().x > kWidth) {
    const bool rightScored = ball.shape.getPosition().x < 0.f;
    (rightScored ? scoreRight : scoreLeft) += 1;
    serveToRight = !rightScored;
    ball.place();
    serveTimer = 1.f;
    phase = (scoreLeft >= kWinScore || scoreRight >= kWinScore) ? Phase::GameOver
                                                                : Phase::Serving;
}`,
          annotations: [
            { lines: 2, text: 'While serving, the ball sits at the centre and a timer counts down.' },
            { lines: 4, text: 'When the timer runs out, give the ball its starting velocity and switch to playing.' },
            { lines: 9, text: 'If the ball has gone past either side edge, somebody scored.' },
            { lines: 11, text: '`(condition ? a : b) += 1` picks which score to raise. A conditional expression can be an **lvalue** when both sides are.' },
            { lines: 12, text: 'The next serve goes toward the player who just **lost** the point.' },
            { lines: [15, 16], text: 'Reaching the winning score moves to `GameOver`; otherwise serve again.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why serve toward the loser?',
          text: 'Serving toward the player who just conceded is a small fairness rule: the scorer gets a moment to relax and the loser gets the first touch. It also means the ball never starts by travelling toward whoever just won the point, who may still be out of position.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If the ball\'s speed-up has no maximum, a long rally can eventually make the ball pass through a paddle between two frames.',
      answer: true,
      explanation: 'Once the distance moved in one frame exceeds the combined thickness of ball and paddle, no frame ever sees an overlap. A speed cap (or sub-stepping) prevents this tunnelling.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the code that turns the hit position into a bounce angle.',
      template: 'const float offset = (ballY - paddleY) / (paddleHeight / ___);\nconst float angle = std::clamp(offset, -1.f, ___) * 0.9f;',
      blanks: [{ answers: ['2.f', '2'] }, { answers: ['1.f', '1'] }],
      wordBank: ['2.f', '1.f', '0.f', '90.f', '0.9f'],
      explanation: 'Dividing by **half** the paddle height maps the top edge to -1 and the bottom edge to +1. Clamping to that range stops a ball that clips the very corner from producing a steeper angle than intended.',
    },
    {
      kind: 'concept',
      title: 'Score digits without a font',
      blocks: [
        {
          type: 'p',
          text: 'Text needs a font file, which would make this project depend on an asset. A digit made of up to seven rectangles, like the display on a pocket calculator, needs no file at all, and keeps the game runnable the moment you compile it. (When you have a font, swap this for an `sf::Text` and the centring from the text lesson.)',
        },
        {
          type: 'code',
          code: `void drawDigit(sf::RenderTarget& target, int digit, sf::Vector2f origin) {
    // Segments: top, top-right, bottom-right, bottom, bottom-left, top-left, middle.
    static constexpr bool kOn[10][7] = {
        {1, 1, 1, 1, 1, 1, 0}, {0, 1, 1, 0, 0, 0, 0}, {1, 1, 0, 1, 1, 0, 1},
        {1, 1, 1, 1, 0, 0, 1}, {0, 1, 1, 0, 0, 1, 1}, {1, 0, 1, 1, 0, 1, 1},
        {1, 0, 1, 1, 1, 1, 1}, {1, 1, 1, 0, 0, 0, 0}, {1, 1, 1, 1, 1, 1, 1},
        {1, 1, 1, 1, 0, 1, 1},
    };
    static const sf::FloatRect kBox[7] = {
        {{4.f, 0.f}, {22.f, 6.f}},   {{24.f, 4.f}, {6.f, 20.f}},
        {{24.f, 26.f}, {6.f, 20.f}}, {{4.f, 44.f}, {22.f, 6.f}},
        {{0.f, 26.f}, {6.f, 20.f}},  {{0.f, 4.f}, {6.f, 20.f}},
        {{4.f, 22.f}, {22.f, 6.f}},
    };
    sf::RectangleShape segment;
    segment.setFillColor(sf::Color(230, 230, 230));
    for (int i = 0; i < 7; ++i) {
        if (kOn[digit][i]) {
            segment.setSize(kBox[i].size);
            segment.setPosition(origin + kBox[i].position);
            target.draw(segment);
        }
    }
}`,
          annotations: [
            { lines: 3, text: 'A table with one row per digit and one column per segment: 1 means that segment is lit.' },
            { lines: 9, text: 'The position and size of each of the seven segments inside a 30 × 50 cell.' },
            { lines: [17, 23], text: 'Draw only the lit segments, reusing one rectangle shape and changing its size and position each time.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Data tables beat long if-chains',
          text: 'Ten `if` or `case` branches, each drawing a different set of rectangles, would be long and easy to get wrong. A table of numbers plus one loop is shorter, and fixing a wrong digit means changing a single `0` or `1`. Whenever you see repeated code that differs only in values, turn the values into data.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The whole game',
      blocks: [
        {
          type: 'p',
          text: 'Here is everything together. Copy it into a project that links `SFML::Graphics` (see the setup lesson), and run it: **W** and **S** move your paddle, **Enter** restarts after a win, and **Esc** quits. First to five wins.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <algorithm>
#include <cmath>
#include <optional>
#include <random>

namespace {

constexpr float kWidth       = 800.f;
constexpr float kHeight      = 600.f;
constexpr float kPaddleSpeed = 420.f;
constexpr float kServeSpeed  = 360.f;
constexpr float kMaxSpeed    = 900.f;
constexpr int   kWinScore    = 5;

struct Paddle {
    sf::RectangleShape shape{{14.f, 90.f}};

    explicit Paddle(float x) {
        shape.setOrigin(shape.getSize() / 2.f);
        shape.setPosition({x, kHeight / 2.f});
    }

    void move(float dy) {
        const float half = shape.getSize().y / 2.f;
        const float y = std::clamp(shape.getPosition().y + dy, half, kHeight - half);
        shape.setPosition({shape.getPosition().x, y});
    }
};

struct Ball {
    sf::RectangleShape shape{{14.f, 14.f}};
    sf::Vector2f velocity{0.f, 0.f};

    Ball() { shape.setOrigin(shape.getSize() / 2.f); }

    void place() {
        shape.setPosition({kWidth / 2.f, kHeight / 2.f});
        velocity = {0.f, 0.f};
    }

    void serve(bool toRight, std::mt19937& rng) {
        std::uniform_real_distribution<float> spread(-0.5f, 0.5f);
        const float angle = spread(rng);
        velocity = {std::cos(angle) * kServeSpeed * (toRight ? 1.f : -1.f),
                    std::sin(angle) * kServeSpeed};
    }
};

enum class Phase { Serving, Playing, GameOver };

void drawDigit(sf::RenderTarget& target, int digit, sf::Vector2f origin) {
    // Segments: top, top-right, bottom-right, bottom, bottom-left, top-left, middle.
    static constexpr bool kOn[10][7] = {
        {1, 1, 1, 1, 1, 1, 0}, {0, 1, 1, 0, 0, 0, 0}, {1, 1, 0, 1, 1, 0, 1},
        {1, 1, 1, 1, 0, 0, 1}, {0, 1, 1, 0, 0, 1, 1}, {1, 0, 1, 1, 0, 1, 1},
        {1, 0, 1, 1, 1, 1, 1}, {1, 1, 1, 0, 0, 0, 0}, {1, 1, 1, 1, 1, 1, 1},
        {1, 1, 1, 1, 0, 1, 1},
    };
    static const sf::FloatRect kBox[7] = {
        {{4.f, 0.f}, {22.f, 6.f}},   {{24.f, 4.f}, {6.f, 20.f}},
        {{24.f, 26.f}, {6.f, 20.f}}, {{4.f, 44.f}, {22.f, 6.f}},
        {{0.f, 26.f}, {6.f, 20.f}},  {{0.f, 4.f}, {6.f, 20.f}},
        {{4.f, 22.f}, {22.f, 6.f}},
    };
    sf::RectangleShape segment;
    segment.setFillColor(sf::Color(230, 230, 230));
    for (int i = 0; i < 7; ++i) {
        if (kOn[digit][i]) {
            segment.setSize(kBox[i].size);
            segment.setPosition(origin + kBox[i].position);
            target.draw(segment);
        }
    }
}

}  // namespace

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Pong: W/S move, Esc quits, Enter restarts after a win");
    window.setFramerateLimit(120);
    std::mt19937 rng{std::random_device{}()};

    Paddle left(40.f);
    Paddle right(kWidth - 40.f);
    Ball ball;
    ball.place();

    int scoreLeft = 0;
    int scoreRight = 0;
    Phase phase = Phase::Serving;
    float serveTimer = 1.f;
    bool serveToRight = true;

    sf::Clock clock;
    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
                if (key->code == sf::Keyboard::Key::Escape) {
                    window.close();
                } else if (key->code == sf::Keyboard::Key::Enter && phase == Phase::GameOver) {
                    scoreLeft = scoreRight = 0;
                    ball.place();
                    serveTimer = 1.f;
                    phase = Phase::Serving;
                }
            }
        }

        const float dt = std::min(clock.restart().asSeconds(), 0.05f);

        float direction = 0.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::W)) direction -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::S)) direction += 1.f;
        left.move(direction * kPaddleSpeed * dt);

        const float gap = ball.shape.getPosition().y - right.shape.getPosition().y;
        const float reach = kPaddleSpeed * 0.8f * dt;
        right.move(std::clamp(gap, -reach, reach));

        if (phase == Phase::Serving) {
            serveTimer -= dt;
            if (serveTimer <= 0.f) {
                ball.serve(serveToRight, rng);
                phase = Phase::Playing;
            }
        } else if (phase == Phase::Playing) {
            ball.shape.move(ball.velocity * dt);

            const sf::Vector2f p = ball.shape.getPosition();
            const float radius = ball.shape.getSize().y / 2.f;
            if (p.y < radius) {
                ball.shape.setPosition({p.x, radius});
                ball.velocity.y = std::abs(ball.velocity.y);
            } else if (p.y > kHeight - radius) {
                ball.shape.setPosition({p.x, kHeight - radius});
                ball.velocity.y = -std::abs(ball.velocity.y);
            }

            for (Paddle* paddle : {&left, &right}) {
                if (!ball.shape.getGlobalBounds().findIntersection(paddle->shape.getGlobalBounds())) {
                    continue;
                }
                const bool isLeft = paddle == &left;
                const float sign = isLeft ? 1.f : -1.f;
                const float contactX = paddle->shape.getPosition().x +
                                       sign * (paddle->shape.getSize().x + ball.shape.getSize().x) / 2.f;
                ball.shape.setPosition({contactX, ball.shape.getPosition().y});

                const float offset = (ball.shape.getPosition().y - paddle->shape.getPosition().y) /
                                     (paddle->shape.getSize().y / 2.f);
                const float speed = std::min(ball.velocity.length() * 1.06f, kMaxSpeed);
                const float angle = std::clamp(offset, -1.f, 1.f) * 0.9f;
                ball.velocity = {std::cos(angle) * speed * sign, std::sin(angle) * speed};
            }

            if (ball.shape.getPosition().x < 0.f || ball.shape.getPosition().x > kWidth) {
                const bool rightScored = ball.shape.getPosition().x < 0.f;
                (rightScored ? scoreRight : scoreLeft) += 1;
                serveToRight = !rightScored;
                ball.place();
                serveTimer = 1.f;
                phase = (scoreLeft >= kWinScore || scoreRight >= kWinScore) ? Phase::GameOver
                                                                            : Phase::Serving;
            }
        }

        window.clear(sf::Color(12, 12, 24));
        for (float y = 10.f; y < kHeight; y += 30.f) {
            sf::RectangleShape dash({4.f, 16.f});
            dash.setPosition({kWidth / 2.f - 2.f, y});
            dash.setFillColor(sf::Color(70, 70, 90));
            window.draw(dash);
        }
        drawDigit(window, scoreLeft, {kWidth / 2.f - 90.f, 30.f});
        drawDigit(window, scoreRight, {kWidth / 2.f + 60.f, 30.f});
        window.draw(left.shape);
        window.draw(right.shape);
        if (phase == Phase::GameOver) {
            sf::RectangleShape banner({kWidth / 2.f, 8.f});
            banner.setFillColor(sf::Color(90, 200, 120));
            banner.setPosition({scoreLeft > scoreRight ? 0.f : kWidth / 2.f, 0.f});
            window.draw(banner);
        } else {
            window.draw(ball.shape);
        }
        window.display();
    }
}`,
          annotations: [
            { lines: [9, 14], text: 'All the numbers that shape how the game feels, in one place.' },
            { lines: 50, text: 'Three phases are all the game needs to track what happens next.' },
            { lines: 112, text: 'Clamped delta time, once per frame.' },
            { lines: [123, 129], text: 'Serving and playing are separate branches of the same update.' },
            { lines: [142, 157], text: 'The paddle bounce, from the previous section.' },
            { lines: [159, 167], text: 'A point scored: bump the score, re-centre the ball and decide the next phase.' },
            { lines: [170, 185], text: 'Draw order: background dashes, scores, paddles, then the ball (or the winner banner).' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Make it yours',
          text: 'Try these, one at a time: let a second player use the arrow keys instead of the AI; add a sound when the ball hits a paddle (from the audio lesson); make the paddle shrink as the score climbs; add a short pause and a "GET READY" flash before each serve; or move the whole game into the state stack so it has a title screen.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Where the game logic could be tested',
          text: 'The bounce maths (`offset`, `angle`, `speed`) depends on no window at all. Moving it into a plain function that takes the ball and paddle positions would let you check it with ordinary asserts. That separation is the main reason to keep game rules out of the drawing code.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put one frame of the Pong loop in order.',
      lines: [
        'Poll events (quit, restart)',
        'Compute a clamped delta time',
        'Move the paddles (player input and AI)',
        'Move the ball and resolve wall and paddle bounces',
        'Check for a point and update the phase',
        'Clear the window and draw everything',
      ],
      linesAreCode: false,
      explanation: 'Input and time come first, then movement, then collision, then scoring, and drawing is last so it shows the state after all of that.',
    },
  ],
  takeaways: [
    'Build a game as a list of small features, each runnable on its own, and keep tunable numbers in named constants.',
    'Keep rules such as "stay inside the window" in the object they belong to, so the player and the AI share them.',
    'Make bounces idempotent: set the direction explicitly (`abs`, `sign`) rather than negating it, and push the ball out of what it hit.',
    'Let the hit position set the angle, speed the ball up a little each hit, and cap the speed so it never tunnels.',
    'Use a phase enum for serving, playing and game over, and replace long if-chains with data tables when only values differ.',
  ],
  reading: [
    { title: 'Game Programming Patterns: Game Loop', url: 'https://gameprogrammingpatterns.com/game-loop.html', source: 'article', note: 'Why the loop is structured this way, and the time step trade-offs.' },
    { title: 'Drawing 2D stuff', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/draw/', source: 'other', note: 'The drawing basics this project uses.' },
  ],
};
