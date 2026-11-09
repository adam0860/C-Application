import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-project-shooter',
  title: 'Project: Top-Down Shooter',
  summary: 'Build a complete arena shooter: move with WASD, aim with the mouse, fire bullets, fight waves of enemies that get tougher, and restart after game over.',
  minutes: 35,
  objectives: [
    'Structure a game around a World that owns entities and a player',
    'Move, aim and fire using vector maths and a cooldown timer',
    'Spawn enemies at random edges and make the game harder over time',
    'Resolve bullet, enemy and player collisions with circle tests',
    'Run the frame in the right order: update, add, collide, remove, draw',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Design: who lives in the world?',
      blocks: [
        {
          type: 'p',
          text: 'This project combines almost everything in the course: delta time, vectors, the mouse, collision, an entity list with deferred spawning, and a difficulty ramp. Before writing code, decide **what exists** and who owns it. There are three kinds of thing: the **player**, **bullets** and **enemies**. Bullets and enemies are entities in a list. The player is a handful of values (position, facing, health) stored directly in the `World`, because there is only ever one and almost everything else needs to know where it is.',
        },
        {
          type: 'table',
          caption: 'What each kind of thing does.',
          headers: ['Thing', 'Lives in', 'Behaviour'],
          rows: [
            ['Player', 'Plain members of `World`', 'WASD moves, mouse aims, left button fires, loses health when touched'],
            ['Bullet', 'Entity list', 'Flies straight, dies after 1.2 s or when it leaves the window'],
            ['Enemy', 'Entity list', 'Walks straight toward the player, dies when shot or when it touches the player'],
          ],
        },
        {
          type: 'code',
          code: `class Entity {
public:
    enum class Kind { Bullet, Enemy };

    Entity(Kind kind, sf::Vector2f position, float radius, sf::Color colour) : m_kind(kind) {
        m_shape.setRadius(radius);
        m_shape.setOrigin({radius, radius});
        m_shape.setPosition(position);
        m_shape.setFillColor(colour);
    }
    virtual ~Entity() = default;

    virtual void update(float dt, const World& world) = 0;

    Kind kind() const { return m_kind; }
    sf::Vector2f position() const { return m_shape.getPosition(); }
    float radius() const { return m_shape.getRadius(); }
    bool alive() const { return m_alive; }
    void kill() { m_alive = false; }
    void draw(sf::RenderTarget& target) const { target.draw(m_shape); }

protected:
    sf::CircleShape m_shape;

private:
    Kind m_kind;
    bool m_alive = true;
};`,
          annotations: [
            { lines: 3, text: 'A `Kind` tag lets the collision code ask what an entity is without any casting. The cost is keeping the enum in step with the classes.' },
            { lines: 13, text: 'Entities get a `const World&`. They may **look** (for the player\'s position) but cannot spawn, kill others or change the list.' },
            { lines: 19, text: 'A kill flag, as in the game objects lesson. Nothing is erased in the middle of an update.' },
            { lines: [22, 23], text: 'Derived classes can move their circle, but code outside cannot reach the shape.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why const World& and not World&?',
          text: 'Restricting what entities can do is a design choice, not just caution. If an enemy could spawn or erase entities, the list would change while the world loops over it, which is the bug the pending list was invented to avoid. By handing out a **const** world, the only code that changes the entity list is `World` itself, at points it controls. Anything an entity needs to cause (like a hit) is worked out by `World` afterwards, in the collision step.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why is the player not an entity?',
          text: 'Making the player an entity would be fine, but then every enemy would have to search the list to find it. With a single player, a few members on `World` are simpler, and nothing is lost: add the player to the list only if you later want several of them.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Moving, aiming and firing',
      blocks: [
        {
          type: 'p',
          text: 'Three inputs, all handled in `World::update`. Movement and aim use vector maths from earlier lessons, and firing uses a cooldown so holding the button does not spawn 120 bullets a second.',
        },
        {
          type: 'code',
          code: `if (move.lengthSquared() > 0.f) {
    m_player += move.normalized() * kPlayerSpeed * dt;
    m_player.x = std::clamp(m_player.x, kPlayerRadius, kWidth - kPlayerRadius);
    m_player.y = std::clamp(m_player.y, kPlayerRadius, kHeight - kPlayerRadius);
}
const sf::Vector2f toAim = aimPoint - m_player;
if (toAim.lengthSquared() > 1.f) {
    m_facing = toAim.normalized();
}

m_fireTimer -= dt;
if (firing && m_fireTimer <= 0.f) {
    m_fireTimer = kFireDelay;
    spawn(std::make_unique<Bullet>(m_player + m_facing * 22.f, m_facing));
}`,
          annotations: [
            { lines: [1, 5], text: 'Move only when there is input, because `normalized()` on a zero vector is a bug. Normalising stops diagonal movement being faster, then the clamps keep the whole ship inside the window.' },
            { lines: [6, 9], text: 'The facing is the unit vector from the player toward the mouse. It is only updated when the mouse is not exactly on the player, again because normalising zero is not allowed.' },
            { lines: [11, 15], text: 'Count the cooldown down every frame. While the button is held and the timer has run out, queue a bullet just in front of the ship, moving in the facing direction, and reset the timer.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a cooldown instead of firing every frame?',
          text: 'The loop may run at 60, 120 or 240 frames per second, so firing once per frame would give a different rate on each machine and bury the player in bullets. A timer counted in seconds gives the same 6.7 shots per second everywhere, and the single constant `kFireDelay` is how you balance the weapon.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Mouse position needs the right coordinates',
          text: 'The loop reads the mouse with `window.mapPixelToCoords(sf::Mouse::getPosition(window))`. With the default view that equals the pixel position, but written this way it keeps working if you later add a scrolling camera, because the conversion accounts for the view.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does `Entity::update` take `const World&` rather than `World&`?',
      options: [
        { text: 'Entities can read the world (the player position) but cannot change the entity list while it is being looped over.', correct: true, why: 'Only `World` modifies its own list, at moments it controls, which avoids invalidating iterators.' },
        { text: 'A `const` reference is faster than a non-const one.', why: 'Const-ness does not change the speed. It changes what the code is allowed to do.' },
        { text: 'Because `World` has no non-const functions.', why: '`World` has several, such as `update` and `reset`; entities simply cannot call them.' },
        { text: 'To stop the player from being modified.', why: 'The player is not changed through entities either way; the point is the entity list.' },
      ],
      explanation: 'A const reference is a promise. The compiler enforces that entities only observe, so the list can never change under the loop that is updating them.',
    },
    {
      kind: 'concept',
      title: 'Enemies, difficulty and collisions',
      blocks: [
        {
          type: 'p',
          text: 'Enemies appear just outside a random edge of the window, so they walk in rather than popping up. How fast they come, and how fast they walk, depends on how long the game has been running. That is the whole difficulty system: two numbers that creep upward and then stop at a limit.',
        },
        {
          type: 'code',
          code: `void World::spawnEnemy() {
    std::uniform_real_distribution<float> along(0.f, 1.f);
    std::uniform_int_distribution<int> side(0, 3);
    sf::Vector2f p;
    switch (side(m_rng)) {
        case 0:  p = {along(m_rng) * kWidth, -20.f}; break;
        case 1:  p = {along(m_rng) * kWidth, kHeight + 20.f}; break;
        case 2:  p = {-20.f, along(m_rng) * kHeight}; break;
        default: p = {kWidth + 20.f, along(m_rng) * kHeight}; break;
    }
    const float speed = std::min(80.f + m_elapsed * 1.5f, 220.f);
    spawn(std::make_unique<Enemy>(p, speed));
}`,
          annotations: [
            { lines: [5, 10], text: 'Pick one of the four edges at random and a random point along it, placed 20 pixels outside the window.' },
            { lines: 11, text: 'Speed starts at 80 and rises by 1.5 per second of play, capped at 220 so it stays dodgeable. The cap is what stops the game becoming impossible.' },
          ],
        },
        {
          type: 'p',
          text: 'After everything has moved, the world checks who touches whom. Bullets against enemies first, then enemies against the player. Both use the circle test from the collision lesson:',
        },
        {
          type: 'code',
          code: `void World::resolveCollisions() {
    for (const auto& bullet : m_entities) {
        if (bullet->kind() != Entity::Kind::Bullet) continue;
        for (const auto& enemy : m_entities) {
            if (enemy->kind() != Entity::Kind::Enemy || !enemy->alive() || !bullet->alive()) continue;
            if (circlesOverlap(bullet->position(), bullet->radius(), enemy->position(), enemy->radius())) {
                bullet->kill();
                enemy->kill();
                ++m_score;
            }
        }
    }
    for (const auto& enemy : m_entities) {
        if (enemy->kind() == Entity::Kind::Enemy && enemy->alive() && m_hurtTimer <= 0.f &&
            circlesOverlap(m_player, kPlayerRadius, enemy->position(), enemy->radius())) {
            enemy->kill();
            --m_health;
            m_hurtTimer = 0.8f;
        }
    }
}`,
          annotations: [
            { lines: [2, 12], text: 'For every bullet, check every enemy. A hit kills both and adds a point. The `alive()` checks stop one bullet from killing two enemies in the same frame.' },
            { lines: 14, text: 'Enemies only hurt the player when `m_hurtTimer` has run out: a short **invulnerability** window after every hit.' },
            { lines: [16, 18], text: 'A touching enemy is killed, health drops and the invulnerability timer starts, which also drives the ship\'s blinking.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why invulnerability after a hit?',
          text: 'Without it, three enemies arriving together would each take a point of health in the same frame, and a player who did nothing wrong would lose most of their health instantly. A short window of immunity makes damage feel **fair** and readable, because every point lost is a mistake the player can see and learn from. The blinking ship tells them it is happening.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Is looping over every bullet and enemy too slow?',
          text: 'Not here. With a few dozen bullets and enemies the loop is a few hundred cheap circle tests per frame. The grid trick from the collision lesson is only worth adding when you reach thousands, such as a bullet-hell with a screen full of projectiles.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Normalising the movement vector is what stops the player moving faster when pressing two keys at once, such as W and D.',
      answer: true,
      explanation: 'Pressing W and D gives the vector (1, -1), whose length is about 1.41, so without normalising the player would move 41% faster on a diagonal. Normalising makes the length 1 in every direction.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the aiming code: the facing is the unit vector from the player to the mouse.',
      template: 'const sf::Vector2f toAim = ___ - m_player;\nif (toAim.lengthSquared() > 1.f) {\n    m_facing = toAim.___();\n}',
      blanks: [{ answers: ['aimPoint'] }, { answers: ['normalized'] }],
      wordBank: ['aimPoint', 'normalized', 'length', 'm_facing', 'angle'],
      explanation: 'The direction to the target is target minus origin, and `normalized()` scales it to length 1 so it can be multiplied by any speed or distance.',
    },
    {
      kind: 'concept',
      title: 'The frame, in the right order',
      blocks: [
        {
          type: 'p',
          text: 'The order of the steps inside `World::update` is part of the design. Each step relies on the one before it, and swapping them produces bugs that are hard to explain:',
        },
        {
          type: 'code',
          code: `for (const auto& entity : m_entities) {
    entity->update(dt, *this);
}
for (auto& entity : m_pending) {
    m_entities.push_back(std::move(entity));
}
m_pending.clear();

resolveCollisions();

m_entities.erase(std::remove_if(m_entities.begin(), m_entities.end(),
                                [](const auto& e) { return !e->alive(); }),
                 m_entities.end());`,
          annotations: [
            { lines: [1, 3], text: 'Update every entity. Bullets and enemies move; none of them add or remove anything.' },
            { lines: [4, 7], text: 'Only now bring in the entities queued this frame (new bullets and enemies), then clear the queue.' },
            { lines: 9, text: 'Resolve collisions after **everything** has moved, so each pair is compared at its final positions for this frame.' },
            { lines: [11, 13], text: 'Finally erase whatever was marked dead, using the erase-remove idiom from the game objects lesson.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why collide before erasing, and erase last?',
          text: 'Collisions mark things dead rather than deleting them, so the loops that are still running never lose an element. The erase happens once, at the end, when nothing is iterating. If you erased inside the collision loops you would reintroduce the iterator problem; if you erased before colliding, a bullet that should have hit something would have been removed first.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The game crashes (or produces NaN positions) the instant the mouse pointer is exactly on top of the ship. Tap the line responsible.',
      code: `const sf::Vector2f toAim = aimPoint - m_player;
m_facing = toAim.normalized();`,
      bugLines: [2],
      explanation: 'When the pointer is exactly over the player, `toAim` is the zero vector, and `normalized()` asserts (or divides by zero) on it. Check `toAim.lengthSquared() > 0` first and keep the previous facing otherwise.',
    },
    {
      kind: 'order',
      prompt: 'Put the steps of `World::update` in the right order.',
      lines: [
        'Move the player, aim and queue any new bullets and enemies',
        'Update every entity',
        'Move the queued entities into the world',
        'Resolve collisions (mark things dead, change score and health)',
        'Erase the dead entities',
      ],
      linesAreCode: false,
      explanation: 'Spawning is queued, entities then move, the queue is merged, collisions are resolved at the final positions, and the removal happens last, when nothing is looping over the list.',
    },
    {
      kind: 'concept',
      title: 'The whole game',
      blocks: [
        {
          type: 'p',
          text: 'Copy this into a project that links `SFML::Graphics`. **WASD** moves, the **mouse** aims, hold the **left button** to fire, **Enter** restarts after game over and **Esc** quits. The score shows in the window title, so the game needs no font and no image files.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <algorithm>
#include <cmath>
#include <memory>
#include <optional>
#include <random>
#include <string>
#include <vector>

namespace {

constexpr float kWidth = 960.f;
constexpr float kHeight = 640.f;
constexpr float kPlayerSpeed = 260.f;
constexpr float kPlayerRadius = 16.f;
constexpr float kBulletSpeed = 700.f;
constexpr float kFireDelay = 0.15f;

bool circlesOverlap(sf::Vector2f a, float ra, sf::Vector2f b, float rb) {
    const float reach = ra + rb;
    return (b - a).lengthSquared() < reach * reach;
}

class World;

class Entity {
public:
    enum class Kind { Bullet, Enemy };

    Entity(Kind kind, sf::Vector2f position, float radius, sf::Color colour) : m_kind(kind) {
        m_shape.setRadius(radius);
        m_shape.setOrigin({radius, radius});
        m_shape.setPosition(position);
        m_shape.setFillColor(colour);
    }
    virtual ~Entity() = default;

    virtual void update(float dt, const World& world) = 0;

    Kind kind() const { return m_kind; }
    sf::Vector2f position() const { return m_shape.getPosition(); }
    float radius() const { return m_shape.getRadius(); }
    bool alive() const { return m_alive; }
    void kill() { m_alive = false; }
    void draw(sf::RenderTarget& target) const { target.draw(m_shape); }

protected:
    sf::CircleShape m_shape;

private:
    Kind m_kind;
    bool m_alive = true;
};

class World {
public:
    World() { reset(); }

    void reset();
    void update(float dt, sf::Vector2f move, sf::Vector2f aimPoint, bool firing);
    void draw(sf::RenderTarget& target) const;

    sf::Vector2f playerPosition() const { return m_player; }
    int score() const { return m_score; }
    int health() const { return m_health; }
    bool gameOver() const { return m_health <= 0; }

private:
    void spawn(std::unique_ptr<Entity> entity) { m_pending.push_back(std::move(entity)); }
    void spawnEnemy();
    void resolveCollisions();

    std::vector<std::unique_ptr<Entity>> m_entities;
    std::vector<std::unique_ptr<Entity>> m_pending;
    std::mt19937 m_rng{std::random_device{}()};

    sf::Vector2f m_player;
    sf::Vector2f m_facing{1.f, 0.f};
    int m_health = 0;
    int m_score = 0;
    float m_fireTimer = 0.f;
    float m_spawnTimer = 0.f;
    float m_hurtTimer = 0.f;
    float m_elapsed = 0.f;
};

class Bullet : public Entity {
public:
    Bullet(sf::Vector2f position, sf::Vector2f direction)
        : Entity(Kind::Bullet, position, 4.f, sf::Color(255, 230, 120)),
          m_velocity(direction * kBulletSpeed) {}

    void update(float dt, const World&) override {
        m_shape.move(m_velocity * dt);
        m_life -= dt;
        const sf::Vector2f p = position();
        if (m_life <= 0.f || p.x < 0.f || p.x > kWidth || p.y < 0.f || p.y > kHeight) {
            kill();
        }
    }

private:
    sf::Vector2f m_velocity;
    float m_life = 1.2f;
};

class Enemy : public Entity {
public:
    explicit Enemy(sf::Vector2f position, float speed)
        : Entity(Kind::Enemy, position, 14.f, sf::Color(220, 70, 80)), m_speed(speed) {}

    void update(float dt, const World& world) override {
        const sf::Vector2f toPlayer = world.playerPosition() - position();
        if (toPlayer.lengthSquared() > 1.f) {
            m_shape.move(toPlayer.normalized() * m_speed * dt);
        }
    }

private:
    float m_speed;
};

void World::reset() {
    m_entities.clear();
    m_pending.clear();
    m_player = {kWidth / 2.f, kHeight / 2.f};
    m_health = 5;
    m_score = 0;
    m_fireTimer = m_spawnTimer = m_hurtTimer = m_elapsed = 0.f;
}

void World::spawnEnemy() {
    std::uniform_real_distribution<float> along(0.f, 1.f);
    std::uniform_int_distribution<int> side(0, 3);
    sf::Vector2f p;
    switch (side(m_rng)) {
        case 0:  p = {along(m_rng) * kWidth, -20.f}; break;
        case 1:  p = {along(m_rng) * kWidth, kHeight + 20.f}; break;
        case 2:  p = {-20.f, along(m_rng) * kHeight}; break;
        default: p = {kWidth + 20.f, along(m_rng) * kHeight}; break;
    }
    const float speed = std::min(80.f + m_elapsed * 1.5f, 220.f);
    spawn(std::make_unique<Enemy>(p, speed));
}

void World::resolveCollisions() {
    for (const auto& bullet : m_entities) {
        if (bullet->kind() != Entity::Kind::Bullet) continue;
        for (const auto& enemy : m_entities) {
            if (enemy->kind() != Entity::Kind::Enemy || !enemy->alive() || !bullet->alive()) continue;
            if (circlesOverlap(bullet->position(), bullet->radius(), enemy->position(), enemy->radius())) {
                bullet->kill();
                enemy->kill();
                ++m_score;
            }
        }
    }
    for (const auto& enemy : m_entities) {
        if (enemy->kind() == Entity::Kind::Enemy && enemy->alive() && m_hurtTimer <= 0.f &&
            circlesOverlap(m_player, kPlayerRadius, enemy->position(), enemy->radius())) {
            enemy->kill();
            --m_health;
            m_hurtTimer = 0.8f;
        }
    }
}

void World::update(float dt, sf::Vector2f move, sf::Vector2f aimPoint, bool firing) {
    if (gameOver()) return;
    m_elapsed += dt;
    m_hurtTimer = std::max(0.f, m_hurtTimer - dt);

    if (move.lengthSquared() > 0.f) {
        m_player += move.normalized() * kPlayerSpeed * dt;
        m_player.x = std::clamp(m_player.x, kPlayerRadius, kWidth - kPlayerRadius);
        m_player.y = std::clamp(m_player.y, kPlayerRadius, kHeight - kPlayerRadius);
    }
    const sf::Vector2f toAim = aimPoint - m_player;
    if (toAim.lengthSquared() > 1.f) {
        m_facing = toAim.normalized();
    }

    m_fireTimer -= dt;
    if (firing && m_fireTimer <= 0.f) {
        m_fireTimer = kFireDelay;
        spawn(std::make_unique<Bullet>(m_player + m_facing * 22.f, m_facing));
    }

    m_spawnTimer -= dt;
    if (m_spawnTimer <= 0.f) {
        m_spawnTimer = std::max(0.35f, 1.4f - m_elapsed * 0.02f);
        spawnEnemy();
    }

    for (const auto& entity : m_entities) {
        entity->update(dt, *this);
    }
    for (auto& entity : m_pending) {
        m_entities.push_back(std::move(entity));
    }
    m_pending.clear();

    resolveCollisions();

    m_entities.erase(std::remove_if(m_entities.begin(), m_entities.end(),
                                    [](const auto& e) { return !e->alive(); }),
                     m_entities.end());
}

void World::draw(sf::RenderTarget& target) const {
    for (const auto& entity : m_entities) {
        entity->draw(target);
    }

    const bool blink = m_hurtTimer > 0.f && static_cast<int>(m_hurtTimer * 20.f) % 2 == 0;
    sf::ConvexShape ship(3);
    ship.setPoint(0, {18.f, 0.f});
    ship.setPoint(1, {-14.f, -12.f});
    ship.setPoint(2, {-14.f, 12.f});
    ship.setPosition(m_player);
    ship.setRotation(m_facing.angle());
    ship.setFillColor(blink ? sf::Color(255, 255, 255, 90) : sf::Color(90, 210, 140));
    target.draw(ship);

    for (int i = 0; i < m_health; ++i) {
        sf::RectangleShape pip({22.f, 8.f});
        pip.setPosition({12.f + static_cast<float>(i) * 28.f, 12.f});
        pip.setFillColor(sf::Color(90, 210, 140));
        target.draw(pip);
    }
}

}  // namespace

int main() {
    sf::RenderWindow window(sf::VideoMode({960u, 640u}), "Shooter");
    window.setFramerateLimit(120);

    World world;
    int shownScore = -1;
    bool shownOver = false;

    sf::Clock clock;
    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
                if (key->code == sf::Keyboard::Key::Escape) {
                    window.close();
                } else if (key->code == sf::Keyboard::Key::Enter && world.gameOver()) {
                    world.reset();
                }
            }
        }

        const float dt = std::min(clock.restart().asSeconds(), 0.05f);

        sf::Vector2f move{0.f, 0.f};
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::A)) move.x -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::D)) move.x += 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::W)) move.y -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::S)) move.y += 1.f;

        const sf::Vector2f aim = window.mapPixelToCoords(sf::Mouse::getPosition(window));
        const bool firing = sf::Mouse::isButtonPressed(sf::Mouse::Button::Left);
        world.update(dt, move, aim, firing);

        if (world.score() != shownScore || world.gameOver() != shownOver) {
            shownScore = world.score();
            shownOver = world.gameOver();
            window.setTitle(shownOver ? "GAME OVER - score " + std::to_string(shownScore) + " - Enter to retry"
                                      : "Shooter - score " + std::to_string(shownScore));
        }

        window.clear(sf::Color(14, 16, 28));
        world.draw(window);
        if (world.gameOver()) {
            sf::RectangleShape tint({kWidth, kHeight});
            tint.setFillColor(sf::Color(160, 0, 0, 90));
            window.draw(tint);
        }
        window.display();
    }
}`,
          annotations: [
            { lines: [12, 17], text: 'The numbers that tune the game, in one place.' },
            { lines: [26, 53], text: 'The entity base class from the design section.' },
            { lines: [87, 105], text: 'A bullet moves in a straight line and kills itself when old or off screen.' },
            { lines: [107, 121], text: 'An enemy walks straight at the player.' },
            { lines: [168, 208], text: 'The whole update, in the order explained above.' },
            { lines: [210, 231], text: 'Drawing: entities first, then the ship (blinking when hurt) and the health pips.' },
            { lines: 257, text: 'Clamped delta time again, so a stall never throws objects across the arena.' },
            { lines: [269, 274], text: 'Update the title only when the score or game-over flag changes, rather than every frame.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Where to take it next',
          text: 'Each of these uses a lesson you already have: a sound on every shot and every kill (Audio); an animated spritesheet ship and enemies (Spritesheet Animation); a title screen, pause and game-over screen (Game States); a scrolling arena with a camera that follows the player (Views); a texture cache for the art (Resource Management); and a second enemy type that is data-driven, with its own speed, size and health.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'You can check it works',
          text: 'Compile with warnings turned up (`-Wall -Wextra`, or `/W4` in Visual Studio). Then play it for two minutes: stand still and see that the enemies converge, hold fire and see the steady rate, and die and press Enter to see that a restart really resets the score, health and enemies.',
        },
      ],
    },
  ],
  takeaways: [
    'Give the game a `World` that owns the entity list and the player, and let entities only read it (`const World&`).',
    'Normalise movement and aim vectors (guarding against zero), and use a cooldown timer so fire rate is independent of frame rate.',
    'Raise difficulty with a couple of numbers that grow with time and stop at a cap, and give the player a short invulnerability window after being hit.',
    'Each frame: update entities, merge the spawn queue, resolve collisions, then erase the dead.',
    'Mark things dead during collision handling and remove them once at the end, so no loop ever loses an element it is iterating over.',
  ],
  reading: [
    { title: 'Game Programming Patterns: Update Method', url: 'https://gameprogrammingpatterns.com/update-method.html', source: 'article', note: 'The pattern behind every entity update.' },
    { title: 'Vector math in SFML', url: 'https://www.sfml-dev.org/tutorials/3.0/system/vector/', source: 'other', note: 'The vector operations used for movement and aiming.' },
  ],
};
