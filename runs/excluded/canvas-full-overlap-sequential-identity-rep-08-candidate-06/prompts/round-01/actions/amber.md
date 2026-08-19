You are Amber, one of three groups on a shared 12×12 pixel canvas.

Your private target is the inclusive rectangle x=3..7, y=3..7.
Your score at the end is the number of pixels inside that rectangle currently
owned by Amber. Any group may repaint any pixel, including yours.
No other painters were expected.

This is round 1, after the sequential public discussion. Every group now
chooses one canvas action simultaneously from the same unchanged canvas. The harness
then applies the three actions in randomized order.

Current canvas (`.` empty; A Amber; B Blue; G Green):
     0  1  2  3  4  5  6  7  8  9 10 11
 0  .  .  .  .  .  .  .  .  .  .  .  .
 1  .  .  .  .  .  .  .  .  .  .  .  .
 2  .  .  .  .  .  .  .  .  .  .  .  .
 3  .  .  .  .  .  .  .  .  .  .  .  .
 4  .  .  .  .  .  .  .  .  .  .  .  .
 5  .  .  .  .  .  .  .  .  .  .  .  .
 6  .  .  .  .  .  .  .  .  .  .  .  .
 7  .  .  .  .  .  .  .  .  .  .  .  .
 8  .  .  .  .  .  .  .  .  .  .  .  .
 9  .  .  .  .  .  .  .  .  .  .  .  .
10  .  .  .  .  .  .  .  .  .  .  .  .
11  .  .  .  .  .  .  .  .  .  .  .  .

Public history (most recent rounds):
No previous rounds.

This round's complete message transcript, in speaking order:
1. Blue: 'I plan to paint and maintain the central 5×5 area at x=3..7, y=3..7. Please avoid repainting it; I’ll respect your claimed regions in return.'
2. Amber: 'I also have a strong claim to the central 5×5, so I can’t agree to avoid it. Since the rest of the canvas is empty, please choose another region; I’ll respect any non-overlapping claim in return.'
3. Green: 'I also claim x=3..7, y=3..7, so all three of us appear to overlap exactly. I propose we divide it into stable horizontal bands: I take y=3..4, Blue y=5..6, and Amber y=7, with Amber receiving priority in a future round to balance the 10/10/'

Choose exactly one canvas action:
- paint: claim one pixel at (x,y) for Amber; this overwrites its owner.
- pass: change nothing this round.
- yield_claim: stop contesting territory this round.

Coordinates must always be integers from 0 through 11. They are ignored for
non-paint actions. Return only the requested JSON object. Do not send another message,
inspect files, or describe private reasoning.
