# System Actions

## showToast\(message, type, options\)

Display a short, auto\-dismissing notification to inform the user of a system event\.

**Arguments**

- `message: string` — the text content of the toast \(max 100 characters\)
- `type: &quot;success&quot; | &quot;error&quot; | &quot;info&quot; | &quot;warning&quot;` — determines the color and icon displayed
- `options\.duration?: number` — auto\-dismiss delay in ms, default `3000`\. Pass `0` for persistent toast
- `options\.action?: \{ label: string, onClick: \(\) =&gt; void \}` — optional action button inside the toast \(e\.g\. &quot;Retry&quot;, &quot;Join&quot;\)

**Behavior**

- Renders a toast notification in the top\-right corner \(desktop\) or bottom\-center \(mobile\)
- Auto\-dismisses after `duration` ms unless `duration` is `0`
- `&quot;success&quot;` → green with checkmark icon
- `&quot;error&quot;` → red with X icon
- `&quot;info&quot;` → blue with bell icon
- `&quot;warning&quot;` → orange with exclamation icon
- If an `action` is provided, renders a clickable button inside the toast

**Edge cases**

- If more than 3 toasts are active simultaneously → queue the new one, display it when space is available
- If the same message is triggered twice within 500ms → deduplicate, do not show it twice
- If `duration` is `0` → toast must display an explicit X close button
- On mobile → toast must be swipe\-dismissible
- On page navigation → dismiss all active toasts automatically

## dismissToast\(toastId\)

Programmatically dismiss a specific active toast\.

**Arguments**

- `toastId: string` — the unique ID returned by `showToast\(\)` at creation time

**Behavior**

- Immediately removes the toast with the matching ID from the screen
- If the toast has a queued replacement, the next toast in queue is displayed

**Edge cases**

- If `toastId` does not match any active or queued toast → do nothing, no error thrown
- If called during the toast&#39;s exit animation → animation completes before removal

## openRulesModal\(gameMode\)

Open a modal displaying the rules of the selected game mode\.

**Arguments**

- `gameMode?: &quot;gartic\-phone&quot; | &quot;skribbl&quot; | &quot;all&quot;` — which tab to display by default\. Defaults to `&quot;all&quot;` if not provided

**Behavior**

- Opens a modal with 2 tabs: &quot;Gartic Phone&quot; and &quot;Skribbl\.io&quot;
- If `gameMode` is `&quot;gartic\-phone&quot;` or `&quot;skribbl&quot;` → opens directly on the corresponding tab
- Each tab displays: objective, turn structure, time limits, scoring rules
- Accessible from: Home Page, Lobby, In Game \(via a &quot;?&quot; or &quot;Rules&quot; button\)

**Edge cases**

- If `gameMode` is an invalid value → default to `&quot;all&quot;`, do not throw an error
- Must not interrupt an ongoing game — modal is overlay only, game state is untouched
- Modal must be closable via X button, click on backdrop, or `Escape` key
- On mobile → content must be scrollable inside the modal

## closeModal\(modalId\)

Close a specific open modal or dialog\.

**Arguments**

- `modalId: string` — the unique identifier of the modal to close \(e\.g\. `&quot;rules&quot;`, `&quot;bug\-report&quot;`\)

**Behavior**

- Removes the modal from the screen with a closing animation
- Re\-enables body scroll \(`overflow: hidden` removed\)
- Returns focus to the element that triggered the modal \(accessibility\)

**Edge cases**

- If modal contains an unsaved form → show a confirmation dialog before closing
- If multiple modals are stacked → only the top\-most modal is closed, the one below remains
- `Escape` key → closes only the top\-most modal, not all of them
- Clicking inside the modal content must NOT close it \(event propagation stopped\)
- If `modalId` does not match any open modal → do nothing, no error thrown

## submitBugReport\(report\)

Submit a bug report or feedback from the user\.

**Arguments**

- `report\.description: string` — user\-written description of the issue, min 10 characters, max 500 characters
- `report\.category: &quot;ui&quot; | &quot;gameplay&quot; | &quot;connection&quot; | &quot;other&quot;` — type of issue, selected from a dropdown
- `report\.currentPage: string` — auto\-filled from the current route \(e\.g\. `&#x2F;lobby`, `&#x2F;game&#x2F;skribbl`\)
- `report\.userAgent: string` — auto\-filled from `navigator\.userAgent`

**Behavior**

- User opens the bug report modal via a &quot;Report a bug&quot; button accessible from any page
- User fills in the description and selects a category
- On submit → sends the report, disables the submit button \(loading state\)
- On success → shows a `success` toast: *&quot;Bug report sent, thank you\!&quot;*, closes the modal, resets the form
- On failure → shows an `error` toast: *&quot;Failed to send report, please try again&quot;*, keeps modal open with data intact

**Edge cases**

- If description is empty or under 10 characters → show inline validation error, block submission
- If user submits twice quickly → button remains disabled after first click until response received
- If modal is opened mid\-game → game continues running in the background uninterrupted
- If network is offline → show `error` toast immediately without attempting the request

## handleDisconnect\(reason\)

Detect a Socket\.io disconnection and notify the user\.

**Arguments**

- `reason: string` — the disconnection reason provided by Socket\.io \(e\.g\. `&quot;transport close&quot;`, `&quot;ping timeout&quot;`\)

**Behavior**

- Triggered automatically when the socket emits a `disconnect` event
- Shows a persistent `error` toast \(`duration: 0`\): *&quot;Connection lost\. Reconnecting…&quot;*
- Calls `attemptReconnect\(\)` immediately after

**Edge cases**

- If the user intentionally navigated away from the page → do not trigger reconnect flow
- If disconnection reason is `&quot;io server disconnect&quot;` \(server\-side forced disconnect\) → redirect to home page directly, do not attempt reconnect

## attemptReconnect\(\)

Try to re\-establish the Socket\.io connection after a disconnection\.

**Arguments**

- none — reads socket instance and room context internally

**Behavior**

- Socket\.io attempts reconnection with exponential backoff \(built\-in retry mechanism\)
- Updates the persistent toast message on each attempt: *&quot;Reconnecting… \(attempt 2&#x2F;5\)&quot;*
- Server holds the player&#39;s slot for **30 seconds** \(as defined in the cahier des charges\)
- On success → calls `onReconnectSuccess\(\)`: dismisses error toast, shows `success` toast *&quot;Reconnected\!&quot;*, re\-syncs game state from server
- On failure after 30s → calls `onReconnectFailure\(\)`: redirects to home page, shows `error` toast *&quot;You were disconnected from the game&quot;*

**Edge cases**

- If reconnect succeeds during the drawing phase → re\-sync full canvas history from server before rendering
- If reconnect succeeds during word selection \(Skribbl\) → restore word selection screen if timer has not expired
- If the user was the host and fails to reconnect → frontend must handle the `host\_changed` socket event and update the UI accordingly
- Multiple rapid disconnect&#x2F;reconnect cycles → debounce reconnect attempts, do not spam the server
- If the user manually closes the browser tab during reconnect → no action needed

