"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Convert plain text to HTML with proper paragraphs
function formatPlainTextToHTML(text: string): string {
  if (!text) return "";
  
  // Check if content already has HTML tags
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(text);
  if (hasHTMLTags) {
    return text; // Already formatted, return as-is
  }
  
  let processedText = text;
  
  // Step 1: Detect ALL CAPS sections that look like headers (e.g., "HISTORICAL OVERVIEW")
  // Add double line breaks before them
  processedText = processedText.replace(/([.!?])\s+([A-Z][A-Z\s]{3,}[A-Z])\s+([A-Z])/g, '$1\n\n<h2>$2</h2>\n\n$3');
  
  // Step 2: If no double line breaks exist, intelligently split long text
  if (!processedText.includes('\n\n')) {
    // Split at sentence boundaries followed by capital letters (new paragraph indicators)
    // Look for: ". Capital" or "! Capital" or "? Capital"
    processedText = processedText.replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2');
  }
  
  // Step 3: Split by double line breaks (paragraph breaks)
  const paragraphs = processedText.split(/\n\n+/);
  
  // Step 4: Wrap each paragraph in appropriate tags
  const html = paragraphs
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      
      // Check if it's already a heading tag
      if (trimmed.startsWith('<h2>')) {
        return trimmed;
      }
      
      // Replace single line breaks with <br>
      const withBreaks = trimmed.replace(/\n/g, "<br>");
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join("");
  
  return html || `<p>${text}</p>`;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something amazing...",
}: RichTextEditorProps) {
  const formattedContent = formatPlainTextToHTML(content);
  
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: formattedContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const newFormattedContent = formatPlainTextToHTML(content);
      editor.commands.setContent(newFormattedContent);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1">
        {/* Text Styles */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor.isActive("bold")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Bold (⌘B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 rounded text-sm italic font-medium transition-colors ${
            editor.isActive("italic")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Italic (⌘I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-3 py-1.5 rounded text-sm line-through transition-colors ${
            editor.isActive("strike")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Strikethrough"
        >
          S
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => {
            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;
            
            if (hasSelection) {
              // Get selected text
              const selectedText = editor.state.doc.textBetween(from, to);
              
              // Delete selection and insert heading
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent(`<h1>${selectedText}</h1>`)
                .run();
            } else {
              // Just toggle the current block
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            }
          }}
          className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
            editor.isActive("heading", { level: 1 })
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => {
            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;
            
            if (hasSelection) {
              const selectedText = editor.state.doc.textBetween(from, to);
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent(`<h2>${selectedText}</h2>`)
                .run();
            } else {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }
          }}
          className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
            editor.isActive("heading", { level: 2 })
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => {
            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;
            
            if (hasSelection) {
              const selectedText = editor.state.doc.textBetween(from, to);
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent(`<h3>${selectedText}</h3>`)
                .run();
            } else {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
          className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
            editor.isActive("heading", { level: 3 })
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive("bulletList")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive("orderedList")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Quote & Code */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive("blockquote")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Quote"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
            editor.isActive("codeBlock")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Code Block"
        >
          {"</>"}
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Paragraph & Divider */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive("paragraph")
              ? "bg-foreground text-background"
              : "hover:bg-muted"
          }`}
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors"
          title="Horizontal Line"
        >
          —
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (⌘Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (⌘⇧Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
