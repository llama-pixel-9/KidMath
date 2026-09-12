import { useMemo, useState, useRef, useEffect } from "react";
import QuestionStage from "../components/QuestionStage.jsx";
import { buildBankQuestion, checkAnswer } from "../mathEngine";
import { useTheme } from "../useTheme";

// Renders one admin item exactly as the session would: same QuestionStage,
// same theme, phone-width column. Interactive — answer it and the feedback
// plays (1.2s correct / 2s wrong, the session timings), then it resets.

function toBankItem(item) {
  return {
    itemId: item.itemId,
    modeId: item.modeId,
    itemFamily: item.itemFamily || "application",
    subskill: item.subskill,
    structureType: item.structureType,
    levelRange: [Number(item.levelMin), Number(item.levelMax)],
    reviewStatus: item.reviewStatus,
    question: item.payload,
  };
}

export default function QuestionPreview({ item }) {
  const { theme } = useTheme();
  const [feedback, setFeedback] = useState(null);
  const [revealAnswer, setRevealAnswer] = useState(null);
  const [shakenChoice, setShakenChoice] = useState(null);
  const [round, setRound] = useState(0);
  const timer = useRef(null);

  const built = useMemo(() => {
    try {
      return { question: buildBankQuestion(toBankItem(item)), error: null };
    } catch (e) {
      return { question: null, error: e?.message || String(e) };
    }
    // Re-build when the payload (chosen wording) changes, and per round so
    // shuffled choices re-roll like a fresh serve would.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, round]);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setFeedback(null);
    setRevealAnswer(null);
    setShakenChoice(null);
  }, [item]);

  const { question, error } = built;
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">
        Can't build this item as a question: {error}
      </div>
    );
  }

  const onSubmit = (value) => {
    if (feedback) return;
    const correct = checkAnswer(question, value);
    setFeedback(correct ? "correct" : "wrong");
    setRevealAnswer(question.answer);
    if (!correct) setShakenChoice(value);
    timer.current = setTimeout(() => {
      setFeedback(null);
      setRevealAnswer(null);
      setShakenChoice(null);
      setRound((r) => r + 1);
    }, correct ? 1200 : 2000);
  };

  const choices = question.choices || [];
  const numericChoices =
    choices.length > 0 && choices.every((c) => /^-?\d+(\.\d+)?$/.test(String(c)));
  const questionKey = `${item.itemId}:${round}`;

  return (
    <div className="bg-cream rounded-2xl p-3 text-ink">
      <QuestionStage
        question={question}
        questionKey={questionKey}
        theme={theme}
        modeColor={theme.modeColors?.[item.modeId] || "bg-seafoam"}
        feedback={feedback}
        revealAnswer={revealAnswer}
        shakenChoice={shakenChoice}
        answerType={question.answerType || "choice"}
        numericChoices={numericChoices}
        onSubmit={onSubmit}
        stacked
      />
      {feedback === "wrong" && (
        <p className="text-center text-sm font-bold text-deep-teal mt-2">Answer: {String(question.answer)}</p>
      )}
    </div>
  );
}
