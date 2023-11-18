import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import {
  LinkProps as RouterLinkProps,
  Outlet,
  NavLink,
} from 'react-router-dom';

const drawerWidth = 200;

const Link = React.forwardRef<HTMLAnchorElement, RouterLinkProps>(function Link(
  itemProps,
  ref,
) {
  return <NavLink ref={ref} {...itemProps} style={({ isActive, isPending }) => {
    return {
      fontWeight: isActive ? "bold" : "inherit",
    };
  }}role={undefined} />;
});

export default function DrawerAppBar(props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { title } = props

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar variant='dense'>
        <Typography variant="h1" fontSize={'14pt'} noWrap component="div" sx={{mr: 2}}>
          ✂️ Snippy
        </Typography>
      </Toolbar>
      <Divider/>
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to={'/'} onClick={handleDrawerToggle} sx={{pl: 3}}>
            Tournament
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to={'/create'} onClick={handleDrawerToggle} sx={{pl: 3}}>
            Create Bot
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to={'/leaderboard'} onClick={handleDrawerToggle} sx={{pl: 3}}>
            Leaderboard
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar variant="dense">
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h1" fontSize={'16pt'} noWrap component="div">
            { title }
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth},
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar variant='dense'/>
        <Outlet/>
      </Box>
    </Box>
  );
}
