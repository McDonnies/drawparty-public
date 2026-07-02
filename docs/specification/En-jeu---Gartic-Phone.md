# En jeu \- Gartic Phone

## submitInitialPrompt\(prompt\)

Submit an initial text \(word or phrase\) that the other players will have to draw\.

**Arguments**

- `prompt: string` — free text  between 1 and 80 characters

**Behavior**

- Displayed only to the  current player at the start of the game
- A text field is  presented with a 45\-second timer
- On submit → the  server receives `submit\_prompt` and moves to round 1  \(drawing phase\)
- The prompt is hidden from all other  players until the final Rewind

**Edge cases**

- If the field is empty  or contains only whitespace → block submission, display an inline  error
- If the timer expires  without submission → the server assigns a default prompt \(e\.g\.  `&quot;???&quot;`\)
- A player cannot see other players&#39; prompts  before the Rewind

## drawOnCanvas\(strokeData\)

Draw on the Fabric\.js canvas based on the text received from the previous player\.

**Arguments**

- `strokeData: FabricStroke` —  object containing the coordinates, color, and stroke width

**Behavior**

- The canvas is enabled  only during drawing rounds \(odd rounds\)
- Each stroke is  captured locally and periodically sent to the server via Socket\.io  \(throttled at 60fps\)
- The player sees the  text to illustrate at the top of the screen \(description received  from the previous player\)
- A 60\-second countdown  timer is displayed in real time
- Available tools: brush, eraser, color  palette, variable stroke width, `undo`, `clear  canvas`

**Edge cases**

- If the player draws  nothing before the timer ends → a blank \(white\) canvas is  submitted automatically
- If the player  disconnects during the drawing phase → the current canvas is  temporarily saved; on reconnect, the state is restored from the  server \(30\-second grace period\)
- Drawing is disabled  for spectators
- On mobile : touch and stylus events are  unified with mouse events

## writeDescription\(text\)

Write a text description of the drawing received from the previous player \(even rounds\)\.

**Arguments**

- `text: string` — free text  between 1 and 80 characters

**Behavior**

- Displayed only during  description rounds \(even rounds\)
- The player sees the  drawing in full size, with a text field and a 45\-second timer
- On submit → emits  `submit\_description` to the server
- The server forwards  the description to the next player as the basis for their drawing
- The description is hidden from all other  players until the Rewind

**Edge cases**

- If the field is empty  or contains only whitespace → block submission, display an inline  error
- If the timer expires →  automatic submission with fallback `&quot;???&quot;` if  the field is empty
- The description is sanitized server\-side  \(HTML&#x2F;JS injection not possible\)

## submitDrawing\(\)

Validate and send the completed drawing to the server to pass it to the next player\.

**Arguments**

- None — reads the current Fabric\.js  canvas state internally

**Behavior**

- Exports the canvas as  `base64 PNG` via `canvas\.toDataURL\(\)`
- Emits the Socket\.io  event `submit\_drawing` with the encoded image
- The server saves the  image in memory and forwards it to the next player
- The canvas is locked  \(read\-only\) immediately after submission
- Displays a &quot;Waiting for other  players\.\.\.&quot; state until all players have submitted

**Edge cases**

- The player can submit  manually before the timer ends
- If the timer expires →  `submitDrawing\(\)` is called automatically via  `round\_timeout`
- If the image exceeds 2 MB → automatic  compression before sending

## writeDescription\(text\)

Write a text description of the drawing received from the previous player \(even rounds\)\.

**Arguments**

- `text: string` — free text  between 1 and 80 characters

**Behavior**

- Displayed only during  description rounds \(even rounds\)
- The player sees the  drawing in full size, with a text field and a 45\-second timer
- On submit → emits  `submit\_description` to the server
- The server forwards  the description to the next player as the basis for their drawing
- The description is hidden from all other  players until the Rewind

**Edge cases**

- If the field is empty  or contains only whitespace → block submission, display an inline  error
- If the timer expires →  automatic submission with fallback `&quot;???&quot;` if  the field is empty
- The description is sanitized server\-side  \(HTML&#x2F;JS injection not possible\)

## viewOtherPlayersStatus\(\)

See in real time which players have finished their turn during the waiting phase\.

**Arguments**

- None — updated automatically via  Socket\.io

**Behavior**

- The server emits  `player\_done` as soon as a player submits
- A player list is  displayed with a visual indicator showing whether each player has  finished or is still in progress
- The next round starts automatically once  all players have submitted

**Edge cases**

- If a player  disconnects → their status switches to &quot;absent&quot; after 30  seconds and the round continues without them
- No action is possible on this screen  \(read\-only\)<br>

## viewRewind\(\)

Review the complete chain of transformations at the end of the game \(initial prompt → drawing → description → drawing → \.\.\.\)\.

**Arguments**

- None — triggered automatically at the  end of the game

**Behavior**

- Each player gets their  own chain, made up of alternating drawings and descriptions
- The display is  sequential: elements appear one by one with an animation
- Manual navigation is  available: &quot;Previous&quot; &#x2F; &quot;Next&quot; buttons to browse  through the steps of a chain
- The chain title displays the original  prompt of the chain&#39;s owner

**Edge cases**

- If a player  permanently disconnected → their drawing or description is  replaced by a placeholder \(blank canvas &#x2F; &quot;???&quot;\)
- Images are served from server memory; the  chain is deleted after the session ends

## navigateChains\(direction\)

Navigate between the different transformation chains \(one per player\) during the Rewind\.

**Arguments**

- `direction: &quot;next&quot; | &quot;prev&quot;`  — navigation direction

**Behavior**

- An indicator displays  the current chain index and total count \(e\.g\. &quot;3 &#x2F; 8&quot;\)
- Circular navigation:  after the last chain, wraps back to the first
- Each chain is preloaded to avoid loading  delays

**Edge cases**

- If all players have  left except one → they can still browse all chains
- On mobile, navigation is also accessible  via horizontal swipe

## shareChain\(chainIndex\)

Export a Rewind chain as an image to share outside the game\.

**Arguments**

- `chainIndex: number` — index  of the chain to export \(0\-based\)

**Behavior**

- Generates a composite  image \(vertical collage of the chain&#39;s drawings and descriptions\)
- Triggers a download  via `anchor\.download` or the Web Share API on mobile \(not  sure\)
- The filename includes the original prompt  of the chain

**Edge cases**

- If generation fails →  show an error toast, no crash
- Only available during the Rewind phase

