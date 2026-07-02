# Lobby \(Gartic Phone &#x2F; Skribbl\.io\)

### copyRoomCode\(roomCode\)

Copy the unique public lobby code to clipboard for sharing\.

**Arguments**

- `roomCode: string` — the unique 6\-character public room identifier \(e\.g\., &quot;A8X2KL&quot;\)

**Behavior**

- Writes the `roomCode` to `navigator\.clipboard`
- Shows a `success` toast: &quot;Copied to clipboard\!&quot;

**Edge cases**

- If the Clipboard API fails or is blocked → shows an `error` toast: &quot;Could not copy automatically\. Please select and copy the text\.&quot;

### inviteFriend\(roomId, friendId, friendName\)

Send an in\-app invitation to someone in your friend list\.

**Arguments**

- `roomId: string` — the internal identifier of the lobby\.
- `friendId: string` — the unique identifier of the friend to add\.
- `friendName: string` — the display name of the friend \(used only locally for the UI toast\)\.

**Behavior**

- Emits a `send\_invite` socket event with the payload: `\{ roomId, targetId: friendId \}`
- Shows a `success` toast: &quot;\[friendName\] invited to your game\!&quot;

**Edge cases**

- Friend&#39;s account deleted → user should not be in the UI list\. If cache is stale, show an `error` toast: &quot;User not found&quot;\.
- Friend disallowed invites → shows an `error` toast: &quot;\[friendName\] doesn&#39;t want to be bothered&quot;\.
- Friend is not online → shows an `error` toast: &quot;\[friendName\] isn&#39;t available&quot;\.

### updateRoundCount\(newCount\)

Update the total number of rounds for the upcoming game \(Host only\)\.

**Arguments**

- `newCount: number` — the newly selected total number of rounds\.

**Behavior**

- Emits an `update\_lobby\_settings` socket event with payload: `\{ roundCount: newCount \}`\.
- The server broadcasts this update to all players in the room\.

**Edge cases**

- UI enforces minimum&#x2F;maximum constraints; invalid inputs are ignored or clamped to valid limits\.

### changeRoundDuration\(newTime\)

Update the time limit for a single drawing&#x2F;guessing phase \(Host only\)\.

**Arguments**

- `newTime: number` — the time limit in seconds\.

**Behavior**

- Emits an `update\_lobby\_settings` socket event with payload: `\{ timePerRound: newTime \}`\.
- The server broadcasts this update to all players in the room\.

**Edge cases**

- UI enforces minimum&#x2F;maximum time limits; invalid inputs are ignored or clamped to the nearest valid value\.

### toggleWordsCategory\(categoryId, isActive\)

Enable or disable a specific dictionary category for the game \(Skribbl mode, Host only\)\.

**Arguments**

- `categoryId: string` — the unique identifier of the words dictionary\.
- `isActive: boolean` — the target state \(true to enable, false to disable\)\.

**Behavior**

- Emits an `update\_lobby\_settings` socket event with payload: `\{ categoryId, isActive \}`\.
- The server broadcasts this update to all players in the room\.

**Edge cases**

- If the host attempts to disable the last remaining category → block the action and show a `warning` toast: &quot;At least one category must be selected\.&quot;
- If a dictionary is incompatible with current game settings → UI renders it as disabled&#x2F;non\-interactive\.

### addBot\(\)

Add an AI\-controlled player to the lobby \(Skribbl mode, Host only\)\.

**Arguments**

- none — reads the current room context internally\.

**Behavior**

- Emits an `add\_bot` socket event\.
- The server instantiates a bot and broadcasts the updated player list to all clients\.

**Edge cases**

- If the lobby is already at maximum capacity → the button is disabled\. If forced, show an `error` toast: &quot;Lobby is full&quot;\.
- If the AI API is currently unreachable → the server responds with an error, and the client shows an `error` toast: &quot;AI is currently unavailable&quot;\.

### kickPlayer\(playerId\)

Remove a player from the lobby \(Host only\)\.

**Arguments**

- `playerId: string` — the unique identifier of the player to kick\.

**Behavior**

- Emits a `kick\_player` socket event with payload: `\{ targetId: playerId \}`\.
- The server removes the player and broadcasts the updated player list to the remaining clients\.

**Edge cases**

- Host attempts to kick themselves → action ignored\.
- If the target player is Adam → abort the kick and show an `error` toast: &quot;Permission denied\. You cannot kick the Project Manager\.&quot; \(Joke&#x2F;Easter egg\)\.

### startGame\(\)

Lock the lobby and initialize the game loop \(Host only\)\.

**Arguments**

- none — reads the current room context internally\.

**Behavior**

- Emits a `start\_game` socket event\.
- Server locks the room and redirects all players to the game page\.

**Edge cases**

- Number of players is less than 2 → block start and show a `warning` toast: &quot;Not enough players to start&quot;\.
- No word categories selected \(Skribbl mode\) → block start and show a `warning` toast: &quot;Select at least one word category&quot;\.

### sendMessage\(message\)

Send a text message in the lobby chat\.

**Arguments**

- `message: string` — the chat text content\.

**Behavior**

- Emits a `lobby\_chat\_message` socket event with payload: `\{ message \}`\.
- The server appends the sender&#39;s identity and broadcasts the message to all players in the room\.

**Edge cases**

- Empty message or only spaces → do not emit the event\.
- Rate limiting: If the player sends messages too fast → UI disables the send button temporarily and shows an `error` toast: &quot;You are sending messages too fast&quot;\.

### leaveLobby\(\)

Exit the current waiting room and return to the main menu\.

**Arguments**

- none — reads current context internally\.

**Behavior**

- Emits a `leave\_room` socket event\.
- Redirects the user to the Home page\.
- The server removes the player and broadcasts the updated list\.

**Edge cases**

- If the host leaves the lobby → the server automatically handles Host Migration \(assigns a new host randomly\) and notifies the remaining players\.

