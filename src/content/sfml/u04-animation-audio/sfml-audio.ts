import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-audio',
  title: 'Sound Effects and Music',
  summary: 'Play short effects and streamed music, keep buffers alive, let sounds overlap with a small pool, add variety, and place sounds left and right.',
  minutes: 18,
  objectives: [
    'Choose between `sf::Sound` with a `sf::SoundBuffer` and `sf::Music`',
    'Keep a sound buffer alive for as long as its sounds play',
    'Build a small sound pool so effects can overlap',
    'Vary pitch and volume so repeated effects do not sound robotic',
    'Place a sound in 2D space and handle missing audio files',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Two ways to play audio: Sound and Music',
      blocks: [
        {
          type: 'p',
          text: 'SFML splits audio into two kinds, because they have opposite needs. A gunshot is tiny and must start the instant you press the button, so SFML decodes it fully into memory: that is an `sf::SoundBuffer` (the data) played by an `sf::Sound` (the player). A five-minute music track is huge, and decoding it all up front would stall the game and eat memory, so `sf::Music` **streams** it from the file a little at a time.',
        },
        {
          type: 'code',
          code: `sf::SoundBuffer jumpBuffer("assets/jump.wav");   // throws if missing
sf::Sound jump(jumpBuffer);
jump.play();

sf::Music theme("assets/theme.ogg");             // streams from disk
theme.setLooping(true);
theme.setVolume(40.f);
theme.play();`,
          annotations: [
            { lines: 1, text: 'The buffer holds the whole sound as decoded samples. SFML reads WAV, OGG/Vorbis and FLAC, and can decode MP3.' },
            { lines: 2, text: 'A `Sound` is a lightweight *player* that points at a buffer. Many sounds can share one buffer.' },
            { lines: 5, text: '`sf::Music` opens the file but reads it only as it plays, which is why it uses a stream and not a buffer.' },
            { lines: 7, text: 'Volume runs from 0 to 100 (the default). You can only turn a sound **down** from its original loudness.' },
          ],
        },
        {
          type: 'table',
          headers: ['Question', '`sf::Sound` + `sf::SoundBuffer`', '`sf::Music`'],
          rows: [
            ['Best for', 'Short effects: shots, steps, UI clicks', 'Long tracks: level music, ambience'],
            ['Memory', 'Whole sound stays in RAM', 'Only a small window of the file'],
            ['Start delay', 'Instant', 'Tiny, as the stream opens'],
            ['Copyable', 'Yes (a copy shares the same buffer)', 'No, but it can be moved'],
            ['Load with', '`SoundBuffer(path)` or `loadFromFile`', '`Music(path)` or `openFromFile`'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just load the music into a buffer too?',
          text: 'A buffer stores raw uncompressed samples. A five-minute stereo track at 44.1 kHz is 44,100 × 2 channels × 2 bytes × 300 seconds, about **53 MB** of RAM, and the whole thing must be decoded before the first note. Streaming keeps memory tiny and starts quickly, and reading from the file as you go costs only a little CPU. Buffers win for short effects because their data is already ready to play.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which choice fits best: an explosion that lasts one second, and a menu theme that lasts four minutes?',
      options: [
        { text: 'Explosion: `sf::Sound` with a `SoundBuffer`. Theme: `sf::Music`.', correct: true, why: 'Short effects want instant playback from memory; long tracks are better streamed.' },
        { text: 'Both as `sf::Music`, to save code.', why: 'Streaming adds a small start-up delay, and you would reopen the file for every explosion.' },
        { text: 'Both as `sf::Sound`, to keep it simple.', why: 'The four-minute theme would be fully decoded into memory, tens of megabytes, and delay loading.' },
        { text: 'Explosion: `sf::Music`. Theme: `sf::Sound`.', why: 'That is the wrong way round: a quick effect should not stream, and a long track should not sit in RAM.' },
      ],
      explanation: 'The deciding factor is length. Small and frequent means buffer; large and played through once means stream.',
    },
    {
      kind: 'concept',
      title: 'One Sound is one voice: lifetime and overlap',
      blocks: [
        {
          type: 'p',
          text: 'Two rules cause most audio bugs. First, an `sf::Sound` keeps only a **pointer** to its buffer, so the buffer must outlive every sound that uses it. Second, one `sf::Sound` object is **one voice**: if you call `play()` while it is already playing it simply restarts, so rapid-fire machine-gun shots cut each other off instead of overlapping. To overlap, create a new `Sound` for each shot, and keep each alive until it finishes. A small *pool* does both:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Audio.hpp>
#include <SFML/Graphics.hpp>
#include <cmath>
#include <cstdint>
#include <list>
#include <optional>
#include <random>
#include <vector>

class SoundPlayer {
public:
    explicit SoundPlayer(const sf::SoundBuffer& buffer) : m_buffer(buffer) {}

    void play(float pitch = 1.f, float volume = 100.f) {
        m_voices.remove_if([](const sf::Sound& s) {
            return s.getStatus() == sf::Sound::Status::Stopped;
        });
        if (m_voices.size() >= kMaxVoices) {
            return;
        }
        sf::Sound& voice = m_voices.emplace_back(m_buffer);
        voice.setPitch(pitch);
        voice.setVolume(volume);
        voice.play();
    }

private:
    static constexpr std::size_t kMaxVoices = 24;
    const sf::SoundBuffer& m_buffer;
    std::list<sf::Sound> m_voices;
};

int main() {
    // Synthesise a 0.2 s beep so the example needs no audio files.
    constexpr unsigned sampleRate = 44100;
    std::vector<std::int16_t> samples(sampleRate / 5);
    for (std::size_t i = 0; i < samples.size(); ++i) {
        const float t = static_cast<float>(i) / static_cast<float>(sampleRate);
        const float fade = 1.f - static_cast<float>(i) / static_cast<float>(samples.size());
        samples[i] = static_cast<std::int16_t>(12000.f * fade * std::sin(6.2831853f * 440.f * t));
    }
    const sf::SoundBuffer beep(samples.data(), samples.size(), 1, sampleRate,
                               {sf::SoundChannel::Mono});

    SoundPlayer player(beep);
    std::mt19937 rng{std::random_device{}()};
    std::uniform_real_distribution<float> pitch(0.9f, 1.1f);

    sf::RenderWindow window(sf::VideoMode({400u, 200u}), "Press Space");
    window.setFramerateLimit(60);
    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            } else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
                if (key->code == sf::Keyboard::Key::Space) {
                    player.play(pitch(rng));
                }
            }
        }
        window.clear(sf::Color(25, 25, 40));
        window.display();
    }
}`,
          annotations: [
            { lines: [15, 17], text: 'Throw away voices that have finished. `std::list` is used because it never moves its elements, so a playing `sf::Sound` is never copied or relocated.' },
            { lines: [18, 20], text: 'Cap the number of voices. Too many simultaneous sounds is a performance problem, and past a point no one can hear the difference.' },
            { lines: 21, text: 'A **new** `sf::Sound` for every call. Because it is stored in the list, it stays alive until it has finished playing.' },
            { lines: 29, text: 'The pool holds a **reference** to the buffer. The caller owns the buffer and must keep it alive.' },
            { lines: [36, 40], text: 'A sine wave with a fade-out, written straight into memory as 16-bit samples. A real game would load a `.wav` or `.ogg` here.' },
            { lines: [42, 43], text: 'A mono buffer has one channel, which is what later lets SFML position it in space.' },
            { lines: 57, text: 'Each press creates a new voice, with a slightly different pitch, so repeated presses overlap and do not sound identical.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why did SFML 3 stop the buffer being a temporary?',
          text: 'In SFML 3 the `sf::Sound` constructor that takes a **temporary** buffer is deleted, so `sf::Sound s(sf::SoundBuffer("a.wav"))` will not compile. That line used to compile and play garbage, because the temporary died at the semicolon while the sound still pointed at it. The compiler now rejects the whole class of mistake. It cannot catch a buffer that is a local variable in a function that returns, so you still own that discipline.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Audio runs on its own thread',
          text: 'Sounds and music play in a separate thread inside SFML. That means a sound keeps playing while your game loop is busy, and it also means destroying a `sf::Sound` stops it at once, even mid-note. A function that creates a local `sf::Sound`, calls `play()` and returns will produce silence or a click.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Calling `play()` on an `sf::Sound` that is already playing starts a second, overlapping copy of the sound.',
      answer: false,
      explanation: 'One `sf::Sound` is one voice, so `play()` on a playing sound restarts it. To overlap, make more `sf::Sound` objects that share the same `sf::SoundBuffer`, as the pool does.',
    },
    {
      kind: 'concept',
      title: 'Making it feel good: pitch, volume and mixing',
      blocks: [
        {
          type: 'p',
          text: 'Playing the exact same footstep sample a hundred times sounds mechanical. Games hide this with tiny random variations. `setPitch(1.f)` is normal speed, above 1 is higher and faster, below 1 is lower and slower; `setVolume` takes 0 to 100. A nudge of five to ten per cent either way is enough that the ear stops noticing the repetition.',
        },
        {
          type: 'code',
          code: `struct AudioSettings {
    float master = 100.f;
    float music  = 60.f;
    float sfx    = 100.f;
};

float effective(float master, float category) {
    return master / 100.f * category;   // 0..100
}

void applyMusic(sf::Music& m, const AudioSettings& a) {
    m.setVolume(effective(a.master, a.music));
}

// An effect, slightly different each time:
voice.setPitch(0.95f + 0.1f * unitRandom());
voice.setVolume(effective(a.master, a.sfx) * 0.8f);`,
          annotations: [
            { lines: [1, 5], text: 'Keep separate volume levels for music and effects. Players nearly always want to turn the music down but keep the effects.' },
            { lines: [7, 9], text: 'Multiply the master level into each category, so one slider scales everything.' },
            { lines: 16, text: 'About 5% pitch variation around 1.0. `unitRandom()` stands for any function returning a number from 0 to 1.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Quieter than you think',
          text: 'You can only lower a sound below its recorded level, never raise it above it. So record or export effects loud, and mix them down with `setVolume`. If a sound is too quiet even at 100, the fix is in the audio file, not the code.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'A global master volume',
          text: '`sf::Listener::setGlobalVolume(float)` scales every sound in the program at once, which is handy for a mute key or a pause menu that dims the whole mix.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code that makes a music track repeat and then starts it.',
      template: 'sf::Music theme("assets/theme.ogg");\ntheme.___(true);\ntheme.___();',
      blanks: [{ answers: ['setLooping'] }, { answers: ['play'] }],
      wordBank: ['setLooping', 'play', 'stop', 'setPitch', 'openFromFile'],
      explanation: '`setLooping(true)` repeats until you call `stop()`, and `play()` starts the stream. Looping is set before or after play; either works.',
    },
    {
      kind: 'bug',
      prompt: 'The explosion sound never plays (or only clicks). Tap the line that causes it.',
      code: `void playExplosion(const sf::SoundBuffer& buffer) {
    sf::Sound sound(buffer);
    sound.play();
}`,
      bugLines: [2],
      explanation: '`sound` is a local variable, so it is destroyed when the function returns, and a destroyed `sf::Sound` stops immediately. Keep the sound somewhere that outlives the function, such as a pool owned by your audio system or a member of a long-lived object.',
    },
    {
      kind: 'concept',
      title: 'Left, right, near, far, and missing files',
      blocks: [
        {
          type: 'p',
          text: 'SFML can place sounds in space, which in a 2D game mostly means **panning**: an explosion on the left of the screen should come out of the left speaker, and a distant one should be quieter. You give the *listener* (the player\'s ears) and each *sound* a position. Only **mono** sounds are positioned; stereo files are played as they are.',
        },
        {
          type: 'code',
          code: `sf::Sound boom(boomBuffer);                 // boomBuffer must be mono
boom.setPosition({enemy.x, enemy.y, 0.f});
boom.setMinDistance(150.f);
boom.setAttenuation(1.f);
boom.play();

sf::Listener::setPosition({player.x, player.y, 0.f});

sf::SoundBuffer hit;
if (!hit.loadFromFile("assets/hit.wav")) {
    std::cerr << "Could not load hit.wav\\n";
}`,
          annotations: [
            { lines: 2, text: 'Positions are 3D. For a 2D game keep `z` at 0 and use the same x and y as the object on screen. With the default listener direction, +x is to the listener\'s right.' },
            { lines: 3, text: 'Inside the minimum distance the sound is at full volume. Make it roughly the size of "close" on your screen.' },
            { lines: 4, text: 'Attenuation controls how fast it fades with distance. 0 means no fading at all; larger values fade faster.' },
            { lines: 7, text: 'Move the listener with the player (or the camera centre). Sounds are then heard relative to it.' },
            { lines: [10, 12], text: '`loadFromFile` returns `false` on failure instead of throwing. Decide deliberately what a missing file means: stop with a clear message, or carry on silently.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'UI sounds should ignore the listener',
          text: 'A button click should sound the same wherever the player stands. Call `setRelativeToListener(true)` on such sounds so their position is measured from the listener and never changes with it.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Check the working directory first',
          text: 'Like textures, audio paths such as `"assets/hit.wav"` are relative to the [[working-directory]]. When a sound plays from Visual Studio but not from a double-clicked `.exe`, the folder is the first thing to check.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the steps of playing a pooled effect in the right order.',
      lines: [
        'Remove voices that have stopped',
        'Return early if the pool is full',
        'Create a new sf::Sound from the shared buffer',
        'Set its pitch and volume',
        'Call play()',
      ],
      linesAreCode: false,
      explanation: 'Clean up first so the pool does not fill with dead voices, then check the cap. Only then create the new voice, configure it, and start it.',
    },
  ],
  takeaways: [
    '`sf::SoundBuffer` + `sf::Sound` is for short effects held in memory; `sf::Music` streams long tracks from disk.',
    'A `sf::Sound` points at its buffer, so the buffer must outlive it, and destroying a `sf::Sound` stops it at once.',
    'One `sf::Sound` is one voice; for overlapping effects keep a pool of sounds (a `std::list`) and cap how many play at once.',
    'Vary pitch and volume slightly, keep separate music and effect levels, and remember volume only goes down from 100.',
    'Position mono sounds with `setPosition`, move the listener with the player, and decide how a missing audio file should be handled.',
  ],
  reading: [
    { title: 'Playing sounds and music', url: 'https://www.sfml-dev.org/tutorials/3.0/audio/sounds/', source: 'other', note: 'The official guide to buffers, streaming and playback control.' },
    { title: 'Spatialization: sounds in 3D', url: 'https://www.sfml-dev.org/tutorials/3.0/audio/spatialization/', source: 'other', note: 'Listener, position and attenuation in detail.' },
  ],
};
