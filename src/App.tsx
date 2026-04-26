import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Device from './pages/Device'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/device/:username" element={<Device />} />
    </Routes>
  )
}
