import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-shapes-transforms',
  title: 'Shapes, Vectors and Transforms',
  summary: 'Draw shapes, do vector maths with sf::Vector2f, and use origin, rotation, scale and parent transforms correctly.',
  minutes: 18,
  objectives: [
    'Create and style `CircleShape`, `RectangleShape` and `ConvexShape` objects',
    'Use `sf::Vector2f` operations: arithmetic, length, normalise, angle and rotate',
    'Explain how origin, position, rotation and scale combine, and rotate an object about its centre',
    'Use `sf::Angle` with `sf::degrees` and `sf::radians`',
    'Attach a child to a parent with `sf::RenderStates` and distinguish local from global bounds',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Shapes and colours',
      blocks: [
        {
          type: 'p',
          text: 'Shapes are the quickest way to get something on screen, and they are perfect for prototypes and debug drawing. SFML ships three: `CircleShape`, `RectangleShape` and the general `ConvexShape`. All of them can be filled, outlined and moved the same way, because they share the [[transformable]] and `sf::Shape` base classes.',
        },
        {
          type: 'code',
          code: `sf::RectangleShape wall({200.f, 20.f});
wall.setFillColor(sf::Color(90, 90, 110));
wall.setOutlineThickness(2.f);
wall.setOutlineColor(sf::Color::White);

sf::CircleShape hexagon(40.f, 6);      // radius 40, only 6 points
hexagon.setFillColor(sf::Color(255, 140, 0, 200));   // semi-transparent

sf::ConvexShape triangle(3);
triangle.setPoint(0, {0.f, -30.f});
triangle.setPoint(1, {25.f, 20.f});
triangle.setPoint(2, {-25.f, 20.f});`,
          annotations: [
            { lines: 1, text: 'A rectangle is constructed from its size as a `Vector2f`: width then height.' },
            { lines: 2, text: 'Colours are red, green, blue (0 to 255) and an optional **alpha**: 255 is opaque, 0 is invisible.' },
            { lines: 6, text: 'A circle is really a polygon with many points (30 by default). Fewer points make polygons: 3 gives a triangle, 6 a hexagon.' },
            { lines: [10, 12], text: 'A `ConvexShape` lets you place each corner yourself. It must be convex (no inward dents), and the points are relative to the shape\'s own origin.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is a "circle" a polygon?',
          text: 'GPUs draw triangles, not curves. SFML approximates a circle with enough straight edges that it looks round (30 by default). It is a trade-off between smoothness and cost: a huge circle may deserve 100 points, a tiny particle only 8. Knowing this also explains why `CircleShape(r, 6)` is the easiest way to draw a hexagon.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Vectors: positions, directions and angles',
      blocks: [
        {
          type: 'p',
          text: 'Almost every 2D game calculation is vector maths, and `sf::Vector2f` has the operations built in. Think of a vector as either a **point** ("where?") or an **arrow** ("which way and how far?").',
        },
        {
          type: 'table',
          headers: ['You want', 'Write', 'Notes'],
          rows: [
            ['Move an object by a step', '`pos + step`', 'Vectors add and subtract component by component'],
            ['Scale a vector', '`dir * 5.f`, `dir / 2.f`', 'Multiply or divide by a scalar'],
            ['Distance an arrow covers', '`v.length()`', 'Use `lengthSquared()` to compare cheaply'],
            ['Direction only', '`v.normalized()`', 'Length 1. **Never call on a zero vector.**'],
            ['Which way is it pointing?', '`v.angle()`', 'Returns an `sf::Angle`; 0 points right'],
            ['Turn an arrow', '`v.rotatedBy(sf::degrees(90.f))`', 'Rotates without changing length'],
          ],
        },
        {
          type: 'code',
          code: `// Point a turret at the mouse.
const sf::Vector2f toMouse = mouseWorld - turret.getPosition();
if (toMouse.lengthSquared() > 0.f) {
    turret.setRotation(toMouse.angle());
}

// Fire a bullet 600 px/s in the turret's facing direction.
const sf::Vector2f facing = sf::Vector2f(1.f, 0.f)
                                .rotatedBy(turret.getRotation());
bullet.velocity = facing * 600.f;`,
          annotations: [
            { lines: 2, text: '"From A to B" is always `B - A`. This arrow points from the turret to the mouse.' },
            { lines: 3, text: '`angle()` is undefined for the zero vector (the mouse exactly on the turret), so guard it just like `normalized()`.' },
            { lines: [8, 9], text: 'Start with an arrow pointing right (angle 0) and rotate it by the turret\'s angle to get its facing direction.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Clockwise is positive',
          text: 'Because y points down, angles increase **clockwise** on screen, the opposite of a maths textbook. `sf::degrees(90.f)` turns an arrow from pointing right to pointing *down*.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You have `player.getPosition()` and `enemy.getPosition()`. Which expression is the arrow pointing **from the enemy toward the player**?',
      options: [
        { text: 'player.getPosition() - enemy.getPosition()', correct: true, why: 'An arrow from A to B is B minus A, here the player minus the enemy.' },
        { text: 'enemy.getPosition() - player.getPosition()', why: 'That arrow points from the player toward the enemy, the opposite direction.' },
        { text: 'player.getPosition() + enemy.getPosition()', why: 'Adding two positions gives a meaningless point, not a direction between them.' },
        { text: 'player.getPosition() * enemy.getPosition()', why: 'Component-wise multiplication of two positions has no geometric meaning here (and is not defined with `*` for vectors anyway).' },
      ],
      codeOptions: true,
      explanation: '"Destination minus origin" gives the displacement from origin to destination. To make the enemy chase the player you would normalise that arrow and multiply by the enemy\'s speed.',
    },
    {
      kind: 'concept',
      title: 'Origin, position, rotation and scale',
      blocks: [
        {
          type: 'p',
          text: 'Every shape, sprite and text object is **transformable**: it has a position, rotation, scale and **origin**. The one people trip over is the origin. It is the point *inside the object* that position, rotation and scale all happen around. By default it is the top-left corner (`{0, 0}`).',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Spinner");
    window.setFramerateLimit(60);

    sf::RectangleShape square({120.f, 120.f});
    square.setFillColor(sf::Color(255, 200, 60));
    square.setOrigin({60.f, 60.f});          // centre of the square
    square.setPosition({400.f, 300.f});      // centre of the window

    sf::Clock clock;
    while (window.isOpen()) {
        const float dt = clock.restart().asSeconds();
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }

        square.rotate(sf::degrees(90.f * dt));   // 90 degrees per second

        window.clear(sf::Color(20, 24, 38));
        window.draw(square);
        window.display();
    }
}`,
          annotations: [
            { lines: 9, text: 'Move the origin to the square\'s centre. Now rotation and scale happen around the centre.' },
            { lines: 10, text: 'With the origin at the centre, `setPosition` places the **centre** of the square at (400, 300), the middle of the window.' },
            { lines: 21, text: '`rotate` adds to the current angle. `sf::degrees(90.f * dt)` is "90 degrees per second", scaled by delta time as always.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is the origin separate from the position?',
          text: 'Position says **where** the object is in the world; origin says **which point of the object** sits there. Separating them lets you pin a sprite by its feet, a door by its hinge, or a turret by its pivot, and rotate around that pin. Without it, rotating a sprite would swing it around its top-left corner like a flag on a pole.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Centre the origin once',
          text: 'For any object that rotates, scales or is positioned by its centre, set the origin from its local bounds right after creating it: `shape.setOrigin(shape.getLocalBounds().getCenter());` (for sprites and text, take the bounds\' `position` into account too).',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'In SFML 3, `shape.setRotation(90.f)` rotates the shape by 90 degrees.',
      answer: false,
      explanation: '`setRotation` now takes an `sf::Angle`, not a bare float, so `setRotation(90.f)` does not compile. Write `setRotation(sf::degrees(90.f))` (or `sf::radians`). The unit is part of the value, which removes the old "was that degrees or radians?" ambiguity.',
    },
    {
      kind: 'concept',
      title: 'Local bounds, global bounds and parent transforms',
      blocks: [
        {
          type: 'p',
          text: 'Two functions give an object\'s bounding rectangle. `getLocalBounds()` is the box around the object **before** any transform (position, rotation, scale). `getGlobalBounds()` is the axis-aligned box around it **after** transforms, in world coordinates, which is the one you use for collision and clicking.',
        },
        {
          type: 'p',
          text: 'You can also build hierarchies. Drawing a child with `states.transform = parent.getTransform()` makes the child\'s position **relative to the parent**, so the child follows, rotates and scales with it:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Planet and moon");
    window.setFramerateLimit(60);

    sf::CircleShape planet(40.f);
    planet.setOrigin({40.f, 40.f});
    planet.setPosition({400.f, 300.f});
    planet.setFillColor(sf::Color(70, 130, 255));

    sf::CircleShape moon(12.f);
    moon.setOrigin({12.f, 12.f});
    moon.setPosition({120.f, 0.f});          // relative to the planet!
    moon.setFillColor(sf::Color(200, 200, 200));

    sf::Clock clock;
    while (window.isOpen()) {
        const float dt = clock.restart().asSeconds();
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }

        planet.rotate(sf::degrees(45.f * dt));

        sf::RenderStates moonStates;
        moonStates.transform = planet.getTransform();

        window.clear(sf::Color(10, 10, 25));
        window.draw(planet);
        window.draw(moon, moonStates);
        window.display();
    }
}`,
          annotations: [
            { lines: 14, text: 'The moon\'s position is 120 pixels to the right of the **planet\'s origin**, not of the window.' },
            { lines: 26, text: 'Spinning the planet is all it takes to make the moon orbit.' },
            { lines: [28, 29], text: '`RenderStates` carries extra drawing settings. Setting its `transform` to the planet\'s makes SFML apply the planet\'s transform first, then the moon\'s.' },
            { lines: 33, text: 'Passing the states as the second argument to `draw` is how the parent-child link is applied.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the moon need the parent\'s transform passed in?',
          text: 'Each `Transformable` only knows its own position, rotation and scale. SFML has no built-in scene graph, so a child has no idea it belongs to anyone. You provide the relationship at draw time by combining transforms. It is a small amount of code, and a good illustration of the library-not-engine philosophy.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Global bounds of a rotated shape grow',
          text: '`getGlobalBounds()` is always an axis-aligned rectangle. A square rotated by 45 degrees has a larger global box than its actual shape, because the box must contain the corners. Fine for broad collision checks; remember it is a bounding box, not an outline.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code so the sprite-like square spins around its **centre**.',
      template: 'square.___({60.f, 60.f});      // half of 120 x 120\nsquare.___(sf::degrees(90.f * dt));',
      blanks: [{ answers: ['setOrigin'] }, { answers: ['rotate'] }],
      wordBank: ['setOrigin', 'rotate', 'setPosition', 'setScale', 'move'],
      explanation: 'The origin is the pivot for rotation and scale. Moving it to the middle of the square (half its width and height) makes `rotate` spin it in place, rather than swinging it around its top-left corner.',
    },
    {
      kind: 'bug',
      prompt: 'This SFML 2-style code does not compile with SFML 3. Tap the line that must change.',
      code: `sf::CircleShape coin(15.f);
coin.setFillColor(sf::Color::Yellow);
coin.setPosition(200.f, 120.f);
coin.setRotation(30.f);
window.draw(coin);`,
      bugLines: [3, 4],
      explanation: 'SFML 3 takes positions as a single vector and rotations as an `sf::Angle`. The corrected lines are `coin.setPosition({200.f, 120.f});` and `coin.setRotation(sf::degrees(30.f));`. Both changes make the call self-describing and let the compiler catch swapped arguments.',
    },
    {
      kind: 'mcq',
      prompt: 'You rotate a 100 × 100 square by 45 degrees. What does `getGlobalBounds()` return compared with `getLocalBounds()`?',
      options: [
        { text: 'A larger axis-aligned box (about 141 × 141) that contains the rotated corners', correct: true, why: 'The rotated diamond\'s extreme corners lie about 70.7 pixels from the centre in each direction, so the enclosing axis-aligned box is about 141 wide and tall.' },
        { text: 'The same 100 × 100 box, rotated by 45 degrees', why: '`FloatRect` cannot be rotated. It is always axis-aligned.' },
        { text: 'A smaller box that fits inside the diamond', why: 'Bounds always **contain** the object; they never cut parts off.' },
        { text: 'An empty rectangle', why: 'Only a shape with no area would give an empty box.' },
      ],
      explanation: 'A rotated square\'s tightest axis-aligned bounding box grows to 100 × (cos 45° + sin 45°) ≈ 141. That is why bounding-box collision is approximate for rotated objects.',
    },
  ],
  takeaways: [
    'Shapes (`CircleShape`, `RectangleShape`, `ConvexShape`) share fill, outline and transform functions; a circle is just a many-sided polygon.',
    'Vector maths covers most gameplay: `target - origin` gives a direction, `normalized()` and `* speed` give a velocity, `angle()` and `rotatedBy()` handle rotation.',
    'Position, rotation and scale all happen around the **origin**; set it to the centre for objects that spin or are placed by their middle.',
    'SFML 3 takes positions as vectors and rotations as `sf::Angle` (`sf::degrees`, `sf::radians`).',
    '`getGlobalBounds()` gives the transformed, axis-aligned box used for collision; combine `RenderStates` transforms to build parent-child relationships.',
  ],
  reading: [
    { title: 'Shapes', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/shape/', source: 'other', note: 'Every shape type and its options.' },
    { title: 'Position, rotation, scale: transforming entities', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/transform/', source: 'other', note: 'Origin, transform composition and `sf::Transform`.' },
    { title: 'Handling angles', url: 'https://www.sfml-dev.org/tutorials/3.0/system/angle/', source: 'other', note: 'How `sf::Angle` works and why it replaced plain floats.' },
  ],
};
