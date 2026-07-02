# Page résultats

- Voir le podium \(top 3\)
- Voir le leaderboard final complet
- Voir ses statistiques personnelles de la partie
- Rejouer avec les mêmes joueurs
- Créer une nouvelle partie
- Retourner à l’accueil
- Partager les résultats \(screenshot\)

The results page is automatically displayed at the end of a game \(Gartic Phone or Skribbl\.io\)\. It presents the final ranking, rewards the top players with animations, and allows players to start a new game or return to the homepage\.

## **ViewPodium**

Automatically displays the top 3 plyaers with animation 

## 

### **Arguments**

none\-trigggered automatically when the results page loads

### **Behavior**

- Extract the first 3 players from the sorted list 
- Display them in a podium layout \(1st place centered and highlighted\)
- Show avatar, username, and final score
- Apply entrance animation when page loads
- If fewer than 3 players → display only available players

### **Edge cases**

- If players array is empty \-&gt; display &quot;No results available&quot;
- If tie score \-&gt; preserve ranking order sent by server
- If avatar fails to load \-&gt; fallback to default avatar

## **viewFinalLeaderboard\(players\)**

- Displays the complete ranking of all players in the game, from first to last 

### **Arguments**

- Players: Players \[\] \- full list of players with final scores

### **Behavior** 

- Render table sorted by rank
- Columns: Rank | Avatar | Username | Score
- Highlight the currently authenticated user
- Enable vertical scroll if &gt; 10 players
- Data loaded from finalGameResults endpoint or socket event

### **Edge cases**

- If server data fails \-&gt;show retry button
- If player disconnected before end \-&gt; still display with final score
- If only 1 player \-&gt; still render leaderboard properly
- If a player missed some rounds \(joined later\) \-&gt; for example &quot;Joined at round 3&#x2F;12&quot; indication

## **viewPersonalStats\(\)**

Display personal performance statistics for the current player\.

mode: &quot;gartic\-phone&quot; or&quot;skribbl&quot;\.

### Arguments

`playerStats: GameStats` — object containing statistics for current user

**Behavior**

- Display inside a dedicated stats card
- Adapt content based on game mode

if mode &quot;skribbl&quot;:

- Total score
- Correct guesses
- Average guess time
- Points earned as drawer

if mode &quot;gartic\-phone&quot;:

- Prompts written
- Drawings submitted
- Descriptions written
- Chain participation count

### **Edge cases**

- If the player joined the game late \-&gt; stats calculated only from the moment they joined\.
- If player left early \-&gt; show partial stats
- If stats unavailable \-&gt; display &quot;Stats not recorded&quot;
- Prevent other players from accessing someone else&#39;s private stats
- If the player never drew \(Skribbl mode\) \-&gt; &quot;Drawer&quot; section displays &quot;No rounds as a drawer&quot;

## **replayWithSamePlayers\(roomId\)**

Create a new game session with the same players and settings\.

### **Arguments**

`roomId: string` \-&gt; current finished room ID

### **Behavior**

- Visible only if current user is host
- Emits `replay\_game` event via Socket\.io
- Generates a new roomId
- Redirects all players to new lobby
- Resets scores and round data
- Displays a toast: &quot;New lobby created&quot;

### Edge cases

- If a player disconnected \-&gt; mark as &quot;Not ready&quot;
- If host leaves \-&gt; replay button disappears
- If server fails \-&gt; show error toast

## **createNewGame\(mode\)**

Allows creating a new empty lobby without keeping the players from the previous game\.

### **Arguments**

 none — optional: can pre\-fill the current game mode

### **Behavior**

- Displays a confirmation modal : create a new game
        - button &quot;Keep Gartic Phone &#x2F; [Skribbl\.io](https://skribbl.io/)&quot;  \-&gt; redirects to &#x2F;\[gameMode\]&#x2F;lobby&#x2F;new
        - button &quot;Switch mode&quot; \-&gt; redirects to &#x2F; \(homepage\)
- Does not reuse previous room settings
- Clears local game state
- Redirects to the new lobby with default settings

### Edge cases 

If user is not authenticated \-&gt; redirect to sign\-in

If server unavailable \-&gt; show error toast

## **returnToHome\(\)**

Navigate back to homepage\.

### **Arguments**

none

### **Behavior**

- Redirects to &#x2F; \(homepage with game mode selection\)
- Clear client\-side state
- Close any open modal
- If the user is logged in \-&gt; automatic and asynchronous stats backup in PostgreSQL

### **Edge cases**

- If socket disconnect fails \-&gt; force local cleanup
- Prevent duplicate navigation calls

## 

## **shareResults\(containerRef\)**

Displays a detailed summary of the player&#39;s individual performance during the game

### **Arguments**

`containerRef: React\.RefObject&lt;HTMLDivElement&gt;` — reference to results container

### **Behavior**

- Capture results component using html2canvas
- Generate PNG image
- Automatically download file: `drawparty\-results\.png`
- On mobile, use Web Share API if supported

### **Edge cases**

- if capture fails → show error toast
- If Web Share API unsupported → fallback to download
- If too many players → auto\-scale image

