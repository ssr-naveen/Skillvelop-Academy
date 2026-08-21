"use client";

import { useMemo, useState } from "react";
import MathText from "../../MathText";

export default function MatchingQuestion({ name, items }: { name: string; items: string[] }) {
  const pairs = useMemo(() => items.map(item => { const [left, ...right] = item.split("::"); return [left, right.join("::")] as [string, string]; }).filter(pair => pair[0] && pair[1]), [items]);
  const choices = useMemo(() => pairs.map(pair => pair[1]).reverse(), [pairs]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const answer = pairs.map(([left]) => `${left}=${selected[left] ?? ""}`).join(" | ");
  return <div className="matching-question"><input type="hidden" name={name} value={answer} />{pairs.map(([left], index) => <label key={left}><span><b>{index + 1}</b><MathText text={left}/></span><select required value={selected[left] ?? ""} onChange={event => setSelected(current => ({ ...current, [left]: event.target.value }))}><option value="">Choose a match</option>{choices.map(choice => <option value={choice} key={choice}>{choice}</option>)}</select></label>)}</div>;
}
