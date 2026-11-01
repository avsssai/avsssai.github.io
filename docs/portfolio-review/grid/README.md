# White grid — current local prototype

This is the replacement direction requested after the paper-cut homepage: a white background, a real Three.js grid, bright comic Imagination lettering, no technology objects, and a custom pointing-finger cursor.

Click an empty spot to place the cartoon red X and show a dotted route. The character walks there and stays. A new click changes the destination from its current position; it does not return home automatically. The cream peel entrance is retained.

**Preview only — not deployed.** These images were captured from the current local implementation at <http://127.0.0.1:4332/> in `portfolio-grid`, branch `poteto/portfolio-grid`. This gallery-only branch still contains historical application source; it is not the source of the screenshots. Publishing these images does not replace the live site.

## Desktop

![White grid and colourful comic Imagination lettering](desktop.png)

## Desktop after walking to a clicked destination

![Character stopped at the red X with the dotted route left visible](arrived.png)

## Phone-sized viewport after arrival

![Phone-sized white grid with the character standing on the red X](phone.png)

The phone view is desktop Chrome at 390×844 with touch emulation, not a physical phone. The desktop view is 1440×900. Native system cursors are not captured in these browser screenshots; the actual local SVG used for the fine-pointer cursor is shown separately below (hotspot 11,3).

![Custom pointing-finger cursor](finger.svg)
