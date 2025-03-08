export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  lyrics: string;
  stationType: string; // Corresponds to station types in the game
}

// Using the actual music files from public/game/Music/OE-Radio
export const tracks: Track[] = [
  {
    id: '1',
    title: 'A Dress Issue',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/A Dress Issue.mp3',
    stationType: 'address', // First station - always unlocked
    lyrics: `Lorem ipsum dolor sit amet
Consectetur adipiscing elit
Sed do eiusmod tempor incididunt
Ut labore et dolore magna aliqua

Ut enim ad minim veniam
Quis nostrud exercitation ullamco
Laboris nisi ut aliquip ex ea commodo
Consequat duis aute irure dolor`
  },
  {
    id: '2',
    title: 'Quantity Blues',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/Quantity Blues.mp3',
    stationType: 'quantity', // Matches the station type in the game
    lyrics: `Sed ut perspiciatis unde omnis
Iste natus error sit voluptatem
Accusantium doloremque laudantium
Totam rem aperiam eaque ipsa

Quae ab illo inventore veritatis
Et quasi architecto beatae vitae
Dicta sunt explicabo nemo enim
Ipsam voluptatem quia voluptas`
  },
  {
    id: '3',
    title: 'No Code',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/No Code.mp3',
    stationType: 'discount', // Unlocked with discount station
    lyrics: `At vero eos et accusamus et iusto
Odio dignissimos ducimus qui
Blanditiis praesentium voluptatum
Deleniti atque corrupti quos

Dolores et quas molestias
Excepturi sint occaecati cupiditate
Non provident, similique sunt in culpa
Qui officia deserunt mollitia animi`
  },
  {
    id: '4',
    title: 'My Extra Large Mistake',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/My Extra Large Mistake.mp3',
    stationType: 'product', // Unlocked with product station
    lyrics: `Integer posuere erat a ante venenatis
Dapibus posuere velit aliquet
Cras mattis consectetur purus
Sit amet fermentum

Aenean lacinia bibendum nulla
Sed consectetur duis autem
Vel eum iriure dolor in hendrerit
In vulputate velit esse consequat`
  },
  {
    id: '5',
    title: 'Invoice of My Heart',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/Invoice of My Heart.mp3',
    stationType: 'invoice', // Unlocked with invoice station
    lyrics: `Nullam quis risus eget urna
Mollis ornare vel eu leo
Cum sociis natoque penatibus
Et magnis dis parturient montes

Nascetur ridiculus mus
Fusce dapibus, tellus ac cursus commodo
Tortor mauris condimentum nibh
Ut fermentum massa justo`
  },
  {
    id: '6',
    title: 'Cancel That Order (Please!)',
    artist: 'The Order Editors',
    src: 'game/Music/OE-Radio/Cancel That Order (Please!).mp3',
    stationType: 'cancel', // Unlocked with cancel station
    lyrics: `Vestibulum id ligula porta
Felis euismod semper eget lacinia
Donec sed odio dui nulla
Vitae elit libero, a pharetra

Augue duis dolore te feugait
Nulla facilisi nam liber tempor
Soluta nobis eleifend option congue
Nihil imperdiet doming id`
  }
]; 