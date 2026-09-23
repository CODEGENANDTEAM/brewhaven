// Small line drawings for the roast tickets (no emoji, no image files).
// "bean" is filled with the roast tone; the rest are drawn in the text colour.
// They are decoration: the product name next to them says what they are.

const LINES = {
  cone: (
    <>
      <path d="M26 28h68L76 70H44z" />
      <path d="M22 28h76" />
      <path d="M52 36l4 26M68 36l-4 26" />
      <path d="M40 76h40" />
      <path d="M44 82h32l5 22H39z" />
      <path d="M81 88c8 0 8 12 0 12" />
      <path d="M60 71v5" strokeDasharray="2 3" />
    </>
  ),
  press: (
    <>
      <circle cx="60" cy="12" r="4" />
      <path d="M60 16v34" />
      <path d="M36 30h48" />
      <path d="M40 30v70h40V30" />
      <path d="M44 50h32" />
      <path d="M80 40h10v48H80" />
      <path d="M34 104h52" />
      <path d="M40 70h40" strokeDasharray="3 4" />
    </>
  ),
  mug: (
    <>
      <path d="M30 42h54v48c0 8-6 12-12 12H42c-6 0-12-4-12-12z" />
      <path d="M84 54h6c7 0 10 4 10 10v8c0 6-3 10-10 10h-6" />
      <path d="M46 16c-4 5 4 9 0 14M58 12c-4 5 4 9 0 14M70 16c-4 5 4 9 0 14" />
      <circle cx="57" cy="70" r="9" />
    </>
  ),
  tote: (
    <>
      <path d="M26 46h68l-5 60H31z" />
      <path d="M44 46V34c0-10 6-14 16-14s16 4 16 14v12" />
      <path d="M50 46V36c0-6 3-8 10-8s10 2 10 8v10" />
      <path d="M48 70h24v14H48z" />
    </>
  ),
  generic: <circle cx="60" cy="62" r="32" />,
};

export default function Glyph({ name, tone }) {
  if (name === "bean") {
    return (
      <svg className="glyph glyph-bean" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <g transform="rotate(-28 60 60)">
          <ellipse cx="60" cy="60" rx="30" ry="42" fill={tone || "currentColor"} className="bean-body" />
          <path d="M60 20c-12 14 12 26 0 40s12 26 0 40" className="bean-crease" />
        </g>
      </svg>
    );
  }
  return (
    <svg className="glyph glyph-line" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      {LINES[name] || LINES.generic}
    </svg>
  );
}
