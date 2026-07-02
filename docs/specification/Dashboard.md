# Dashboard

- Voir ses statistiques Skribbl\.io
- Modifier son nom d’utilisateur
- Changer son avatar
- Changer son mot de passe
- Voir le nombre de parties jouées par mode
- Voir sa position dans le leaderboard Skribbl\.io

**viewSkribblStats\(\)**

- **Description**: Displays the player&#39;s personal performance metrics specifically for Skribbl\.io\.
- **Data Points**: Includes the number of victories and the average score\.
- **Behavior**: Data is fetched from the PostgreSQL database and loaded on page mount\.
- **Edge Cases**: If the database fetch fails, an empty state with a retry button is displayed\.

**editUsername\(newUsername\)**

- **Arguments**: `newUsername` \(string, between 3 and 20 characters, no special characters\)\.
- **Behavior**: Sends a `PATCH` request to the server to update the display name in the PostgreSQL database\.
- **On Success**: Displays a success toast and updates the UI with the new username\.
- **Edge Cases**: Submissions are blocked if the name is identical to the current one, already taken, or shorter than 3 characters\.

**changeAvatar\(avatarData\)**

- **Arguments**: `File` \(uploaded image\) or `string` \(pre\-set avatar URL\)\.
- **Behavior**: Updates the player&#39;s profile picture across the entire UI, including the header and user panel\.
- **Edge Cases**: Blocks the submission if the file is not an image format or exceeds the size limit\.

**changePassword\(passwordData\)**

- **Arguments**: `currentPassword`, `newPassword` \(min\. 8 characters\), and `confirmPassword`\.
- **Behavior**: Communicates with the Clerk API to securely update account credentials\.
- **On Success**: Displays a success toast, logs the user out, and redirects to `&#x2F;sign\-in`\.
- **Edge Cases**: Displays an inline error if the current password is incorrect or if the new password and confirmation do not match\.

**viewGamesPlayed\(\)**

- **Description**: Displays the total number of games the player has completed across different modes\.
- **Data Points**: Shows a breakdown of the number of games played per mode \(Gartic Phone vs\. Skribbl\.io\)\.
- **Behavior**: Reads the current authenticated user&#39;s data internally to count session history\.
- **Edge Cases**: If the user is not logged in, they are redirected to the sign\-in page\.

**viewLeaderboard\(\)**

- **Description**: Displays the player&#39;s current standing in the global Skribbl\.io rankings\.
- **Behavior**: Displays a ranked list of players sorted by victories, with the current player&#39;s position highlighted for quick reference\.
- **Edge Cases**: If the player has never played a Skribbl\.io game, their rank is shown as &quot;unranked&quot;\.

