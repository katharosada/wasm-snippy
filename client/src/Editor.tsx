import './Editor.css'
import './monacoWorkers'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { useEffect, useRef, useState } from 'react'

export enum SupportedLanguage {
  PYTHON = 'python',
}

export const Editor = (props: {
  language: SupportedLanguage
  initialContent: string
  onEdit: (newContent: string) => void
}) => {
  const { language, initialContent, onEdit } = props
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoEl = useRef(null)

  useEffect(() => {
    if (editor) {
      const listener = editor.onDidChangeModelContent(() => {
        onEdit(editor.getValue())
      })
      return () => {
        listener.dispose()
      }
    }
  }, [editor, onEdit])

  useEffect(() => {
    if (monacoEl) {
      setEditor((editor) => {
        if (editor) return editor

        return monaco.editor.create(monacoEl.current!, {
          value: initialContent,
          language: language,
          automaticLayout: true,
        })
      })
    }

    return () => editor?.dispose()
  }, [monacoEl.current])

  return (
    <div>
      <div className="Editor" ref={monacoEl}></div>
    </div>
  )
}
