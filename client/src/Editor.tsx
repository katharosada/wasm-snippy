import { useRef, useState, useEffect } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './monacoWorkers';
import './Editor.css';

export enum SupportedLanguage {
    PYTHON = 'python',
}

export const Editor = (props: {language: SupportedLanguage, initialContent: string, onEdit: (newContent: string) => void}) => {
    const { language, initialContent } = props;
	const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
	const monacoEl = useRef(null);

	useEffect(() => {
		if (monacoEl) {
			setEditor((editor) => {
				if (editor) return editor;

				return monaco.editor.create(monacoEl.current!, {
					value: initialContent,
					language: language
				});
			});
		}

		return () => editor?.dispose();
	}, [monacoEl.current]);

	return <div className="Editor" ref={monacoEl}></div>;
};