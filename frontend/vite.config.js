import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://10.45.104.71:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue", "vue-router"],
          echarts: ["echarts"],
          axios: ["axios"],
        },
      },
    },
    // 压缩
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 启用 sourcemap（生产环境关闭）
    sourcemap: false,
  },
});
