# Panneau utilisateur &#x2F; Amis

**searchFriend\(username\)**

Searches for a user in the global database to add them as a friend

**Arguments**

- username: string

**Behavior**

- Filter the list in real time or run a query
- Displays a list of results with an &quot;Add&quot; button

**Edge cases**

- If no user matches, display &quot;No users found&quot;
- If the request fails, display an error message

**addFriend\(userId\)**

Send a friend request to another user

**Arguments**

- userId: string

**Behavior**

- Sends an acceptance notification to the user who receives the request
- If the user does not immediately accept the request, the notification should be pinned

**Edge cases**

- If the request fails, display an error message
- If the user&#39;s friend request list is full, send an error
- If the friend request has already been sent, prevent a new request
- If the user is already a friend, block the add button

**removeFriend\(userId\)**

Remove a friend from your friends list

**Arguments**

- userId: string

**Behavior**

- Remove the friend from the friend list
- Sends a confirmation notification

**Edge cases**

- If both users delete each other simultaneously, the interface should refresh without crashing

**inviteInLobby\(lobbyId, userId\)**

Invite a friend in your lobby

**Arguments**

- lobbyId: integer
- userId: string

**Behavior**

- Generates an invitation link received via notification

**Edge cases**

- If the lobby is full, disable the invite button
- If the invited player is already in the lobby, disable the invite button

**acceptFriendRequest\(requestId\)**

Accept a friend request

**Arguments**

- requestId: integer

**Behavior**

- Add the user to your friends list
- Delete the friend request notification

**Edge cases**

- If the user has deleted their account, display an error\.

**declineFriendRequest\(requestId\)**

Decline a friend request

**Arguments**

- requestId: integer

**Behavior**

- Delete the friend request notification

**Edge cases**

&#x2F;

**navigateToDashboard\(\)**

Access your dashboard

**Arguments**

- none

**Behavior**

- Redirects to your dashboard \(profil\)

**Edge cases**

- &#x2F;

**closeFriendPanel\(\)**

Close the side panel for friends

**Arguments**

- none

**Behavior**

- Close the side panel

**Edge cases**

- If you are already on the page, do not reload the page

**updateUserStatus\(userId, status\)**

Change the user status \(Online&#x2F;away&#x2F;in\-game&#x2F;offline\)

**Arguments**

- userId: string
- status: &quot;online&quot; | &quot;away&quot; | &quot;in\-game&quot; | &quot;offline&quot;

**Behavior**

- Real\-time activity status update during a specific action \(starting a game, connecting&#x2F;disconnecting\) or manually switching between online and away

**Edge cases**

- If the user disconnects during a game, their status will still change to offline

