export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  lyrics: string;
  stationType: string; // Corresponds to station types in the game
  locked?: boolean; // Flag to indicate if a track should display as locked
}

// Using the actual music files from public/game/Music/OE-Radio
export const tracks: Track[] = [
  // Background music songs - available from the beginning
  {
    id: 'bg1',
    title: 'Chilled',
    artist: 'The Order Editors',
    src: 'game/Music/BG-Music/Chilled.mp3',
    stationType: 'warehouse', // Always unlocked from the start
    lyrics: 'www.orderediting.com'
  },
  {
    id: 'bg2',
    title: 'Frantic',
    artist: 'The Order Editors',
    src: 'game/Music/BG-Music/Frantic.mp3',
    stationType: 'warehouse', // Always unlocked from the start
    lyrics: 'www.orderediting.com'
  },
  {
    id: 'bg3',
    title: 'Relaxed',
    artist: 'The Order Editors',
    src: 'game/Music/BG-Music/Relaxed.mp3',
    stationType: 'warehouse', // Always unlocked from the start
    lyrics: 'www.orderediting.com'
  },
  // Unlockable songs
  {
    id: '1',
    title: 'A Dress Issue',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/A Dress Issue.mp3',
    stationType: 'first_song', // Changed from 'address' to 'first_song' to be unlocked after 2 edits
    lyrics: `It's been 3 months since
I changed addresses
But a problem that I
must address is
I just bought
Some brand new dresses 
And now they're shipping 
To my exes 
HOUSE!

I was shopping online
Just a minute ago
My new wardrobe glow up
Was ready to go
But then I used Shop Pay
And screamed "oh no!"

It autofilled my old address
That lying cheater's home address

[Bridge]

I can't do it 
I can't breathe 
Don't send to him
Send to me
How can I
Make this right
I just can't handle one more fight

[Chorus]

If I only had some time
To fix my order online
I'd redirect to mine
And everything would be
Fine, fine, fine, fine, fine!!!

So let me make the change
And save me from this pain
Let me fix my order please
And everything will be
Fine, fine, fine, fine, fine!

Verse

But wait?
What is this?
"Hey, I didn't know THIS exists"
I have time
To make a change
And save myself
From the pain 

I can edit
I can change
My new address
I'm not insane
This is awesome
This is great!
I have altered
My order's fate

[Bridge - new lyrics]

I CAN do it 
I CAN breathe 
Don't send to him
Send to me
Order Editing
Made this right
Now I won't have one more fight

[Chorus - new lyrics]

Thank you for the time
To fix my order online
I've redirected to mine
And everything will be
Fine, fine, fine, fine, fine!!!

You let me make the change
And saved me from this pain
You let me fix my order 
And now everything is
Fine, fine, fine, fine, fine!`
  },
  {
    id: '2',
    title: 'Quantity Blues',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/Quantity Blues.mp3',
    stationType: 'quantity', // Matches the station type in the game
    lyrics: `Well, I clicked that button, felt so sure,
Ordered ten of something, maybe more,
But now I see, I got it wrong,
I need to change it, can't take too long.

(Chorus)
Change my order, change my fate,
Don't make me call, don't make me wait,
I need one less, or maybe two,
Just let me fix what I gotta do.

(Verse 2)
The wife just called, said, "What's this mess?"
I bought too much—now I confess,
Or maybe I should get some more,
Before they ship it out the door.

(Chorus)
Change my order, change my fate,
Don't make me call, don't make me wait,
I need one less, or maybe two,
Just let me fix what I gotta do.

(Bridge)
Oh, the box ain't packed, the tape ain't sealed,
I know it's sittin' in some warehouse still,
So give me the power, give me the say,
To add or take some things away.

(Verse 3)
If I had to send it back,
It'd cost me time, it'd be a drag,
But just one click, that's all it takes,
To fix this small but big mistake.

(Final Chorus)
Change my order, change my fate,
Don't make me call, don't make me wait,
Just one button, that's all I need,
To fix my order, set me free.

Come on now, don't make a man beg…
Just let me fix it before it's shipped out on that ol' brown truck…`
  },
  {
    id: '3',
    title: 'No Code',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/No Code.mp3',
    stationType: 'discount', // Unlocked with discount station
    lyrics: `Damn, clicked buy—trigger finger itchy, hasty with the mouse,
Wallet feelin' skinny, skipped discounts, hustlin' the house,
Panic sets in quick, that final click costin' amounts,
Knew I missed the promo, gotta figure it out.

Mind racin', receipt chasin', heart pacin',
I was confident, but now my purchase feel vacant,
Savings I forsaken, quick-buying impatient,
Code slippin' from my grip—got my pockets feelin' naked.

But see, they got me shook, like I missed the hook,
Deals slippin' through my fingers like pages of holy books,
Could've saved digits, flipped it, like gymnast physics,
Now I'm dizzy, feelin' sicker than forgotten lyrics.

I forgot the code—missed out on the load,
Tryna keep composure, but my cash finna implode,
Order locked tight—didn't see the promo light,
But I got redemption, 'bout to edit this tonight.

Checkin' my reflection, feeling buyer's remorse,
Tryna fight the loss, money slippin' out its course,
Customer service? 
Nah, I ain't tryna beg, plead,
Lines tied up longer than Kendrick's track feeds.

Then clarity hits, sharper than Kung Fu Kenny kicks,
Site got options—order editin', slick,
Like "Control" verse, altering the cart universe,
Reverse my mistakes—discount reimbursed.

Quick edit button, 'bout to rewrite my fate,
Digits restored, rejuvenate my state,
No wait, no hate, no debate or contemplate,
Just update, rebate—discount integrate.

I forgot the code—missed out on the load,
Tryna keep composure, but my cash finna implode,
Order locked tight—didn't see the promo light,
But I got redemption, 'bout to edit this tonight.

Now my wallet sittin' pretty—reborn from ashes,
Like TDE flow, my transaction smashes,
Discount dreams reignited, reign supreme,
Edit quick scheme, money flowin' upstream.

(Outro)
Almost took a loss, tryna move too fast,
But caught the edit button, dodged financial blast,
No more stressin', no support lines jammin',
Order editing the truth—no more discounts abandon.`
  },
  {
    id: '4',
    title: 'My Extra Large Mistake',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/My Extra Large Mistake.mp3',
    stationType: 'product', // Unlocked with product station
    lyrics: `Clicked 'buy now,' it's getting late,
Feeling rad, couldn't wait,
Thought the size said 'M'—I'm a fool,
Turns out it's bigger than my state.

Package came, opened it quick,
Now it looks like a circus tent, great!
Swimming in fabric, drowning deep,
Mom's laughing, "That's yours to keep!"

[Chorus]
Bought an extra, extra large tee,
Didn't read carefully—now I'm drowning,
I could fit my friends and family,
What was I thinking? It's XXL tragedy.

[Verse 2]
Walking down the street, shirt drags behind,
Catching wind, I'm a sailboat in disguise,
Neighbor said, "Hey, nice parachute!"
Guess it's useful if I fall from a tree.

Wore it once, like a circus tent,
Neighbors stared, asked if it's for rent,
Now I sleep inside this shirt,
My pride's bruised, my wallet's hurt.

[Chorus]
Bought an extra, extra large tee,
Didn't read carefully—now I'm drowning,
I could fit my friends and family,
What was I thinking? It's XXL tragedy.

[Bridge]
Maybe I could turn this thing around,
Start a band, wear it as a gown,
Halloween costume, ghost disguise,
Laundry day, it's my compromise.

[Outro]
Guess I'll check sizes twice next time,
Or start a band, shirt as our sign,
Big mistakes become memories,
Still stuck with my XXL tee.`
  },
  {
    id: '5',
    title: 'Invoice of My Heart',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/Invoice of My Heart.mp3',
    stationType: 'invoice', // Unlocked with invoice station
    lyrics: `I placed an order late one night, alone and unsure,
Clicked "buy" beneath the neon glow, the cost I didn't know.
Now the emails come and go, but there's one thing I need,
A paper trail to ease the pain, financial clarity.

[Pre-Chorus]
I search through the night,
Lost in digital dreams,
Won't you help me make things right?
Send me proof, fulfill my needs!

[Chorus]
Send me a tax invoice,
Make it crystal clear,
Hold my business heart,
In your fiscal embrace.
A tax invoice tonight,
My accounts depend on you,
Invoice of my life,
Only you can pull me through.

[Verse 2]
Receipts without numbers, so cold and incomplete,
Taxman waits in shadows, he knows I face defeat.
I dial up support lines, holding endlessly,
But all I need is just one file, an invoice to set me free.

[Pre-Chorus]
Alone here again,
Haunted by pending fees,
Your proof is my light,
My only remedy.

[Chorus]
Invoice, hear my plea,
Prove my payment history,
I'm on bended knee,
Tax invoice set me free.

[Bridge (Guitar Solo)]

Send the tax invoice,
End this endless wait,
My expenses clear,
You alone control my fate.
Invoice in my hand,
Printed destiny,
Save my restless soul,
Tax invoice, rescue me.`
  },
  {
    id: '6',
    title: 'Cancel That Order (Please!)',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/Cancel That Order (Please!).mp3',
    stationType: 'cancel', // Unlocked with cancel station
    lyrics: `Bought myself cat food, but I don't own a cat,  
Thought I'd start gardening, but forgot about that.  
Japanese novel, but I can't read a page,  
My bookshelf is laughing, credit card rage.  

Put all my savings down, roulette ball spun,  
Landed on red, and now all my cash gone.  
My dog's been shopping, with his paws,  
Auto Fetch 3000, can we please pause!

[Chorus]  
Cancel that order, I beg you please,  
Life threw a curveball, brought me to my knees.  
Didn't mean trouble, no drama today,  
Cancel that order, make it all go away.  

[Verse 2]  
Tickets to Broadway, wrong continent though,  
Booked in New York but I live down below.  
An asteroid landed right through my roof,  
Shopping online is the least of my goofs.  

Ice cream by pallet, freezer is bust,  
Vanilla tsunami, a sweet sticky crust.  
Turned minimalist overnight, clutter is sin,  
Boxes arriving—can't let them in!  

[Chorus]  
Cancel that order, I beg you please,  
Life threw a curveball, brought me to my knees.  
Didn't mean trouble, no drama today,  
Cancel that order, make it all go away.  

[Bridge]  
Life's full of twists, unpredictable turns,  
Sometimes you buy, sometimes you learn.  
I didn't intend it, life's just bizarre,  
Take back my order, wherever you are.  

[Verse 3]  
Ordered skydiving, remembered my fear,  
Ten thousand feet—I'll stay grounded right here.  
Signed up for marathons, then broke my toe,  
Running ain't happening, refund my dough.  

Pizza for hundreds, but eating alone,  
Miscalculated, need one slice to-go.  
Subscription to steak club, turned vegan last night,  
Cows celebrating my dietary fright.  

[Chorus]  
Cancel that order, I beg you please,  
Life threw a curveball, brought me to my knees.  
Didn't mean trouble, no drama today,  
Cancel that order, make it all go away.  

[Outro]  
Life happens fast, orders can stray,  
Cancel it easy, without dismay.  
No harm intended, just quirky and true,  
Cancel my order, I'm counting on you!`
  }
]; 