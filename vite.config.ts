import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{host:process.env.VITE_HOST||'127.0.0.1',watch:{ignored:['**/private/**','**/.data/**','**/preview/**','**/node_modules/**']},proxy:{'/api':'http://127.0.0.1:3001'}}});
