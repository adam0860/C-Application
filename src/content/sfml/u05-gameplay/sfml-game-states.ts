import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-game-states',
  title: 'Game States and Scenes',
  summary: 'Replace tangles of boolean flags with a state machine, then build a state stack so pause and menu screens can sit on top of a running game.',
  minutes: 22,
  objectives: [
    'Explain why separate `inMenu` / `paused` / `gameOver` booleans become unmanageable',
    'Model screens with an `enum class` and a `switch` for small games',
    'Write a `State` interface and a `StateStack` that routes events, updates and drawing',
    'Make an overlay state (pause) that draws on top of the state beneath it',
    'Queue state changes so a state is never destroyed while its own code is running',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Too many booleans, and the simple fix',
      blocks: [
        {
          type: 'p',
          text: 'Every game has screens: a title menu, the game itself, a pause screen, a "game over" screen. The first attempt is usually a flag for each: `inMenu`, `paused`, `gameOver`. Then someone presses Escape on the menu and the game pauses a game that has not started, or the player dies while paused. With three flags there are eight combinations and most of them are nonsense. A **state machine** replaces the flags with a single variable that can hold only one meaningful value at a time.',
        },
        {
          type: 'code',
          code: `enum class Screen { Menu, Playing, Paused, GameOver };
Screen screen = Screen::Menu;

// In the event loop:
switch (screen) {
    case Screen::Menu:     handleMenuEvent(event);     break;
    case Screen::Playing:  handlePlayingEvent(event);  break;
    case Screen::Paused:   handlePausedEvent(event);   break;
    case Screen::GameOver: handleGameOverEvent(event); break;
}

// Changing screen is one assignment:
screen = Screen::Paused;`,
          annotations: [
            { lines: 1, text: 'An `enum class` lists every screen. The game is in **exactly one** of them, so contradictory combinations cannot exist.' },
            { lines: 5, text: 'Repeat a `switch` like this in the update and draw code too. Each branch only has to think about its own screen.' },
            { lines: 13, text: 'A transition is a single assignment, and every place that cares about the screen reads the same variable.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is one enum safer than several booleans?',
          text: 'N booleans have 2^N combinations, and you have to prove by hand that each one is either impossible or handled. An enum with N values has exactly N states, so every state is a case you can see. Better, if you switch on an `enum class` without a `default`, the compiler can warn when you forget a case (`-Wswitch`), which makes adding a new screen much safer than adding a new flag.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Good enough for small games',
          text: 'An enum and a `switch` is a fine design for a Pong-sized game. It starts to hurt when each screen has its own data and logic and the switch statements become long, which is the signal to turn each screen into an object.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A game has booleans `inMenu`, `paused` and `gameOver`. Why is a single `enum class Screen` a better design?',
      options: [
        { text: 'Only one value can be active, so impossible combinations such as "in menu and game over" cannot happen.', correct: true, why: 'The enum limits the game to exactly the listed screens, and the compiler can warn about unhandled cases.' },
        { text: 'An enum runs faster than three booleans.', why: 'Speed is not the point, and the difference is negligible.' },
        { text: 'Booleans cannot be used in an `if`.', why: 'They can; the problem is the number of combinations, not the syntax.' },
        { text: 'An enum automatically saves the game.', why: 'An enum only names the states. Saving is separate work.' },
      ],
      explanation: 'The benefit is correctness: the set of valid situations is exactly the set of enum values, nothing more.',
    },
    {
      kind: 'concept',
      title: 'Each screen becomes an object',
      blocks: [
        {
          type: 'p',
          text: 'When the `switch` blocks grow, move each screen\'s behaviour into its own class. This is exactly the interface idea from the game objects lesson, applied to whole screens: every state can handle events, update and draw. Code that runs the game then talks only to the base class.',
        },
        {
          type: 'code',
          code: `class State {
public:
    explicit State(StateStack& stack) : m_stack(stack) {}
    virtual ~State() = default;

    virtual void handleEvent(const sf::Event& event) = 0;
    virtual void update(float dt) = 0;
    virtual void draw(sf::RenderTarget& target) const = 0;

    // True for overlays (pause, dialogs) that sit on top of another state.
    virtual bool isOverlay() const { return false; }

protected:
    StateStack& m_stack;     // lets a state ask for transitions
};`,
          annotations: [
            { lines: 3, text: 'Each state keeps a reference to the stack that owns it, so it can ask for a screen change, such as "push the pause screen".' },
            { lines: 4, text: 'Virtual destructor, again, because states are deleted through a base pointer.' },
            { lines: [6, 8], text: 'The three things every screen can do. They are pure virtual, so each state **must** implement them.' },
            { lines: 11, text: 'A defaulted virtual function: most states are full screens, and only overlays override this.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'What belongs in a state?',
          text: 'Put in the state whatever only that screen needs: the menu\'s selected button, the game\'s entities, the pause screen\'s dim overlay. Put shared things (the window, the resource caches, the score and settings) in one shared context object that is passed to each state, not in globals.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'The state stack',
      blocks: [
        {
          type: 'p',
          text: 'A single "current state" cannot do pause properly. When the player pauses, the game must freeze but stay visible behind the pause menu, and resuming must bring back the same game. A **stack** of states fits: the top state gets events and updates, and drawing starts from the lowest state that needs to be seen. Pause is pushed on top of the game, and popping it reveals the untouched game underneath.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <functional>
#include <memory>
#include <optional>
#include <vector>

class StateStack;

class State {
public:
    explicit State(StateStack& stack) : m_stack(stack) {}
    virtual ~State() = default;
    virtual void handleEvent(const sf::Event& event) = 0;
    virtual void update(float dt) = 0;
    virtual void draw(sf::RenderTarget& target) const = 0;
    virtual bool isOverlay() const { return false; }

protected:
    StateStack& m_stack;
};

class StateStack {
public:
    using Factory = std::function<std::unique_ptr<State>()>;

    template <typename T>
    void push() {
        m_pending.push_back({Action::Push, [this] { return std::make_unique<T>(*this); }});
    }
    void pop()   { m_pending.push_back({Action::Pop, {}}); }
    void clear() { m_pending.push_back({Action::Clear, {}}); }
    bool empty() const { return m_states.empty(); }

    void handleEvent(const sf::Event& event) {
        if (!m_states.empty()) {
            m_states.back()->handleEvent(event);
        }
        applyPending();
    }

    void update(float dt) {
        if (!m_states.empty()) {
            m_states.back()->update(dt);
        }
        applyPending();
    }

    void draw(sf::RenderTarget& target) const {
        std::size_t first = m_states.size();
        while (first > 0) {
            --first;
            if (!m_states[first]->isOverlay()) {
                break;
            }
        }
        for (std::size_t i = first; i < m_states.size(); ++i) {
            m_states[i]->draw(target);
        }
    }

    void applyPending() {
        for (Change& change : m_pending) {
            switch (change.action) {
                case Action::Push:  m_states.push_back(change.make()); break;
                case Action::Pop:   if (!m_states.empty()) m_states.pop_back(); break;
                case Action::Clear: m_states.clear(); break;
            }
        }
        m_pending.clear();
    }

private:
    enum class Action { Push, Pop, Clear };
    struct Change {
        Action  action;
        Factory make;
    };

    std::vector<std::unique_ptr<State>> m_states;
    std::vector<Change> m_pending;
};

class PauseState : public State {
public:
    using State::State;
    void handleEvent(const sf::Event& event) override {
        if (const auto* key = event.getIf<sf::Event::KeyPressed>()) {
            if (key->code == sf::Keyboard::Key::Escape) {
                m_stack.pop();                       // resume
            } else if (key->code == sf::Keyboard::Key::Q) {
                m_stack.pop();                       // leave pause...
                m_stack.pop();                       // ...and the game
            }
        }
    }
    void update(float) override {}
    void draw(sf::RenderTarget& target) const override {
        sf::RectangleShape dim(sf::Vector2f(target.getSize()));
        dim.setFillColor(sf::Color(0, 0, 0, 150));
        target.draw(dim);
        for (float x : {290.f, 330.f}) {
            sf::RectangleShape bar({20.f, 80.f});
            bar.setPosition({x, 200.f});
            target.draw(bar);
        }
    }
    bool isOverlay() const override { return true; }
};

class GameState : public State {
public:
    using State::State;
    void handleEvent(const sf::Event& event) override {
        if (const auto* key = event.getIf<sf::Event::KeyPressed>()) {
            if (key->code == sf::Keyboard::Key::Escape) {
                m_stack.push<PauseState>();
            }
        }
    }
    void update(float dt) override {
        m_position += m_velocity * dt;
        if (m_position.x < 20.f || m_position.x > 620.f) m_velocity.x = -m_velocity.x;
        if (m_position.y < 20.f || m_position.y > 460.f) m_velocity.y = -m_velocity.y;
    }
    void draw(sf::RenderTarget& target) const override {
        sf::CircleShape ball(20.f);
        ball.setOrigin({20.f, 20.f});
        ball.setPosition(m_position);
        ball.setFillColor(sf::Color(255, 190, 60));
        target.draw(ball);
    }

private:
    sf::Vector2f m_position{100.f, 100.f};
    sf::Vector2f m_velocity{220.f, 160.f};
};

class MenuState : public State {
public:
    using State::State;
    void handleEvent(const sf::Event& event) override {
        if (const auto* key = event.getIf<sf::Event::KeyPressed>()) {
            if (key->code == sf::Keyboard::Key::Enter) {
                m_stack.push<GameState>();
            } else if (key->code == sf::Keyboard::Key::Escape) {
                m_stack.pop();                       // empty stack ends the program
            }
        }
    }
    void update(float) override {}
    void draw(sf::RenderTarget& target) const override {
        sf::RectangleShape button({200.f, 60.f});
        button.setOrigin({100.f, 30.f});
        button.setPosition(sf::Vector2f(target.getSize()) / 2.f);
        button.setFillColor(sf::Color(70, 130, 220));
        target.draw(button);
    }
};

int main() {
    sf::RenderWindow window(sf::VideoMode({640u, 480u}), "Enter: play   Esc: pause / quit");
    window.setFramerateLimit(60);

    StateStack stack;
    stack.push<MenuState>();
    stack.applyPending();

    sf::Clock clock;
    while (window.isOpen() && !stack.empty()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else {
                stack.handleEvent(*event);
            }
        }
        stack.update(clock.restart().asSeconds());

        window.clear(sf::Color(15, 15, 25));
        stack.draw(window);
        window.display();
    }
}`,
          annotations: [
            { lines: [26, 29], text: 'Pushing does not build the state now. It queues a **factory** (a small function that makes it), so the new state does not appear until it is safe.' },
            { lines: [30, 31], text: 'Pop and clear are queued too, for the same reason.' },
            { lines: [34, 39], text: 'Only the **top** state receives events. A paused game does not see the keyboard.' },
            { lines: [49, 58], text: 'Start at the top and walk down while states are overlays; stop at the first full-screen state. Then draw from there upward, bottom first. That is what shows the game behind the pause screen.' },
            { lines: [61, 70], text: 'Apply the queued changes. This is called **after** a state\'s function has returned, never during one.' },
            { lines: 89, text: 'Pause asks to pop itself. It is still running its own `handleEvent` at this point, which is why the request is only queued.' },
            { lines: [98, 100], text: 'The dim rectangle covers the whole window, drawn over the game that the stack draws first.' },
            { lines: 107, text: 'Marking pause as an overlay is what makes the stack draw the game underneath it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why queue the changes instead of doing them straight away?',
          text: 'Suppose `PauseState::handleEvent` called `m_states.pop_back()` directly. That destroys the very `PauseState` object whose member function is still executing: after that call returns into the dead object, the next use of `this` is undefined behaviour. Pushing during an update has the same problem as `push_back` during a loop, since it can invalidate the container being used. Queueing the change and applying it after the state\'s function has returned avoids both, and it is the same trick as the spawn queue in the game objects lesson.',
        },
        {
          type: 'table',
          caption: 'Who does what in a stack of Menu, Game and Pause (top is Pause).',
          headers: ['State', 'Gets events', 'Updates', 'Drawn'],
          rows: [
            ['PauseState (top, overlay)', 'Yes', 'Yes', 'Yes, last (on top)'],
            ['GameState', 'No', 'No (frozen)', 'Yes, because the overlay is drawn over it'],
            ['MenuState (bottom)', 'No', 'No', 'No, since the game fully covers it'],
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'It is safe for a state\'s `handleEvent` to remove itself by calling `m_states.pop_back()` directly on the stack\'s vector.',
      answer: false,
      explanation: 'That deletes the object whose member function is still running, so the code after the call touches a destroyed `this`. Queue the pop and apply it after the function has returned.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the line that handles a queued `Pop` change.',
      template: 'case Action::Pop:\n    if (!m_states.empty()) m_states.___();\n    break;',
      blanks: [{ answers: ['pop_back'] }],
      wordBank: ['pop_back', 'pop_front', 'clear', 'back', 'erase'],
      explanation: 'The top of the stack is the **back** of the vector, so `pop_back()` removes it (after checking the vector is not empty).',
    },
    {
      kind: 'concept',
      title: 'Sharing data and passing it between states',
      blocks: [
        {
          type: 'p',
          text: 'Real states need things in common: the window, the resource caches, the player\'s settings and the high score. Pass them in through one **context** object that every state receives, rather than reaching for globals. When one state needs to hand a result to the next (the score to a "game over" screen), capture it in the factory that builds the new state:',
        },
        {
          type: 'code',
          code: `struct Context {
    sf::RenderWindow& window;
    Resources&        resources;
    int               highScore = 0;
};

// Inside GameState, when the player dies:
m_stack.push([this] {
    return std::make_unique<GameOverState>(m_stack, m_context, m_score);
});`,
          annotations: [
            { lines: [1, 5], text: 'Shared services and settings in one place. Each state gets a reference to the same one.' },
            { lines: [8, 10], text: 'A factory that **captures** the score, so it is carried into the new state. Add a `push` overload that takes such a factory, or use the template version when no data is needed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a context object instead of globals?',
          text: 'A context makes dependencies explicit: you can see what a state uses by looking at its constructor and at `m_context`. It also lets you create two contexts (for testing, or for a second window) and keeps start-up and shut-down order under your control, which globals do not.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Lifetime check',
          text: 'The captured `this` in that factory is safe only because the factory runs right after the current state\'s function returns, while the stack still owns that state. If a factory could run later, after the state was destroyed, it would hold a dangling pointer. Capture **values** (like the score) whenever you can.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The pause screen appears over a plain dark background instead of over the frozen game. Tap the line that causes it.',
      code: `void StateStack::draw(sf::RenderTarget& target) const {
    if (!m_states.empty()) {
        m_states.back()->draw(target);
    }
}`,
      bugLines: [3],
      explanation: 'Only the top state is drawn, so the game underneath is never drawn when the pause overlay is on top. Draw from the lowest visible state upward, skipping below any state that is not an overlay.',
    },
    {
      kind: 'order',
      prompt: 'Put the sequence for pausing a running game in order.',
      lines: [
        'The game state receives the Escape key',
        'It queues a push of the pause state',
        'The stack applies the queued push after the handler returns',
        'The stack draws the game, then the pause overlay on top',
        'Only the pause state gets events and updates; the game is frozen',
      ],
      linesAreCode: false,
      explanation: 'The change is queued by the state, applied by the stack once the handler is done, and from the next frame the overlay is on top: it receives the input while the game below stays visible but still.',
    },
  ],
  takeaways: [
    'Several booleans create impossible combinations; a single `enum class` (or state objects) allows only the screens you list.',
    'A `State` interface with `handleEvent`, `update` and `draw` lets the main loop run any screen without knowing which.',
    'A state **stack** runs the top state and draws from the lowest non-overlay state up, so pause and dialogs can sit above a frozen game.',
    'Queue pushes, pops and clears, and apply them after the current state function returns, so no state is destroyed while its code is running.',
    'Share the window, resources and score through a context object rather than globals, and keep screen-specific data in the state.',
  ],
  reading: [
    { title: 'Game Programming Patterns: State', url: 'https://gameprogrammingpatterns.com/state.html', source: 'article', note: 'A thorough treatment of state machines and their pitfalls.' },
    { title: 'Handling events', url: 'https://www.sfml-dev.org/tutorials/3.0/window/events/', source: 'other', note: 'The event loop that feeds the current state.' },
  ],
};
