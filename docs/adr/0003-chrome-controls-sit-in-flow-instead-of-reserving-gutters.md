# Chrome controls sit in the page's own surfaces, so no shell reserves a gutter

Supersedes the reserved-gutter half of the redesign spec's decision 2 (`docs/spec/redesign-implementation-spec.md`).
Decided in #89, which asked whether the command palette and its floating button survive.
The owner's answer: neither does, and the theme toggle joins the masthead.

Decision 2 held three controls off the content with exclusion zones: a top-right 56×56 box for
the fixed theme toggle, reserved on every shell inset as `pr-20` (`pr-20 lg:pr-6` on
`/writing`), and a bottom-right column shared by `BackToTop` and the command FAB. That worked,
and it was expensive in a way the spec did not price: the reservation was horizontal and
full-height, so on a phone every paragraph of every route gave up 56px — about 15% of the
measure at 375 — to keep two floating controls off text they would only cross while scrolling.
The masthead paid twice, because its top padding also had to keep its bottom rule below the
toggle's fixed bottom edge.

What ships instead:

- **The command palette is gone**, with its floating button, `cmdk`, the dialog primitive, and
  the Ctrl/Cmd+J binding that was cancelling the browser's Downloads shortcut on Windows and
  Linux. Its payload — Personal Website, GitHub, LinkedIn, X, and a View/Print CV action — was
  visible on every route at every width already.
- **The theme toggle is in flow**, placed by whichever surface owns each route's controls: the
  masthead row on `/` and `/writing`, the document control row on `/cv`. It carries a 36px box
  with `touch-target`'s 44px hit area, because a 44px box in a masthead row is the tallest
  thing in it and would set the header's height.
- **All three insets are symmetric.** Measured, the hub masthead came to 62px at 375 (from 66)
  and 70px at 1024 (from 82), and every route's measure reaches the full width its padding
  allows.
- **`BackToTop` is painted only from `xl`**, where the margin beside the measure is genuinely
  empty, and its scroll subscription is gated to the same query.

## Considered options

**Keep the reserved gutter for `BackToTop` alone, on the body inset only.** The masthead would
stay symmetric — the visible defect that prompted #89 — while the body column stayed 56px
short of it below `lg`. Rejected: the two right edges no longer line up, and it keeps charging
every phone paragraph for one control. The trade is the one #89 rejected for the FAB, with a
different button in the seat.

**Gate `BackToTop` at `lg` rather than `xl`.** `lg` is where the spec put "may sit in the
margin", but the hub's measure is `max-w-5xl` — 1024px — so at a 1024px viewport there is no
margin and the button lands on the body text. Measured as a collision at 375, 768 and 1024;
1440 is clear. `xl` (1280) leaves 168px of clearance at the hub's measure.

**Move `BackToTop` in flow, into the footer.** No fixed chrome anywhere, and the affordance
survives on phones. Rejected by the owner in favour of the `xl` gate: a back-to-top link you
can only reach by scrolling to the bottom is not the same affordance.

## Consequences

**Phones have no back-to-top control.** This is the accepted cost, and it is the widths where
pages are longest. If it comes back below `xl` it has to come back in flow — a fixed one needs
an exclusion zone, and that is what this ADR spends.

**A control added to the masthead row costs header height directly.** The row is `items-center`
with a 36px control in it, and `tests/responsive-hub-shell.spec.ts` holds the masthead box to
70px — a ceiling that was 84px while the toggle was overhead. A 44px box does not fit under it.

**No shell reserves a horizontal gutter any more, so anything newly fixed collides on
arrival.** One vertical reservation outlives this decision: `SiteFooter`'s `pb-20`, which
decision 2 asked for as bottom-right clearance and which now reads as page-end space —
below `xl` there is nothing fixed to clear, and above it the button sits in the margin. `tests/responsive-hub-shell.spec.ts` asserts symmetric padding on every inset and
that `BackToTop` is the only fixed control; `tests/interaction-hardening.spec.ts` hit-tests the
corners at four widths and asserts no route cancels Ctrl/Cmd+J or Ctrl/Cmd+K.
