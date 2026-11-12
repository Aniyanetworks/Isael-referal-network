import './App.css'
import { RouterProvider } from "react-router-dom";
import router from "./route/Router";
import { AuthProvider } from "./context/AuthContext";
import { InstallPromptProvider } from "./context/InstallPromptContext";
import { InstallPrompt } from "./components/ui/InstallPrompt";

function App() {
  return (
    <AuthProvider>
      <InstallPromptProvider>
        <RouterProvider router={router} />
        <InstallPrompt />
      </InstallPromptProvider>
    </AuthProvider>
  )
}

export default App
