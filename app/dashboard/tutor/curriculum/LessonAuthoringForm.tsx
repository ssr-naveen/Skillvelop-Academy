"use client";

import { useRef, useState } from "react";
import { Bold, Braces, Heading2, Italic, Link2, List, ListOrdered, Sigma, Underline } from "lucide-react";
import MathText from "../../MathText";

type Course = { id: string; title: string };
type Chapter = { id: string; course_id: string; title: string; position: number };
type LessonFormat = "html" | "video" | "scorm" | "presentation" | "document" | "iframe" | "audio" | "image";

const mathTools = [
  ["Fraction", "\\frac{a}{b}"], ["Square root", "\\sqrt{x}"], ["Power", "x^{n}"], ["Subscript", "x_{n}"],
  ["Integral", "\\int_{a}^{b}"], ["Sum", "\\sum_{i=1}^{n}"], ["Limit", "\\lim_{x\\to a}"], ["Matrix", "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}"],
  ["Angle", "\\angle ABC"], ["Inequality", "x\\leq y"], ["Pi", "\\pi"], ["Infinity", "\\infty"],
] as const;

const formatHelp: Record<LessonFormat, { label: string; help: string; accept: string; url: boolean; upload: boolean }> = {
  html: { label: "Rich HTML lesson", help: "Write a formatted lesson with headings, lists, links and advanced maths.", accept: ".png,.jpg,.jpeg,.webp,.gif", url: false, upload: true },
  video: { label: "Video lesson", help: "Upload a video or paste a YouTube, Vimeo or direct video URL.", accept: "video/*", url: true, upload: true },
  scorm: { label: "SCORM package", help: "Upload a SCORM-compatible ZIP package for the lesson.", accept: ".zip", url: false, upload: true },
  presentation: { label: "Presentation", help: "Upload PPT, PPTX, ODP or PDF slides.", accept: ".ppt,.pptx,.odp,.pdf", url: false, upload: true },
  document: { label: "Document", help: "Upload PDF, Word, OpenDocument, spreadsheet or text files.", accept: ".pdf,.doc,.docx,.odt,.rtf,.txt,.csv,.xls,.xlsx,.ods", url: false, upload: true },
  iframe: { label: "Embedded webpage", help: "Paste a secure HTTPS embed URL from an approved learning tool.", accept: "", url: true, upload: false },
  audio: { label: "Audio lesson", help: "Upload audio or paste a direct audio URL.", accept: "audio/*", url: true, upload: true },
  image: { label: "Image lesson", help: "Upload diagrams, worksheets, infographics or other lesson imagery.", accept: "image/*", url: false, upload: true },
};

function ToolButton({ title, command, value, children, editor }: { title: string; command: string; value?: string; children: React.ReactNode; editor: React.RefObject<HTMLDivElement | null> }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => { event.preventDefault(); editor.current?.focus(); document.execCommand(command, false, value); }}>{children}</button>;
}

export default function LessonAuthoringForm({ courses, chapters }: { courses: Course[]; chapters: Chapter[] }) {
  const editor = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("<p>Introduce the concept, demonstrate a worked example, then invite the student to practise.</p>");
  const [format, setFormat] = useState<LessonFormat>("html");
  const [formula, setFormula] = useState("\\frac{a}{b}");
  const config = formatHelp[format];

  function syncHtml() { setHtml(editor.current?.innerHTML ?? ""); }
  function insertFormula() {
    editor.current?.focus();
    document.execCommand("insertText", false, `$${formula}$`);
    syncHtml();
  }
  function addLink() {
    const href = window.prompt("Paste the full HTTPS link");
    if (href && /^https?:\/\//i.test(href)) {
      editor.current?.focus();
      document.execCommand("createLink", false, href);
      syncHtml();
    }
  }

  return <form action="/api/lms" method="post" encType="multipart/form-data" className="lesson-authoring-form">
    <input type="hidden" name="action" value="create-lesson" />
    <input type="hidden" name="content" value={html} />
    <span className="panel-kicker">STEP 2</span><h2>Add lesson</h2>
    <label>Course<select name="courseId" required><option value="">Choose course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
    <label>Chapter<select name="chapterId" required><option value="">Choose chapter</option>{chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{courses.find(course => course.id === chapter.course_id)?.title} · Ch {chapter.position}: {chapter.title}</option>)}</select></label>
    <div className="form-row"><label>Lesson number<input name="position" type="number" min="1" defaultValue="1" /></label><label>Minutes<input name="duration" type="number" min="5" max="240" defaultValue="30" /></label></div>
    <label>Lesson title<input name="title" required placeholder="Fractions in everyday life" /></label>
    <label>Lesson summary<textarea name="summary" rows={3} required placeholder="A clear learner-facing description of this lesson." /></label>
    <label>Lesson format<select name="contentFormat" value={format} onChange={(event) => setFormat(event.target.value as LessonFormat)}>{Object.entries(formatHelp).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select><small>{config.help}</small></label>

    <section className="rich-lesson-editor" aria-label="Rich lesson editor">
      <header><div><strong>Lesson HTML & maths editor</strong><small>Formatting and formulas are saved inside the lesson.</small></div><span><Braces size={16} /> Rich content</span></header>
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Text formatting">
        <ToolButton title="Bold" command="bold" editor={editor}><Bold size={16} /></ToolButton>
        <ToolButton title="Italic" command="italic" editor={editor}><Italic size={16} /></ToolButton>
        <ToolButton title="Underline" command="underline" editor={editor}><Underline size={16} /></ToolButton>
        <ToolButton title="Heading" command="formatBlock" value="h2" editor={editor}><Heading2 size={16} /></ToolButton>
        <ToolButton title="Bullet list" command="insertUnorderedList" editor={editor}><List size={16} /></ToolButton>
        <ToolButton title="Numbered list" command="insertOrderedList" editor={editor}><ListOrdered size={16} /></ToolButton>
        <button type="button" onClick={addLink} title="Add link" aria-label="Add link"><Link2 size={16} /></button>
      </div>
      <div ref={editor} className="rich-editor-canvas" contentEditable suppressContentEditableWarning onInput={syncHtml} dangerouslySetInnerHTML={{ __html: html }} />
      <div className="lesson-math-workbench">
        <div><Sigma size={18} /><label>Advanced formula<input value={formula} onChange={(event) => setFormula(event.target.value)} aria-label="LaTeX formula" /></label><button type="button" onClick={insertFormula}>Insert into lesson</button></div>
        <div className="lesson-math-tools">{mathTools.map(([title, snippet]) => <button type="button" title={title} onClick={() => setFormula(snippet)} key={title}><MathText text={`$${snippet}$`} /></button>)}</div>
        <div className="lesson-math-preview"><small>FORMATTED PREVIEW</small><MathText text={`$${formula}$`} /></div>
      </div>
    </section>

    {config.url ? <label>{format === "iframe" ? "Secure embed URL" : `${config.label} URL (optional when uploading)`}<input name="embedUrl" type="url" placeholder={format === "video" ? "YouTube, Vimeo or direct MP4 URL" : format === "audio" ? "Direct MP3 or audio URL" : "https://..."} /></label> : null}
    {config.upload ? <label>{format === "html" ? "Inline lesson images (optional)" : `${config.label} upload`}<input name="mediaFiles" type="file" accept={config.accept} multiple={format === "html"} /></label> : null}
    <label className="check-row"><input type="checkbox" name="isUnlocked" /> Unlock lesson now</label>
    <button>Publish lesson →</button>
  </form>;
}
