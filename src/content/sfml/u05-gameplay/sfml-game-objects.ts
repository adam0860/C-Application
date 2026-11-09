import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-game-objects',
  title: 'Structuring Game Objects',
  summary: 'Move from one giant main() to an Entity base class, own the objects with unique_ptr, spawn and remove them safely mid-frame, and know when inheritance stops helping.',
  minutes: 22,
  objectives: [
    'Design an `Entity` base class with a virtual `update` function',
    'Store different kinds of entities in one `std::vector<std::unique_ptr<Entity>>`',
    'Explain why the base class needs a virtual destructor and why storing by value slices',
    'Spawn and remove entities during a frame without invalidating iterators',
    'Compare inheritance with data-driven composition for variations like enemy types',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'From one big main() to an Entity',
      blocks: [
        {
          type: 'p',
          text: 'Small examples keep everything in `main`: a few variables, a loop, and some `if` statements. That stops working around the third kind of thing in the game. By the time you have a player, enemies and bullets, each with its own position, speed and rules, you need to answer "what does *every* object have in common?" The answer is usually **it can update itself and draw itself**. That shared promise is an interface, and C++ expresses it with a base class and [[virtual-function|virtual functions]].',
        },
        {
          type: 'code',
          code: `class World;   // forward declaration

class Entity : public sf::Drawable {
public:
    virtual ~Entity() = default;
    virtual void update(float dt, World& world) = 0;

    bool alive() const { return m_alive; }
    void kill() { m_alive = false; }

protected:
    sf::RectangleShape m_shape;

private:
    void draw(sf::RenderTarget& target, sf::RenderStates states) const override {
        target.draw(m_shape, states);
    }
    bool m_alive = true;
};`,
          annotations: [
            { lines: 1, text: 'An entity\'s `update` needs to reach the world (to spawn bullets, for example), but `World` itself holds entities. A forward declaration breaks that circle.' },
            { lines: 3, text: 'Deriving from `sf::Drawable` means `window.draw(entity)` works for every kind of entity.' },
            { lines: 5, text: 'A **virtual destructor** is essential: entities will be deleted through a base-class pointer.' },
            { lines: 6, text: '`= 0` makes `update` pure virtual: `Entity` is abstract, and every concrete entity **must** say how it updates.' },
            { lines: 9, text: 'Entities are never erased in the middle of a frame; they are just marked dead and cleaned up afterwards (see below).' },
            { lines: 12, text: '`protected`: derived classes can change the shape directly, but outside code cannot.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does a base class need a virtual destructor?',
          text: 'You will hold entities as `Entity*`-like pointers and delete them through that type. If the destructor is not virtual, deleting a `Bullet` through an `Entity` pointer runs only `Entity`\'s destructor, skipping `Bullet`\'s. That is [[undefined-behavior]], and any resources the derived class owns are leaked. Marking the base destructor `virtual` makes C++ run the destructors of the whole chain, most-derived first. See [[virtual-destructor]].',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Why this structure helps',
          text: 'With the common interface, the main loop no longer cares what kinds of things exist. It says "update everything, then draw everything", and adding a new enemy type means writing one new class, not editing the loop in six places. This is [[polymorphism]] doing the job it is for.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does `Entity` declare `virtual ~Entity() = default;`?',
      options: [
        { text: 'So deleting a derived object through an `Entity` pointer runs the derived destructor too.', correct: true, why: 'Without it, `delete` on a base pointer is undefined behaviour and can skip the derived class\'s cleanup.' },
        { text: 'So the compiler generates faster destructors.', why: 'Virtual destructors are marginally *slower*, not faster. They exist for correctness.' },
        { text: 'So `Entity` cannot be copied.', why: 'Copying is controlled by the copy constructor and assignment, not the destructor.' },
        { text: 'So `update` can be pure virtual.', why: 'Pure virtual functions do not depend on the destructor being virtual.' },
      ],
      explanation: 'Whenever a class is meant to be used polymorphically (deleted through a base pointer), its destructor should be virtual.',
    },
    {
      kind: 'concept',
      title: 'Owning entities: unique_ptr in a vector',
      blocks: [
        {
          type: 'p',
          text: 'Different entities have different sizes, so they cannot sit in one `std::vector<Entity>`: the vector would have room for an `Entity` only. They must live elsewhere, and the vector stores **pointers** to them. Using [[unique-ptr]] makes ownership clear: the container owns each entity, and deleting an entry deletes the object correctly.',
        },
        {
          type: 'code',
          code: `std::vector<std::unique_ptr<Entity>> entities;

entities.push_back(std::make_unique<Player>());
entities.push_back(std::make_unique<Bullet>(sf::Vector2f{100.f, 500.f}));

for (const std::unique_ptr<Entity>& e : entities) {
    window.draw(*e);
}`,
          annotations: [
            { lines: 1, text: 'The vector owns every entity. When it is destroyed, all the entities are destroyed with it, automatically.' },
            { lines: 3, text: '`make_unique<Player>()` creates a `Player` on the heap and returns a pointer to it, which converts to `unique_ptr<Entity>`.' },
            { lines: 6, text: 'Take the elements by reference, since `unique_ptr` cannot be copied. `*e` is the entity itself.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Do not store polymorphic objects by value',
          text: 'In `std::vector<Entity>`, pushing a `Player` copies only its `Entity` part into the vector and discards the rest. That is **object slicing**: the vector now holds plain entities, and `update` calls no longer reach the derived versions. Since `Entity` is abstract in this design, pushing into that vector will not even compile. Always store polymorphic objects by pointer. See [[object-slicing]].',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Raw pointers are fine for looking, not owning',
          text: 'It is fine for one entity to hold a plain `Entity*` to a target it chases, as long as it does not delete it and checks that the target is still alive each frame. The vector of `unique_ptr`s owns; everything else only observes.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'A `std::vector<Entity>` is a good way to store a `Player` and several `Bullet`s so that each one\'s own `update` function is called.',
      answer: false,
      explanation: 'A vector of base objects can only hold base objects, so derived parts are sliced off and virtual calls reach only `Entity`. Store `std::unique_ptr<Entity>` so each object keeps its real type.',
    },
    {
      kind: 'concept',
      title: 'Spawning and removing entities safely',
      blocks: [
        {
          type: 'p',
          text: 'Entities need to create others (the player fires a bullet) and disappear (a bullet leaves the screen). Both change the vector while you are looping over it, which is dangerous. The fix is to **never change the container during the update loop**. Collect new entities in a *pending* list, mark dead ones with a flag, and apply both changes after the loop:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <algorithm>
#include <memory>
#include <optional>
#include <vector>

class World;

class Entity : public sf::Drawable {
public:
    virtual ~Entity() = default;
    virtual void update(float dt, World& world) = 0;
    bool alive() const { return m_alive; }
    void kill() { m_alive = false; }

protected:
    sf::RectangleShape m_shape;

private:
    void draw(sf::RenderTarget& target, sf::RenderStates states) const override {
        target.draw(m_shape, states);
    }
    bool m_alive = true;
};

class World {
public:
    void spawn(std::unique_ptr<Entity> entity) {
        m_pending.push_back(std::move(entity));
    }

    void update(float dt) {
        for (const auto& entity : m_entities) {
            entity->update(dt, *this);
        }
        for (auto& entity : m_pending) {
            m_entities.push_back(std::move(entity));
        }
        m_pending.clear();

        m_entities.erase(
            std::remove_if(m_entities.begin(), m_entities.end(),
                           [](const auto& e) { return !e->alive(); }),
            m_entities.end());
    }

    void draw(sf::RenderTarget& target) const {
        for (const auto& entity : m_entities) {
            target.draw(*entity);
        }
    }

private:
    std::vector<std::unique_ptr<Entity>> m_entities;
    std::vector<std::unique_ptr<Entity>> m_pending;
};

class Bullet : public Entity {
public:
    explicit Bullet(sf::Vector2f position) {
        m_shape.setSize({4.f, 14.f});
        m_shape.setFillColor(sf::Color(255, 220, 90));
        m_shape.setPosition(position);
    }
    void update(float dt, World&) override {
        m_shape.move({0.f, -500.f * dt});
        if (m_shape.getPosition().y < -20.f) {
            kill();
        }
    }
};

class Player : public Entity {
public:
    Player() {
        m_shape.setSize({40.f, 20.f});
        m_shape.setFillColor(sf::Color(80, 200, 120));
        m_shape.setPosition({380.f, 540.f});
    }
    void update(float dt, World& world) override {
        float direction = 0.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Left))  direction -= 1.f;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Right)) direction += 1.f;
        m_shape.move({direction * 300.f * dt, 0.f});

        m_cooldown -= dt;
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::Space) && m_cooldown <= 0.f) {
            m_cooldown = 0.2f;
            world.spawn(std::make_unique<Bullet>(m_shape.getPosition() + sf::Vector2f(18.f, -10.f)));
        }
    }

private:
    float m_cooldown = 0.f;
};

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Entities");
    window.setFramerateLimit(60);

    World world;
    world.spawn(std::make_unique<Player>());

    sf::Clock clock;
    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }
        world.update(clock.restart().asSeconds());

        window.clear(sf::Color(15, 15, 30));
        world.draw(window);
        window.display();
    }
}`,
          annotations: [
            { lines: [28, 30], text: 'Spawning only *queues* the entity. Nothing is added to the live vector while it is being looped over.' },
            { lines: [33, 35], text: 'Update everything. Entities may call `spawn` or `kill` freely, because the vector is not changing.' },
            { lines: [36, 39], text: 'Now it is safe to move the pending entities in. Moving a `unique_ptr` transfers ownership.' },
            { lines: [41, 44], text: 'The **erase-remove idiom**: `remove_if` shuffles live entities to the front, and `erase` chops off the dead tail. Erased `unique_ptr`s delete their entities.' },
            { lines: [67, 69], text: 'A bullet kills itself by setting a flag. It is not deleted mid-update; the world cleans up afterwards.' },
            { lines: [86, 88], text: 'The cooldown stops a held Space bar from firing 60 bullets a second.' },
            { lines: 89, text: 'The player asks the world to spawn a bullet. It never touches the entity list directly.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just erase or push_back while looping?',
          text: 'A `std::vector` may move all its elements to a new block when it grows, and `erase` shifts everything after the removed one. Either way, the iterators and references a range-`for` is holding go stale, and using them is undefined behaviour: crashes, skipped entities, or entities updated twice. Deferring all changes until the loop finishes sidesteps the whole problem. See [[iterator-invalidation]].',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Kill flag instead of erase',
          text: 'With the flag, an entity can kill itself in `update` without invalidating anything, and other entities can still safely read it for the rest of the frame (to check "was that enemy hit?") without chasing a deleted object.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the erase-remove idiom that deletes every dead entity.',
      template: 'm_entities.erase(\n    std::remove_if(m_entities.begin(), m_entities.end(),\n                   [](const auto& e) { return !e->alive(); }),\n    m_entities.___());',
      blanks: [{ answers: ['end'] }],
      wordBank: ['end', 'begin', 'clear', 'size', 'back'],
      explanation: '`remove_if` returns the start of the "dead" tail, and `erase(first, last)` removes from there to `m_entities.end()`.',
    },
    {
      kind: 'bug',
      prompt: 'This update loop sometimes crashes or skips entities when the player fires. Tap the line responsible.',
      code: `for (auto& e : m_entities) {
    e->update(dt);
    if (e->wantsToShoot()) {
        m_entities.push_back(std::make_unique<Bullet>(e->position()));
    }
}`,
      bugLines: [4],
      explanation: '`push_back` can reallocate the vector while the range-`for` is still iterating over it, invalidating `e` and the loop\'s iterators. Queue the new entity in a pending list and add it after the loop.',
    },
    {
      kind: 'order',
      prompt: 'Put the steps of `World::update` in the right order.',
      lines: [
        'Call update on every entity',
        'Move pending entities into the main list',
        'Remove entities that are no longer alive',
        'Draw the world (in the draw phase)',
      ],
      linesAreCode: false,
      explanation: 'Entities update while the container is stable. Only afterwards are new ones added and dead ones removed, and drawing comes in the later draw phase.',
    },
    {
      kind: 'concept',
      title: 'When inheritance stops helping',
      blocks: [
        {
          type: 'p',
          text: 'Inheritance fits "player", "bullet" and "pickup", which behave differently. It fits badly for **variations of one thing**. If the only difference between a slow grunt, a fast scout and a tough brute is a few numbers, writing a subclass for each (`Grunt`, `Scout`, `Brute`) is a lot of code for data. Worse, hierarchies grow awkward fast: what is a *flying brute that shoots*?',
        },
        {
          type: 'compare',
          left: {
            title: 'A class per variation',
            tone: 'bad',
            code: 'class FastEnemy : public Enemy { ... };\nclass TankEnemy : public Enemy { ... };\nclass FastTankEnemy : public Enemy { ... };',
            text: 'Every new mix needs a new class, and the hierarchy becomes a tangle.',
          },
          right: {
            title: 'One class, driven by data',
            tone: 'good',
            code: 'struct EnemyType { float speed; int health; sf::Color colour; };\nconst EnemyType tank{60.f, 10, sf::Color::Red};\nEnemy e(tank);',
            text: 'New enemy types are just new rows of numbers, which can even be loaded from a file.',
          },
        },
        {
          type: 'p',
          text: 'The rule of thumb: use **inheritance** when objects need different *behaviour* (different code), and use **data** when they differ only in *values*. Many engines go further and split behaviour into small reusable parts attached to an entity, such as "moves", "takes damage" and "drops loot". That style is called *composition*, and an Entity-Component-System is the strictest form of it. You do not need it for a small game, but knowing it exists helps when the class tree starts to hurt.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer composition when hierarchies deepen?',
          text: 'Inheritance fixes an object\'s abilities at the moment you pick its class, and shares everything with all the descendants. When a new idea cuts across the tree ("every enemy and the player can burn"), you have to edit the base class or duplicate code. Composition lets you attach the ability to whatever needs it, because behaviour is something an object *has*, not something it *is*.',
        },
      ],
    },
  ],
  takeaways: [
    'Give every game object a common `Entity` interface (`update`, draw, alive) so the main loop never needs to know the concrete types.',
    'A polymorphic base class needs a virtual destructor, and polymorphic objects must be stored by pointer, never by value (slicing).',
    'Own entities with `std::vector<std::unique_ptr<Entity>>`; let other code observe them without owning.',
    'Never add to or erase from the container while looping over it: queue spawns, flag deaths, and apply both after the loop (erase-remove).',
    'Use inheritance for different behaviour and plain data for different values; reach for composition when hierarchies get awkward.',
  ],
  reading: [
    { title: 'Game Programming Patterns: Update Method', url: 'https://gameprogrammingpatterns.com/update-method.html', source: 'article', note: 'The pattern behind update(dt), with the trade-offs.' },
    { title: 'Game Programming Patterns: Component', url: 'https://gameprogrammingpatterns.com/component.html', source: 'article', note: 'Why and how to split behaviour into components.' },
  ],
};
