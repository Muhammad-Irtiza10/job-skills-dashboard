// src/App.tsx
import React, { createContext, useContext, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster as Sonner } from "@/components/ui/sonner"

import Index from "./pages/Index"
import StudentDashboard from "./pages/StudentDashboard"
import FacultyDashboard from "./pages/FacultyDashboard"
import Profile from "./pages/Profile"
import NotFound from "./pages/NotFound"

// 1) Spin up react-query
const queryClient = new QueryClient()

// 2) Basic AuthContext for holding your token in memory (and localStorage)
interface AuthContextType {
  token: string | null
  setToken: (t: string | null) => void
}
const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
})
export const useAuth = () => useContext(AuthContext)

// 3) A wrapper that redirects to "/" if you’re not logged in
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

const App: React.FC = () => {
  // initialise token from localStorage (so refresh survives)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("apiToken")
  )

  // whenever it changes, write it back:
  const handleSetToken = (t: string | null) => {
    if (t) localStorage.setItem("apiToken", t)
    else localStorage.removeItem("apiToken")
    setToken(t)
  }

  return (
    <AuthContext.Provider value={{ token, setToken: handleSetToken }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* public */}
              <Route path="/" element={<Index />} />
              {/* protected: must be logged in */}
              <Route
                path="/student-dashboard"
                element={
                  <ProtectedRoute>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty-dashboard"
                element={
                  <ProtectedRoute>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              {/* catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  )
}

export default App
