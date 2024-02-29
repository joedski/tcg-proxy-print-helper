# TCG Proxy Print Helper

Minimal proxy print helper for printing out cards. It's kinda crusty.

It adds a stripy border to make it obvious they're placeholders, which I like having when dealing with placeholders for DFCs.

Currently only for MTG but there's no reason it couldn't be extended for other TCGs, provided you can get a nice card DB for them that points to images in a CDN. Or put in the work to download them yourself and make your local disk the CDN, that works too.

## Getting Started

1. Download [a card DB from Scryfall](https://scryfall.com/docs/api/bulk-data), and maybe consider chipping in a donation to support them.
   1. I recommend either "Unique Artwork" or "Default Cards".
2. Save that to the `data/` folder.
3. Update `CARD_DB_PATH` in `server/index.js`. Told you this thing is kinda crusty.
4. `npm start`
5. Access localhost on the specified port, which by default is `3030`, so `http://localhost:3030` should open up the app.
