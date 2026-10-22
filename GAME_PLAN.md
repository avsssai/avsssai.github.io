# Agent Runner

## Technical choice

Use **Phaser 4.2.1** for the playable game. Phaser is a browser-first 2D framework with TypeScript support, scene management, input, audio, scaling, animation, and Arcade Physics. Its official Vite template matches Astro's underlying build tool.

The Astro route remains a static launcher. A click dynamically imports the game bootstrap so Phaser, sprites, sound, and level data do not enter the main website bundle.

References:

- https://phaser.io/download/phaser4
- https://docs.phaser.io/phaser/getting-started/installation
- https://docs.phaser.io/phaser/concepts/physics
- https://github.com/phaserjs/template-vite-ts

## Player fantasy

Siva is trying to ship a sprint while Jira tickets fly in from the right. He cannot attack tickets directly. He creates temporary coding agents in one of three lanes. Agents automatically fire at the nearest ticket in their lane until their work capacity or lifetime is exhausted.

The interesting decision is when and where to create an agent. Spawning too early wastes its active window. Spawning too often drains the short and long limit meters before the harder tickets arrive.

## Core loop

1. Tickets enter one of three lanes and move toward Siva.
2. The player changes the selected lane with arrow keys, `W` and `S`, or touch controls.
3. `Space`, click, or tap spawns an agent in that lane.
4. The agent attacks automatically until its capacity reaches zero or its timer expires.
5. Completed tickets add score and restore a small amount of momentum.
6. Escaped tickets add their story points to the backlog meter.
7. The run ends when backlog reaches its limit or both resource meters are exhausted.

## Ticket model

Ticket strength uses a Fibonacci progression:

| Story points | Role     | Behaviour                    |
| -----------: | -------- | ---------------------------- |
|            1 | Chore    | Fast and fragile             |
|            2 | Task     | Baseline ticket              |
|            3 | Bug      | Changes lane once            |
|            5 | Story    | Slower and physically larger |
|            8 | Epic     | Armoured first hit           |
|           13 | Incident | Boss ticket with two phases  |

Ticket health equals story points. Visual size grows by tier rather than directly by point value so large tickets remain playable.

## Agent model

The first playable build has one agent type:

- Costs one spawn charge.
- Has four work points of total damage.
- Can complete two 2-point tickets when timed well.
- Fires only in its lane.
- Expires after a short active window even when capacity remains.

Later agent types should create tradeoffs rather than linear upgrades:

- **Scout:** cheap, fast, four work points.
- **Builder:** slower activation, eight work points, higher limit cost.
- **Specialist:** targets 8 and 13-point tickets, weak against small work.

## Limit system

The limits are game resources inspired by agent quotas, not a claim about real product limits.

- **5H meter:** moment-to-moment spawn energy. It regenerates slowly during a run.
- **Week meter:** run-wide reserve. Every spawn permanently consumes part of it.
- **Active slots:** initially two agents. A third slot can be earned through a combo.

This produces three useful pressures: immediate survival, wave planning, and conservation for late-game tickets.

## Difficulty curve

- A run lasts about four minutes.
- The first 30 seconds teaches lane selection and spawning.
- Each wave introduces one new ticket tier.
- Ticket mixtures matter more than raw speed.
- The final wave ends with a 13-point incident behind smaller distractions.

## Scoring

- Base score: story points × 100.
- Flow bonus: consecutive tickets completed without backlog damage.
- Efficiency bonus: unused agent capacity when a wave ends.
- Shipping bonus: remaining 5H and Week resources at the end of the run.

Store only the high score and settings in local storage. No account or server is needed.

## Architecture

```text
src/game/
├── boot.ts                 # Dynamic entry point
├── config.ts               # Phaser configuration and pixel scaling
├── state/GameState.ts      # Score, limits, backlog, wave state
├── scenes/
│   ├── BootScene.ts
│   ├── MenuScene.ts
│   ├── RunScene.ts
│   └── ResultsScene.ts
├── systems/
│   ├── AgentSystem.ts
│   ├── TicketSystem.ts
│   ├── WaveDirector.ts
│   └── LimitSystem.ts
└── data/waves.ts
```

Keep simulation rules in plain TypeScript. Phaser scenes should coordinate rendering and input, which makes ticket balance testable without starting a canvas.

## Delivery sequence

### Milestone 1: playable greybox

- Three lanes, keyboard and touch input
- Siva sprite and one agent type
- 1, 2, and 3-point tickets
- Backlog, 5H, and Week meters
- One 90-second run and results screen

### Milestone 2: complete game loop

- All Fibonacci ticket tiers
- Four-minute wave director
- Combo and scoring system
- Agent timeout feedback
- Pause, restart, mute, and reduced motion settings

### Milestone 3: presentation

- Final sprite sheets and two-frame character animations
- Sound effects and short chiptune loop
- Screen shake limited to major impacts
- Mobile controls and responsive canvas framing
- Local high score and shareable result card

## Performance and accessibility

- Phaser and game assets load only after the launch action.
- Use a low internal resolution with integer scaling and pixel rounding.
- Pause the game when the tab is hidden.
- Support keyboard, pointer, and touch controls.
- Provide mute, pause, reduced motion, and high contrast options.
- Keep all critical state visible outside color alone.
