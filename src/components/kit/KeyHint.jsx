/** Number badge on an answer option; CSS shows it only on hover-capable,
 * fine-pointer devices (desktop/laptop), so touch kids never see it.
 * `small` tucks a smaller badge into the corner, for buttons too narrow for
 * the full one to clear their label (the disc mat's − and +); `inline` sets
 * it in the text, before a label that fills its button (the mat's trades). */
export default function KeyHint({ k, small = false, inline = false }) {
  const cls = inline ? "key-hint key-hint--small key-hint--inline" : small ? "key-hint key-hint--small" : "key-hint";
  return (
    <span className={cls} aria-hidden="true">
      {k}
    </span>
  );
}
