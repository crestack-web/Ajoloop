# Traditional Ajo (offline)

## Rules
1. Creator invites people until the circle is full.
2. Members pick unique **stones**.
3. **Roll** sets payout order after the organizer.
4. **Round 1** → organizer. Organizer does not contribute that round.
5. **Platform fee** = 8% of round 1 pot only (simulated agent fee).
6. Later rounds → each remaining member in stone-roll order; everyone contributes.

## Status flow
`open` → `stones` → (roll) → `active` → `done`

## Test path
1. Go to Ajo Center (Town).
2. Create Ajo → invite met NPCs until full.
3. Pick stone if you are a non-host member; host rolls stones.
4. Start circle → advance days → pay / receive pots.

## Backend later
- Server-side roll (fair RNG)
- Real collections via payment partner
- Fee settlement to platform ledger
