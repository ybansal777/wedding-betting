// Fixed, non-interactive house lights. Sits behind every page so the
// background is never a flat fill — orbs re-tint from the same theme tokens
// as the rest of the UI, so a Host's preset carries through automatically.
// `.motif` is the one piece that isn't just re-tinted: each [data-preset] in
// globals.css swaps in its own line-art watermark (rings, dice, a balloon,
// a disco ball, a card, a sun) so every theme reads as its own room, not the
// same layout in a different accent colour.
export default function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <span className="orb orb-a" />
      <span className="orb orb-b" />
      <span className="orb orb-c" />
      <span className="motif" />
      <span className="grain" />
    </div>
  );
}
