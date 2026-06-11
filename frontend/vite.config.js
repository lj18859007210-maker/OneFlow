import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const backendTarget = "http://10.45.104.71:8877";
const publicBase = `${process.env.VITE_PUBLIC_BASE || "/oneflow/"}`.replace(/\/?$/, "/");
const proxy = {
  "/api": {
    target: backendTarget,
    changeOrigin: true,
  },
  "/uploads": {
    target: backendTarget,
    changeOrigin: true,
  },
};

export default defineConfig({
  base: publicBase,
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5174,
    host: "0.0.0.0",
    proxy,
  },
  preview: {
    port: 5174,
    host: "0.0.0.0",
    proxy,
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
