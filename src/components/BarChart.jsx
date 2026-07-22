// The scaled bar chart shared by the DataGraph answer widget and the question
// card. Question-card use: modes like mostLeastIdentify ask about a chart but
// answer through choice buttons, so the chart has to live with the question.
export default function BarChart({ bars, theme }) {
  const max = Math.max(1, ...(bars || []).map((b) => b.value));
  return (
    <div className="w-full flex items-end justify-center gap-3 h-40 px-2">
      {(bars || []).map((b) => (
        <div key={b.label} className="flex flex-col items-center justify-end gap-1 flex-1">
          <span className={`text-xs font-bold ${theme.textSecondary}`}>{b.value}</span>
          <div
            className="w-full max-w-[40px] rounded-t-md bg-sky-400"
            style={{ height: `${(b.value / max) * 110 + 6}px` }}
          />
          <span className={`text-[10px] font-bold ${theme.textSecondary} text-center`}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
