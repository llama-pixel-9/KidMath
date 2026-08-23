/** Number badge on an answer option; CSS shows it only on hover-capable,
 * fine-pointer devices (desktop/laptop), so touch kids never see it. */
export default function KeyHint({ k }) {
  return (
    <span className="key-hint" aria-hidden="true">
      {k}
    </span>
  );
}
