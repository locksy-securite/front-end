import './App.css'
import { ThemeProvider } from "./context/ThemeProvider"; // ton provider
import ThemeSelector from "./components/ThemeSelector"; // ton dropdown DaisyUI

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200">
        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">Locksy • Test DaisyUI</h1>

        {/* Theme selector */}
        <ThemeSelector />

        {/* DaisyUI components */}
        <div className="card w-96 bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h2 className="card-title">Composants DaisyUI</h2>

            <input
              type="email"
              placeholder="Votre email"
              className="input mb-4"
            />

            <button className="btn btn-primary mb-2">Bouton primaire</button>
            <button className="btn btn-secondary mb-2">Bouton secondaire</button>
            <button className="btn btn-accent mb-2">Bouton accent</button>

            <div className="alert alert-info mt-4">
              <span>Message d'information (test DaisyUI)</span>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
