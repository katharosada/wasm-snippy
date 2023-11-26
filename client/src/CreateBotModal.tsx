import { Box, Button, Modal, TextField, Typography } from '@mui/material'
import { FormEvent, useState } from 'react'

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
}

export default function CreateBotModal(props: { open: boolean; handleClose: () => void; content: string }) {
  const { open, handleClose, content } = props
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null as string | null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    const botname = formData.get('botname') as string
    const runType = 'Python'
    setSubmitting(true)
    setError(null)
    fetch('/api/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: botname, botcode: content, run_type: runType }),
    }).then((response) => {
      if (response.ok) {
        console.log(response)
        handleClose()
      } else if (response.status === 400) {
        response.json().then((json) => {
          setError(json)
        })
      } else {
        setError('Unexpected Error! Request returned status: ' + response.status)
      }
      setSubmitting(false)
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <form onSubmit={onSubmit}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Give your bot a name
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            Bot names must be unique.
          </Typography>
          <TextField id="botname" name="botname" placeholder="Bot Name" defaultValue={''} variant="outlined" />
          <br />
          <Typography sx={{ mt: 2, color: 'red' }}>{error}&nbsp;</Typography>
          <Button type="submit" variant="contained" color="secondary" disabled={submitting}>
            Enter tournament
          </Button>
        </form>
      </Box>
    </Modal>
  )
}
