import { useEffect, useRef } from 'react';
import SimpleMDE from 'simplemde';

export default function MarkdownEditorSimple({ value = '', onChange, height = 500 }) {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!textareaRef.current || editorRef.current) return;

    // Load CSS from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/simplemde@1.11.2/dist/simplemde.min.css';
    document.head.appendChild(link);

    // Create SimpleMDE instance with plain text editing (no preview styling)
    editorRef.current = new SimpleMDE({
      element: textareaRef.current,
      initialValue: value,
      spellChecker: false,
      status: false,
      autofocus: false,
      parsingConfig: {
        allowAtxHeaderWithoutSpace: true,
        strikethrough: true,
        underscoresBreakWords: false,
      },
      renderingConfig: {
        codeSyntaxHighlighting: false,
      },
      toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'code',
        {
          name: 'code-block',
          action: function(editor) {
            const cm = editor.codemirror;
            const startPoint = cm.getCursor('start');
            const endPoint = cm.getCursor('end');
            cm.replaceSelection('\n\`\`\`\n\`\`\`\n');
            cm.setCursor(startPoint.line + 2, 0);
            cm.focus();
          },
          className: 'fa fa-file-code-o',
          title: 'Insert Code Block',
        },
        '|',
        'link', 'image', '|',
        'guide'
      ],
      // Disable CodeMirror's markdown mode styling by using plain text mode
      previewRender: function(plainText) {
        return plainText;
      },
    });

    // Override CodeMirror mode to plain text for no syntax highlighting
    editorRef.current.codemirror.setOption('mode', 'text');

    // Set height
    editorRef.current.codemirror.getWrapperElement().style.height = `${height}px`;

    // Handle changes
    editorRef.current.codemirror.on('change', () => {
      onChange?.(editorRef.current.value());
    });

    return () => {
      link.remove();
      if (editorRef.current) {
        try {
          editorRef.current.toTextArea();
        } catch (err) {
          // Editor may already be cleaned up during navigation
          console.log('Editor cleanup error (safe to ignore):', err.message);
        }
        editorRef.current = null;
      }
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.value() !== value) {
      editorRef.current.value(value);
    }
  }, [value]);

  return <textarea ref={textareaRef} style={{ display: 'none' }} defaultValue={value} />;
}
