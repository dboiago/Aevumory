import { defineConfig, type Plugin } from 'vite';

function calendarRoutePlugin(): Plugin {
  return {
    name: 'aevumory-calendar-route',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/main.ts')) return null;
      return {
        code: `import './calendar-route';\n${code}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [calendarRoutePlugin()],
});
