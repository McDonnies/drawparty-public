# Outils de dessin \(Canvas\)

### `selectColor\(color\)`

Change the active brush color\.

**Arguments**

- `color: string` — HEX color value \(e\.g\. `\#FF0000`\)\( red for example\)

**Behavior**

- Updates the current brush color immediately 
- The new color applies to all subsequent strokes

**Edge cases**

- If `color` is invalid → keep previous color, silently ignore
- If user is not the drawer → button is disabled, action is ignored

### `setBrushSize\(size\)`

Change the brush stroke thickness\.

**Arguments**

- `size: number` — value in pixels, range 1–40

**Behavior**

- Updates brush size in real time
- Shows a visual preview of the selected size

**Edge cases**

- If `size &lt; 1` → clamp to `1`
- If `size &gt; 40` → clamp to `40`
- If user is not the drawer → disabled 

### `draw\(x, y\)`

Draw a stroke on the canvas using the active brush\.

**Arguments**

- `x: number` — horizontal coordinate \(relative to canvas\)
- `y: number` — vertical coordinate \(relative to canvas\)

**Behavior**

- Draws continuously on drag \(mousedown \+ mousemove &#x2F; touchstart \+ touchmove\)
- Uses the active color and brush size
- Sends stroke data in real time via socket to all players

**Edge cases**

- If coordinates are outside canvas bounds → ignore event
- If connection is lost → buffer strokes and resend on reconnect
- If user is not the drawer → canvas is read\-only, no drawing allowed

### `useEraser\(\)`

Activate the eraser tool to remove parts of the drawing\.

**Arguments**

- none

**Behavior**

- Temporarily replaces the brush with an eraser \(paints in background color\)
- Retains the current brush size

**Edge cases**

- If user is not the drawer → disabled
- Call `draw\(\)` to switch back to the brush

### `undo\(\)`

Cancel the last drawn stroke\.

**Arguments**

- none

**Behavior**

- Removes the last stroke from the canvas history
- Redraws the canvas without that stroke
- Synchronizes the undo action to all players via socket

**Edge cases**

- If history is empty → do nothing, visually disable the button
- If user is not the drawer → disabled
- History capped at N strokes \(e\.g\. 30\) to prevent memory overflow

### `clearCanvas\(\)`

Completely erase all content on the canvas\.

**Arguments**

- none

**Behavior**

- Resets the canvas to a blank white state
- Clears the stroke history \(undo becomes unavailable\)
- Broadcasts the clear event to all players via socket

**Edge cases**

- If user is not the drawer → disabled
- Show visual confirmation \(flash &#x2F; animation\) to prevent accidental clicks
- If connection drops at clear time → resend blank state on reconnect

