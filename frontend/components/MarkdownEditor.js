import { useEffect, useRef } from 'react';
import SimpleMDE from 'easymde';
import 'easymde/dist/easymde.min.css';

export default function MarkdownEditorComponent({ value, onChange, height = '500px' }) {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && !editorRef.current) {
      // Initialize SimpleMDE
      editorRef.current = new SimpleMDE({
        element: textareaRef.current,
        initialValue: value || '',
        spellChecker: false,
        autosave: false,
        status: false,
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
        renderingConfig: {
          singleLineBreaks: false,
          codeSyntaxHighlighting: true,
        },
        shortcuts: {
          drawTable: 'Cmd-Alt-T'
        },
        placeholder: 'Type here... Markdown is supported!',
        autofocus: false,
      });

      // Set up change handler
      editorRef.current.codemirror.on('change', () => {
        const markdown = editorRef.current.value();
        onChange(markdown);
      });

      // Set height
      if (editorRef.current.codemirror) {
        editorRef.current.codemirror.getWrapperElement().style.height = height;
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
      }
    };
  }, []);

  // Update value when prop changes
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentValue = editorRef.current.value();
      if (currentValue !== value) {
        editorRef.current.value(value);
      }
    }
  }, [value]);

  return (
    <div style={styles.container}>
      <textarea ref={textareaRef} style={styles.hidden} />
    </div>
  );
}

const styles = {
  container: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  hidden: {
    display: 'none',
  },
};
