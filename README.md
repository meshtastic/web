## Installation

1. Make sure [NodeJS](https://nodejs.org/en/download) and [pnpm](https://pnpm.io/installation) are installed.
2. Clone [meshtastic/js](https://git.cs.uni-bonn.de/ba-grimm-meshtastic) into some other folder.
3. Build it by running the following commands in there:
    
        pnpm install
        pnpm build

4. Switch to this directory and run:

        pnpm link <dir of meshtastic/js>
        pnpm install

5. Start the server by running
        
        pnpm dev

6. The website can then be found at http://localhost:5173/

