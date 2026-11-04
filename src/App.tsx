import './App.css'
import { RouterProvider } from "react-router-dom";
import router from "./route/Router";
import { AuthProvider } from "./context/AuthContext";
import { InstallPrompt } from "./components/ui/InstallPrompt";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <InstallPrompt />
    </AuthProvider>
  )
}

export default App
