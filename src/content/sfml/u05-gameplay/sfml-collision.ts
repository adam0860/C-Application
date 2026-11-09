import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-collision',
  title: 'Collision Detection',
  summary: 'Test rectangles and circles for overlap, resolve a collision one axis at a time so the player slides along walls, and stop fast bullets tunnelling through thin ones.',
  minutes: 20,
  objectives: [
    'Test two rectangles for overlap with `getGlobalBounds` and `findIntersection`',
    'Test two circles for overlap using squared distances',
    'Resolve a collision by moving one axis at a time and pushing the player out',
    'Explain tunnelling and prevent it with sub-steps',
    'Avoid checking every object against every other object',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Rectangles: the workhorse test',
      blocks: [
        {
          type: 'p',
          text: 'SFML has no physics engine, but it gives you the building blocks. Every shape, sprite and text can report its [[local-vs-global-bounds|global bounds]]: an **axis-aligned rectangle** (an [[aabb]]) that encloses it in world coordinates. Two such rectangles overlap if and only if they overlap on *both* the x axis and the y axis, and `sf::Rect` can check that for you.',
        },
        {
          type: 'code',
          code: `const sf::FloatRect a = player.getGlobalBounds();
const sf::FloatRect b = enemy.getGlobalBounds();

if (a.findIntersection(b)) {
    // they overlap
}

if (const auto overlap = a.findIntersection(b)) {
    // overlap->size is the width and height of the shared area
}

if (b.contains(mouseWorld)) {
    // a point is inside the rectangle
}`,
          annotations: [
            { lines: 4, text: '`findIntersection` returns an `std::optional<FloatRect>`: empty when they miss, and the overlapping rectangle when they hit. An optional is false when empty, so you can use it directly in an `if`.' },
            { lines: [8, 9], text: 'The overlap rectangle is useful, not just a yes/no: its `size` tells you how far one box has sunk into the other.' },
            { lines: 12, text: 'Use `contains` for point tests such as mouse clicks. Convert pixels to world coordinates first if you have a camera.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why rectangles for almost everything?',
          text: 'The rectangle test is a handful of comparisons, so you can run thousands of them per frame. It is also forgiving in a good way: a player whose collision box is a little smaller than their picture feels fair, while one that is larger feels like getting hit by something that missed. Most games use boxes, circles, or a small group of them per object, not pixel-perfect shapes.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Rotated objects get a bigger box',
          text: '`getGlobalBounds()` is always axis-aligned, so for a rotated sprite it is the smallest *upright* rectangle that contains it. A long sword rotated 45 degrees has a much larger box than the sword itself, giving false hits in the empty corners. Use a circle, a smaller hand-made box, or a more advanced test for rotating things.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'For a sprite rotated by 45 degrees, `getGlobalBounds()` returns a rectangle that is rotated 45 degrees to fit it tightly.',
      answer: false,
      explanation: '`sf::Rect` has no rotation, so global bounds is always axis-aligned. For a rotated sprite it is the smallest **upright** rectangle that contains it, and it is usually larger than the sprite.',
    },
    {
      kind: 'concept',
      title: 'Circles: squared distance, no square root',
      blocks: [
        {
          type: 'p',
          text: 'Round things (asteroids, balls, area-of-effect blasts) are better modelled as circles, and a circle looks the same however it rotates. Two circles overlap when the distance between their centres is less than the sum of their radii. You can test that **without a square root** by comparing squared values, because squaring both sides never changes which one is bigger:',
        },
        {
          type: 'code',
          code: `bool circlesOverlap(sf::Vector2f centreA, float radiusA,
                    sf::Vector2f centreB, float radiusB) {
    const float reach = radiusA + radiusB;
    return (centreB - centreA).lengthSquared() < reach * reach;
}

// Circle (centre c, radius r) against a point p:
bool pointInCircle(sf::Vector2f p, sf::Vector2f c, float r) {
    return (p - c).lengthSquared() <= r * r;
}`,
          annotations: [
            { lines: 3, text: 'Two circles touch when their centres are closer than the **sum** of their radii.' },
            { lines: 4, text: '`lengthSquared()` is `x*x + y*y`. Comparing it with `reach * reach` gives the same answer as comparing lengths, without the cost of `length()`.' },
            { lines: 9, text: 'The same trick tests a point against a circle.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why compare squares instead of lengths?',
          text: 'A square root is much slower than a multiplication, and you may test thousands of pairs per frame. Because squaring two non-negative numbers keeps their order, `length < reach` and `length*length < reach*reach` are always the same answer. It is a small trick, but you will reuse it for ranges, aggro radii and pickups.',
        },
        {
          type: 'table',
          caption: 'Choosing a collision shape.',
          headers: ['Shape', 'Cost', 'Best for'],
          rows: [
            ['Rectangle (AABB)', 'Very cheap', 'Walls, platforms, pickups, UI, most characters'],
            ['Circle', 'Very cheap', 'Balls, asteroids, bullets, explosion radius'],
            ['Several small boxes', 'Cheap', 'A character with separate head and feet boxes'],
            ['Pixel-perfect', 'Slow, fiddly', 'Almost never worth it'],
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Finish the circle test so it avoids a square root.',
      template: 'const float reach = radiusA + radiusB;\nreturn (centreB - centreA).lengthSquared() < ___ * ___;',
      blanks: [{ answers: ['reach'] }, { answers: ['reach'] }],
      wordBank: ['reach', 'radiusA', 'radiusB', 'centreA', 'centreB'],
      explanation: 'Squaring both sides turns the distance comparison into one that needs no square root. The squared distance is compared with the square of the combined radii.',
    },
    {
      kind: 'concept',
      title: 'Resolving a hit: one axis at a time',
      blocks: [
        {
          type: 'p',
          text: 'Detecting a hit is half the job. For a player and a wall, you also need to put the player back where they cannot overlap. The reliable method is to move the player along **x only**, fix any overlap, then move along **y only** and fix that. Handling the axes separately makes it clear which side was hit, so the player slides smoothly along walls instead of sticking to them:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <optional>
#include <vector>

int main() {
    sf::RenderWindow window(sf::VideoMode({640u, 480u}), "Collision");
    window.setFramerateLimit(60);

    sf::RectangleShape player({32.f, 32.f});
    player.setFillColor(sf::Color(80, 200, 120));
    player.setPosition({60.f, 60.f});

    std::vector<sf::RectangleShape> walls;
    auto addWall = [&walls](sf::Vector2f position, sf::Vector2f size) {
        sf::RectangleShape wall(size);
        wall.setPosition(position);
        wall.setFillColor(sf::Color(120, 120, 140));
        walls.push_back(wall);
    };
    addWall({200.f, 100.f}, {40.f, 260.f});
    addWall({360.f, 200.f}, {200.f, 40.f});
    addWall({0.f, 440.f}, {640.f, 40.f});

    const float speed = 220.f;
    sf::Clock clock;

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }
        const float dt = clock.restart().asSeconds();

        sf::Vector2f direction{0.f, 0.f};
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Left))  direction.x -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Right)) direction.x += 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Up))    direction.y -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Down))  direction.y += 1.f;
        if (direction.x != 0.f || direction.y != 0.f) {
            direction = direction.normalized();
        }
        const sf::Vector2f step = direction * speed * dt;

        player.move({step.x, 0.f});
        for (const sf::RectangleShape& wall : walls) {
            if (const auto hit = player.getGlobalBounds().findIntersection(wall.getGlobalBounds())) {
                player.move({step.x > 0.f ? -hit->size.x : hit->size.x, 0.f});
            }
        }

        player.move({0.f, step.y});
        for (const sf::RectangleShape& wall : walls) {
            if (const auto hit = player.getGlobalBounds().findIntersection(wall.getGlobalBounds())) {
                player.move({0.f, step.y > 0.f ? -hit->size.y : hit->size.y});
            }
        }

        window.clear(sf::Color(20, 20, 30));
        for (const sf::RectangleShape& wall : walls) {
            window.draw(wall);
        }
        window.draw(player);
        window.display();
    }
}`,
          annotations: [
            { lines: [40, 42], text: 'Only normalise when there is input. `normalized()` on a zero vector is a bug, and normalising stops diagonal movement being faster.' },
            { lines: 43, text: 'The movement for this frame: direction × speed × delta time.' },
            { lines: 45, text: 'Move on **x only**. If this step caused an overlap, the problem is on the left or right.' },
            { lines: [46, 50], text: 'Push the player back by the width of the overlap, in the opposite direction to the movement. That puts the edges exactly touching.' },
            { lines: 52, text: 'Now move on **y only**, and repeat. Because x is already fixed, a hit here can only be from above or below.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not move diagonally and resolve once?',
          text: 'If you move on both axes and then find an overlap, you cannot tell whether the player hit the side or the top of the wall, because the overlap rectangle could be fixed by pushing in either direction. Picking the wrong one snaps the player to the wrong side or makes them stick to a wall they were sliding along. Separating the axes makes each fix unambiguous, and the slide along the wall comes for free: blocked on x, still free on y.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Know which way you hit',
          text: 'Platformers use the same pattern to detect "standing on the ground": after the y move, a hit while moving down means the player has landed, so zero the vertical speed and set a grounded flag. A hit while moving up means a ceiling.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A player slides along a wall when walking diagonally into it, instead of sticking. Which design gives this behaviour?',
      options: [
        { text: 'Move on x and resolve, then move on y and resolve.', correct: true, why: 'Only the blocked axis is cancelled, so movement along the free axis continues.' },
        { text: 'Move on both axes, then undo the whole move if there is a hit.', why: 'Undoing the whole move stops the player completely, so they stick to the wall.' },
        { text: 'Normalise the direction vector.', why: 'Normalising fixes diagonal speed, not wall behaviour.' },
        { text: 'Make the collision box bigger.', why: 'A bigger box makes hits earlier, but does nothing about how the hit is resolved.' },
      ],
      explanation: 'Resolving each axis separately only blocks the direction that is actually obstructed, which is exactly what sliding is.',
    },
    {
      kind: 'concept',
      title: 'Tunnelling, and checking too many pairs',
      blocks: [
        {
          type: 'p',
          text: 'Collision tests look at where things *are*, once per frame, not at the path between frames. A bullet moving 30 pixels per frame can jump clean over a 10-pixel wall without any frame ever seeing an overlap. This is called [[tunnelling]]. The simplest fix is to take the move in **sub-steps** that are small enough to be caught:',
        },
        {
          type: 'code',
          code: `const float maxStep = 8.f;                 // never move more than 8 px at once
const sf::Vector2f move = velocity * dt;
const int steps = std::max(1, static_cast<int>(std::ceil(move.length() / maxStep)));

for (int i = 0; i < steps; ++i) {
    bullet.move(move / static_cast<float>(steps));
    if (hitsAnything(bullet)) {
        break;
    }
}`,
          annotations: [
            { lines: 1, text: 'Choose a step smaller than your thinnest obstacle, so no frame can skip over it.' },
            { lines: 3, text: 'How many pieces to cut this frame\'s move into. `max(1, ...)` ensures at least one step, even when standing still.' },
            { lines: [5, 6], text: 'Take each small piece in turn, testing after each one.' },
            { lines: [7, 9], text: 'Stop at the first hit, so a bullet does not carry on through the wall.' },
          ],
        },
        {
          type: 'p',
          text: 'The second trap is how many tests you run. Checking every object against every other takes n × (n − 1) ÷ 2 pairs: 100 objects need 4,950 tests per frame, but 1,000 objects need **499,500**. Cheap tests stop being cheap. The usual cure is a **broad phase**: first sort objects into a coarse grid, then only compare objects that share a cell.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do pair counts explode?',
          text: 'Each new object has to be tested against every existing one, so the work grows with the **square** of the object count rather than in proportion to it. Ten times as many objects means a hundred times as many tests. A grid reduces each object\'s candidates to the handful sitting nearby, so the work becomes roughly proportional to the object count again.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'You may not need a grid',
          text: 'For a few hundred objects, a simple double loop is perfectly fine. Add a spatial grid when profiling shows collision taking a real share of the frame, typically with bullet hells, big crowds or particle collisions.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This loop compares every enemy with every other enemy, but it handles each pair twice and also tests each enemy against itself. Tap the line that needs to change.',
      code: `for (std::size_t i = 0; i < enemies.size(); ++i) {
    for (std::size_t j = 0; j < enemies.size(); ++j) {
        if (overlaps(enemies[i], enemies[j])) {
            separate(enemies[i], enemies[j]);
        }
    }
}`,
      bugLines: [2],
      explanation: 'The inner loop should start at `i + 1`. Starting at 0 compares an enemy with itself (always an overlap) and visits pair (a, b) as well as (b, a). Starting at `i + 1` visits each unordered pair exactly once.',
    },
    {
      kind: 'order',
      prompt: 'Put the per-frame movement and collision steps in the right order.',
      lines: [
        'Read input and build a direction',
        'Move the player along x',
        'Push the player out of any wall on x',
        'Move the player along y',
        'Push the player out of any wall on y',
      ],
      linesAreCode: false,
      explanation: 'Input first, then each axis in turn: move, then resolve. Doing x fully before y is what makes sliding work.',
    },
  ],
  takeaways: [
    '`getGlobalBounds()` gives an axis-aligned rectangle and `findIntersection` returns an optional overlap; `contains` tests a point.',
    'Rotated objects get a larger global bounds, so use circles or smaller hand-made boxes where that matters.',
    'Compare squared distances (`lengthSquared`) to test circles without a square root.',
    'Resolve collisions by moving and fixing x first, then y, so the player slides along walls instead of sticking.',
    'Fast objects tunnel through thin walls; take the move in sub-steps. Avoid n-squared pair tests with a coarse grid when counts grow.',
  ],
  reading: [
    { title: 'Position, rotation, scale: transforming entities', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/transform/', source: 'other', note: 'Where global and local bounds come from.' },
    { title: 'Vector math in SFML', url: 'https://www.sfml-dev.org/tutorials/3.0/system/vector/', source: 'other', note: 'Length, normalisation and dot products used in collision code.' },
  ],
};
