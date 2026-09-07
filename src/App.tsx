import { DashboardScreen } from './components/DashboardScreen'
import { HomeScreen } from './components/HomeScreen'
import { TaskScreen } from './components/TaskScreen'
import { TaskSelectorScreen } from './components/TaskSelectorScreen'
import { useSessionStore } from './store/sessionStore'

export function App() {
  const screen = useSessionStore((state) => state.screen)

  if (screen === 'home') return <HomeScreen />
  if (screen === 'selector') return <TaskSelectorScreen />
  if (screen === 'dashboard') return <DashboardScreen />
  return <TaskScreen />
}
