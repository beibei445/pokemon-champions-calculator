import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {localAPI} from './scripts/local-api-plugin.mjs';
export default defineConfig(({command})=>({plugins:[react(),...(command==='serve'?[localAPI()]:[])],server:{watch:{ignored:['**/verification/**','**/.sites-runtime/**']}},build:{outDir:'dist/client',chunkSizeWarningLimit:1800}}));
