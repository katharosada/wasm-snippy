import React, { useCallback, useEffect } from 'react'
import { Editor, SupportedLanguage } from './Editor'

function CreateBotPage(props: { setTitle: (title: string) => void }) {
  const { setTitle } = props

  useEffect(() => {
    setTitle('Create Bot')
  }, [])

  const onEdit = useCallback(() => {
    console.log('edited')
  }, [])

  return (
    <div>
      <h1>Create Bot</h1>
      <Editor language={SupportedLanguage.PYTHON} initialContent="print('Hello')" onEdit={onEdit} />
    </div>
  )
}

export default CreateBotPage
