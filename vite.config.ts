import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base '/paginazilla/' pra funcionar em https://<usuario>.github.io/paginazilla/ —
// ajuste se o nome do repositório no GitHub for diferente.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/paginazilla/' : '/',
}))
