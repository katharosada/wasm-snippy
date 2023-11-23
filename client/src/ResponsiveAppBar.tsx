import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuIcon from '@mui/icons-material/Menu'
import MenuItem from '@mui/material/MenuItem'
import React, { useState } from 'react'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

function SnippyLogo(props: { sx: any }) {
  return (
    <Typography
      variant="h6"
      noWrap
      sx={{
        fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
        fontWeight: 600,
        color: 'inherit',
        textDecoration: 'none',
        pb: 0.5,
        ...props.sx,
      }}
    >
      ✂️ Snippy
    </Typography>
  )
}

function ResponsiveAppBar(props: { pages: string[]; setPage: (page: string) => void }) {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null)
  const { pages, setPage } = props

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget)
  }

  const selectPage = (page: string) => {
    setPage(page)
    handleCloseNavMenu()
  }

  const handleCloseNavMenu = () => {
    setAnchorElNav(null)
  }

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <SnippyLogo sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }} />
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',

                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',

                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={() => selectPage(page)}>
                  <Typography textAlign="center">{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <SnippyLogo sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }} />

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button key={page} onClick={() => selectPage(page)} sx={{ my: 2, color: 'white', display: 'block' }}>
                {page}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}

export default ResponsiveAppBar
