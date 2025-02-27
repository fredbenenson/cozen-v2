# TODO:

## cli.ts
  * Use actual 52 card deck, not random numbers (line 95 in cli.ts):

      // Determine suit based on color
      const suit = color === Color.Red ?
          (Math.random() < 0.5 ? Suit.Hearts : Suit.Diamonds) :
          (Math.random() < 0.5 ? Suit.Clubs : Suit.Spades);

* Why isn't it saving black's positions?

* Fix formatting (maybe use [ _ ] instead of the single dot / ascii character idea?)
