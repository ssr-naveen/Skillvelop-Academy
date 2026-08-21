"use client";

import { useMemo, useState } from "react";
import { Braces, CheckCircle2, ImagePlus, ListOrdered, Plus, Rows3, Shuffle, Sparkles, Trash2, Type } from "lucide-react";
import { MathComposer } from "../../MathComposer";

type QuestionType = "mcq" | "fill_blank" | "one_word" | "drag_drop" | "order" | "matching";
const typeOptions: { value: QuestionType; label: string; hint: string; icon: typeof CheckCircle2 }[] = [
  { value: "mcq", label: "Multiple choice", hint: "Options with one correct answer", icon: CheckCircle2 },
  { value: "fill_blank", label: "Fill in the blank", hint: "Sentence with a missing answer", icon: Type },
  { value: "one_word", label: "Short answer", hint: "One word or short exact answer", icon: Braces },
  { value: "matching", label: "Match pairs", hint: "Connect items from two columns", icon: Shuffle },
  { value: "order", label: "Correct order", hint: "Arrange steps in sequence", icon: ListOrdered },
  { value: "drag_drop", label: "Drag & drop", hint: "Move items into the right order", icon: Rows3 },
];
export default function QuizQuestionBuilder({ quizId, nextPosition }: { quizId: string; nextPosition: number }) {
  const [type, setType] = useState<QuestionType>("mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [pairs, setPairs] = useState([["", ""], ["", ""], ["", ""]]);
  const [answer, setAnswer] = useState("");
  const [correctIndex, setCorrectIndex] = useState(-1);

  const serialized = useMemo(() => {
    if (type === "matching") return pairs.filter(([left, right]) => left.trim() && right.trim()).map(([left, right]) => `${left.trim()}::${right.trim()}`);
    if (type === "mcq" || type === "order" || type === "drag_drop") return options.map(item => item.trim()).filter(Boolean);
    return [];
  }, [type, options, pairs]);
  const correctAnswer = type === "mcq" ? options[correctIndex]?.trim() ?? "" : type === "matching"
    ? pairs.filter(([left, right]) => left.trim() && right.trim()).map(([left, right]) => `${left.trim()}=${right.trim()}`).join(" | ")
    : type === "order" || type === "drag_drop" ? serialized.join(" | ")
    : answer;

  function updateOption(index: number, value: string) { setOptions(items => items.map((item, i) => i === index ? value : item)); }
  function addOption() { setOptions(items => [...items, ""]); }
  function updatePair(index: number, side: 0 | 1, value: string) { setPairs(items => items.map((pair, i) => i === index ? pair.map((item, j) => j === side ? value : item) as [string, string] : pair)); }

  return <form className="question-builder" action="/api/lms" method="post" encType="multipart/form-data">
    <input type="hidden" name="action" value="add-quiz-question" />
    <input type="hidden" name="quizId" value={quizId} />
    <input type="hidden" name="type" value={type} />
    <input type="hidden" name="options" value={serialized.join("\n")} />
    <input type="hidden" name="answer" value={correctAnswer} />

    <section className="builder-section">
      <div className="builder-section-head"><span>1</span><div><h4>Choose the interaction</h4><p>Each question type has fields designed for that activity.</p></div></div>
      <div className="question-type-grid">{typeOptions.map(item => { const Icon = item.icon; return <button className={type === item.value ? "active" : ""} type="button" onClick={() => { setType(item.value); setAnswer(""); setCorrectIndex(-1); }} key={item.value}><Icon size={18} /><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>; })}</div>
    </section>

    <section className="builder-section">
      <div className="builder-section-head"><span>2</span><div><h4>Write the question</h4><p>Add maths, instructions, and an optional visual.</p></div></div>
      <input type="hidden" name="prompt" value={prompt}/><MathComposer value={prompt} onChange={setPrompt} label="Question prompt" multiline required placeholder={type === "fill_blank" ? "Example: The value of a fraction expression is ___." : "What should the learner solve or identify?"}/>
      <label className="image-upload"><ImagePlus size={22} /><span><strong>Add a question image</strong><small>PNG, JPG, WebP or GIF · up to 5 MB</small></span><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
    </section>

    <section className="builder-section">
      <div className="builder-section-head"><span>3</span><div><h4>Build the answer</h4><p>{typeOptions.find(item => item.value === type)?.hint}</p></div></div>
      {type === "mcq" && <div className="answer-editor"><div className="option-editor-list">{options.map((option, index) => <div className="option-editor math-option-editor" key={index}><span>{String.fromCharCode(65 + index)}</span><MathComposer value={option} onChange={value=>updateOption(index,value)} required={index<2} compact placeholder={`Option ${index + 1} — text or maths`}/>{options.length > 2 && <button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => { setOptions(items => items.filter((_, i) => i !== index)); setCorrectIndex(-1); }}><Trash2 size={16} /></button>}</div>)}</div><button className="add-row" type="button" onClick={addOption}><Plus size={16} /> Add option</button><label className="builder-label">Correct option<select value={correctIndex} onChange={event => setCorrectIndex(Number(event.target.value))} required><option value={-1}>Select the correct answer</option>{options.map((option, index) => option.trim() ? <option value={index} key={`${option}-${index}`}>{String.fromCharCode(65 + index)} · {option}</option> : null)}</select></label></div>}
      {(type === "fill_blank" || type === "one_word") && <div><MathComposer value={answer} onChange={setAnswer} label="Correct answer" required compact placeholder={type === "fill_blank" ? "Exact text or equation for the blank" : "Expected short answer"}/><small>Answers are checked without case sensitivity.</small></div>}
      {(type === "order" || type === "drag_drop") && <div className="answer-editor"><p className="editor-guidance">Enter the items in the correct final order. Skillvelop will shuffle them for the learner.</p>{options.map((option, index) => <div className="option-editor math-option-editor" key={index}><span>{index + 1}</span><MathComposer value={option} onChange={value=>updateOption(index,value)} required={index<2} compact placeholder={type === "order" ? `Step ${index + 1}` : `Movable item ${index + 1}`}/>{options.length > 2 && <button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => setOptions(items => items.filter((_, i) => i !== index))}><Trash2 size={16} /></button>}</div>)}<button className="add-row" type="button" onClick={addOption}><Plus size={16} /> Add item</button></div>}
      {type === "matching" && <div className="answer-editor"><div className="matching-head"><span>LEFT ITEM</span><span>MATCHES WITH</span><span /></div>{pairs.map((pair, index) => <div className="matching-editor-row math-matching-row" key={index}><MathComposer value={pair[0]} onChange={value=>updatePair(index,0,value)} compact required={index<2} placeholder={`Item ${index + 1}`}/><MathComposer value={pair[1]} onChange={value=>updatePair(index,1,value)} compact required={index<2} placeholder={`Match ${index + 1}`}/><button type="button" aria-label={`Remove pair ${index + 1}`} onClick={() => setPairs(items => items.filter((_, i) => i !== index))}><Trash2 size={16}/></button></div>)}<button className="add-row" type="button" onClick={() => setPairs(items => [...items, ["", ""]])}><Plus size={16}/> Add matching pair</button></div>}
    </section>

    <footer className="builder-footer"><div className="form-row"><label>Points<input name="points" type="number" min="1" defaultValue="10" /></label><label>Question number<input name="position" type="number" min="1" defaultValue={nextPosition} /></label></div><button className="publish-question" type="submit" disabled={!prompt.trim() || !correctAnswer.trim()}><Sparkles size={17} /> Add interactive question</button></footer>
  </form>;
}
