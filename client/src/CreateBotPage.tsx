import Button from '@mui/material/Button'
import React, { FormEvent, useCallback, useEffect } from 'react'
import TextField from '@mui/material/TextField'
import { Editor, SupportedLanguage } from './Editor'

function CreateBotPage(props: { setTitle: (title: string) => void }) {
  const { setTitle } = props
  const [content, setContent] = React.useState("print('Hello')")

  useEffect(() => {
    setTitle('Create Bot')
  }, [])

  const onEdit = useCallback((content: string) => {
    console.log('edited')
    setContent(content)
  }, [])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    const botname = formData.get('botname')
    fetch('/api/bots/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botname, content }),
    })
  }

  return (
    <div>
      <h1>Create Bot</h1>
      <Editor language={SupportedLanguage.PYTHON} initialContent="print('Hello')" onEdit={onEdit} />
      <form onSubmit={onSubmit}>
        <TextField id="botname" name="botname" placeholder="Bot Name" defaultValue={''} variant="outlined" />
        <div>
          <Button variant="contained" type="submit">
            Submit
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateBotPage
