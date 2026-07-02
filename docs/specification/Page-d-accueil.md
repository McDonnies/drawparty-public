# Page d&#39;accueil

### selectGameMode\(mode\)

Navigate to the lobby creation flow for the chosen game\.

**Arguments**

- `mode: &quot;gartic\-phone&quot; | &quot;skribbl&quot;` — the selected game mode

**Behavior**

- If user is signed in → redirect to `&#x2F;\[mode\]&#x2F;lobby&#x2F;new`
- If user is a guest → redirect to `&#x2F;\[mode\]&#x2F;lobby&#x2F;new` with guest flag

**Edge cases**

- If servers are unavailable → show error toast, disable the card button
- If user is already in an active room → show confirmation modal before redirecting

### openAuth\(view\)

Open the sign\-in or sign\-up page\.

**Arguments**

- `view: &quot;sign\-in&quot; | &quot;sign\-up&quot;` — which Clerk page to show

**Behavior**

- Redirects to `&#x2F;sign\-in` or `&#x2F;sign\-up`
- After success, redirects back to `&#x2F;`

**Edge cases**

- If user is already signed in → redirect to `&#x2F;` immediately, do nothing
- If Clerk is unavailable → show error toast &quot;Authentication unavailable, try again later&quot;

### openUserPanel\(\)

Slide open the user side panel from the left\.

**Arguments**

- none — reads auth state from Clerk context internally

**Behavior**

- Opens the `&lt;UserPanel&gt;` component
- Locks body scroll while open
- Loads friends list and notifications

**Edge cases**

- If user is not signed in → redirect to `&#x2F;sign\-in` instead of opening panel
- If friends API fails → show empty state with retry button, do not crash panel

