import { Box, Button, Modal, TextField, Typography } from '@mui/material'
import { FormEvent, useRef, useState } from 'react'

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  maxWidth: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
}

export default function UploadWasmModal(props: { open: boolean; handleClose: () => void }) {
  const { open, handleClose } = props
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null as string | null)
  const [selectedFileName, setSelectedFileName] = useState(null as string | null)
  const uploadInputElement = useRef<HTMLInputElement | null>(null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    // formData.append('file', uploadInputElement.current?.files?.[0] as File)
    setSubmitting(true)
    setError(null)
    fetch('/api/upload_wasm', {
      method: 'POST',
      body: formData,
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

  const handleselectedFile = (event: any) => {
    setSelectedFileName(event.target.files[0].name)
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
          <input
            ref={uploadInputElement}
            accept="*/*"
            className={''}
            style={{ display: 'none' }}
            id="raised-button-file"
            name="wasm_file"
            type="file"
            onChange={handleselectedFile}
          />
          <p style={{ fontFamily: 'monospace', fontSize: '12pt' }}>{selectedFileName}</p>
          <label htmlFor="raised-button-file">
            <Button variant="contained" component="span">
              {selectedFileName ? 'Change file' : 'Select file'}
            </Button>
          </label>
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
